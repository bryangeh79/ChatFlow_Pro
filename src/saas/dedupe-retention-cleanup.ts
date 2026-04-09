/**
 * Phase D-C2C1 — retention cleanup for D-B3 dedupe tables: delete cold `completed` rows only.
 * `processing` rows are never deleted; stale `processing` is counted for dry-run / alerting only.
 */

import { getSaasDbAdapter, getSaaSDbDriver } from './db-adapter';
import type { SaaSDbAdapter, SaaSDbDriver } from './db-adapter/types';

export type DedupeRetentionTableName = 'tenant_inbound_dedupe' | 'tenant_outbound_dedupe' | 'tenant_notify_dedupe';

export interface DedupeRetentionTableStats {
  completed_deletion_candidates: number;
  /** `processing` rows older than retention cutoff (same window as completed); informational only. */
  processing_stale_count: number;
  deleted: number;
}

export interface DedupeRetentionCleanupResult {
  ok: true;
  dry_run: boolean;
  retention_days: number;
  cutoff_iso: string;
  max_rows: number;
  tenant_id_filter: string | null;
  inbound: DedupeRetentionTableStats;
  outbound: DedupeRetentionTableStats;
  notify: DedupeRetentionTableStats;
}

function cutoffIso(retentionDays: number): string {
  const d = Math.max(1, Math.floor(retentionDays));
  return new Date(Date.now() - d * 86_400_000).toISOString();
}

async function countCompletedCandidates(
  adapter: SaaSDbAdapter,
  table: DedupeRetentionTableName,
  cutoff: string,
  tenantId: string | null,
): Promise<number> {
  const tc = tenantId ? 'AND tenant_id = ?' : '';
  const params: unknown[] = tenantId ? [cutoff, tenantId] : [cutoff];
  const row = await adapter.queryOne(
    `SELECT COUNT(*) AS c FROM ${table}
      WHERE status = 'completed'
        AND COALESCE(completed_at, last_seen_at) < ?
        ${tc}`,
    params,
  );
  return row ? Number(row.c) : 0;
}

async function countProcessingStale(
  adapter: SaaSDbAdapter,
  table: DedupeRetentionTableName,
  cutoff: string,
  tenantId: string | null,
): Promise<number> {
  const tc = tenantId ? 'AND tenant_id = ?' : '';
  const params: unknown[] = tenantId ? [cutoff, tenantId] : [cutoff];
  const row = await adapter.queryOne(
    `SELECT COUNT(*) AS c FROM ${table}
      WHERE status = 'processing'
        AND last_seen_at < ?
        ${tc}`,
    params,
  );
  return row ? Number(row.c) : 0;
}

async function deleteCompletedLimited(
  adapter: SaaSDbAdapter,
  driver: SaaSDbDriver,
  table: DedupeRetentionTableName,
  cutoff: string,
  tenantId: string | null,
  maxRows: number,
): Promise<void> {
  const lim = Number.isFinite(maxRows) && maxRows > 0 ? Math.floor(maxRows) : 10_000;

  if (driver === 'postgres') {
    if (tenantId) {
      await adapter.execute(
        `DELETE FROM ${table}
         WHERE ctid IN (
           SELECT ctid FROM ${table}
           WHERE status = 'completed'
             AND COALESCE(completed_at, last_seen_at) < ?
             AND tenant_id = ?
           LIMIT ?
         )`,
        [cutoff, tenantId, lim],
      );
    } else {
      await adapter.execute(
        `DELETE FROM ${table}
         WHERE ctid IN (
           SELECT ctid FROM ${table}
           WHERE status = 'completed'
             AND COALESCE(completed_at, last_seen_at) < ?
           LIMIT ?
         )`,
        [cutoff, lim],
      );
    }
    return;
  }

  if (tenantId) {
    await adapter.execute(
      `DELETE FROM ${table}
       WHERE rowid IN (
         SELECT rowid FROM ${table}
         WHERE status = 'completed'
           AND COALESCE(completed_at, last_seen_at) < ?
           AND tenant_id = ?
         LIMIT ?
       )`,
      [cutoff, tenantId, lim],
    );
  } else {
    await adapter.execute(
      `DELETE FROM ${table}
       WHERE rowid IN (
         SELECT rowid FROM ${table}
         WHERE status = 'completed'
           AND COALESCE(completed_at, last_seen_at) < ?
         LIMIT ?
       )`,
      [cutoff, lim],
    );
  }
}

async function processTable(
  adapter: SaaSDbAdapter,
  driver: SaaSDbDriver,
  table: DedupeRetentionTableName,
  input: { dryRun: boolean; maxRows: number; cutoff: string; tenantId: string | null },
): Promise<DedupeRetentionTableStats> {
  const completed = await countCompletedCandidates(adapter, table, input.cutoff, input.tenantId);
  const processingStale = await countProcessingStale(adapter, table, input.cutoff, input.tenantId);
  let deleted = 0;
  if (!input.dryRun && completed > 0) {
    await deleteCompletedLimited(adapter, driver, table, input.cutoff, input.tenantId, input.maxRows);
    const after = await countCompletedCandidates(adapter, table, input.cutoff, input.tenantId);
    deleted = completed - after;
  }
  return {
    completed_deletion_candidates: completed,
    processing_stale_count: processingStale,
    deleted,
  };
}

/**
 * @param maxRows — max rows to delete **per table** per invocation (apply only).
 */
export async function runDedupeRetentionCleanup(input: {
  dryRun: boolean;
  maxRows: number;
  retentionDays: number;
  tenantId?: string | null;
}): Promise<DedupeRetentionCleanupResult> {
  const adapter = await getSaasDbAdapter();
  const driver = getSaaSDbDriver();
  const cutoff = cutoffIso(input.retentionDays);
  const tenantId = input.tenantId?.trim() ? input.tenantId.trim() : null;

  const base = { dryRun: input.dryRun, maxRows: input.maxRows, cutoff, tenantId };
  const inbound = await processTable(adapter, driver, 'tenant_inbound_dedupe', base);
  const outbound = await processTable(adapter, driver, 'tenant_outbound_dedupe', base);
  const notify = await processTable(adapter, driver, 'tenant_notify_dedupe', base);

  await adapter.persistIfNeeded();

  return {
    ok: true,
    dry_run: input.dryRun,
    retention_days: input.retentionDays,
    cutoff_iso: cutoff,
    max_rows: input.maxRows,
    tenant_id_filter: tenantId,
    inbound,
    outbound,
    notify,
  };
}

export function parseDedupeRetentionDaysFromEnv(): number {
  const raw = process.env.CHATFLOW_DEDUPE_RETENTION_DAYS?.trim();
  if (!raw) return 30;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 30;
  return Math.min(Math.floor(n), 3650);
}
