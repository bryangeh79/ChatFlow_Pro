/**
 * Phase D-C3A — read-only dedupe consistency / gap view (G1/G2/G3 heuristic).
 * NO writes, NO compensation, NO repair. Postgres dedupe tables only.
 */

import { observabilityFingerprint } from '../observability/structured-log';
import { getSaaSDbDriver, getSaasDbAdapter } from './db-adapter';
import type { SaaSDbDriver } from './db-adapter/types';

export type DedupeConsistencyLane = 'inbound' | 'outbound' | 'notify';

export type DedupeConsistencyGapKind =
  | 'g1_notify_processing_stale'
  | 'g2_outbound_processing_stale'
  | 'g3_inbound_processing_stale';

export interface DedupeConsistencyRow {
  tenant_id: string;
  lane: DedupeConsistencyLane;
  channel: string;
  event_type: string;
  idempotency_key_fp: string;
  current_status: string;
  current_version: number | null;
  evidence_http_or_provider: string;
  first_seen_at: string;
  last_seen_at: string;
  recommended_action: string;
  gap_kind: DedupeConsistencyGapKind;
}

export interface ListDedupeConsistencyGapsInput {
  /** Age in whole minutes; rows with last_seen_at older than (now - staleMinutes) qualify. */
  staleMinutes: number;
  tenantId?: string | null;
  lane?: DedupeConsistencyLane | null;
  /** Exact idempotency key (not fingerprint); optional narrow filter for staging ops. */
  idempotencyKey?: string | null;
  maxRows: number;
}

export interface DedupeConsistencyReport {
  ok: true;
  write_policy: 'readonly';
  driver: SaaSDbDriver;
  postgres_only: boolean;
  stale_minutes: number;
  cutoff_iso: string;
  filters: {
    tenant_id: string | null;
    lane: DedupeConsistencyLane | null;
    idempotency_key: string | null;
    max_rows: number;
  };
  row_count: number;
  rows: DedupeConsistencyRow[];
  note?: string;
}

function cutoffIso(staleMinutes: number): string {
  const m = Math.max(1, Math.floor(staleMinutes));
  return new Date(Date.now() - m * 60_000).toISOString();
}

/** node-pg returns TIMESTAMPTZ as Date; normalize for stable JSON. */
function rowTs(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'string') return v;
  return String(v ?? '');
}

function notifyEvidence(): string {
  return 'notify_http_not_persisted_correlate_logs_http_ok_and_notify_dedupe_cas_conflict';
}

function recommendedFor(kind: DedupeConsistencyGapKind): string {
  if (kind === 'g1_notify_processing_stale') {
    return 'NO_AUTO_RESEND: correlate structured logs (notify http_ok vs notify_dedupe_cas_conflict) for idempotency_key_fp; D-C3B manual close if downstream confirmed';
  }
  if (kind === 'g2_outbound_processing_stale') {
    return 'NO_AUTO_RESEND: correlate outbound_milestone / outbound_dedupe_cas_conflict and provider; D-C3B manual close if send confirmed';
  }
  return 'NO_AUTO_COMPLETE: correlate inbound pipeline completion vs inbound_dedupe_decision; D-C3B only with evidence';
}

export function parseDedupeConsistencyStaleMinutesFromEnv(): number {
  const raw = process.env.CHATFLOW_DEDUPE_CONSISTENCY_STALE_MINUTES?.trim();
  if (!raw) return 15;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 15;
  return Math.min(Math.floor(n), 10_080); /* max 1 week minutes */
}

export async function listDedupeConsistencyGaps(input: ListDedupeConsistencyGapsInput): Promise<DedupeConsistencyReport> {
  const driver = getSaaSDbDriver();
  const staleMinutes = Math.max(1, Math.floor(input.staleMinutes));
  const cutoff = cutoffIso(staleMinutes);
  const tenantId = input.tenantId?.trim() ? input.tenantId.trim() : null;
  const lane = input.lane ?? null;
  const idempotencyKey = input.idempotencyKey?.trim() ? input.idempotencyKey.trim() : null;
  const maxRows = Number.isFinite(input.maxRows) && input.maxRows > 0 ? Math.min(Math.floor(input.maxRows), 10_000) : 500;

  const baseFilters = {
    tenant_id: tenantId,
    lane,
    idempotency_key: idempotencyKey,
    max_rows: maxRows,
  };

  if (driver !== 'postgres') {
    return {
      ok: true,
      write_policy: 'readonly',
      driver,
      postgres_only: true,
      stale_minutes: staleMinutes,
      cutoff_iso: cutoff,
      filters: baseFilters,
      row_count: 0,
      rows: [],
      note: 'dedupe_consistency_recon_postgres_only_empty_result',
    };
  }

  const adapter = await getSaasDbAdapter();
  const lanesToQuery: DedupeConsistencyLane[] = lane
    ? [lane]
    : ['inbound', 'outbound', 'notify'];

  const perLaneLimit = Math.max(1, Math.ceil(maxRows / lanesToQuery.length));
  const collected: DedupeConsistencyRow[] = [];

  const pushInbound = async () => {
    const params: unknown[] = [cutoff];
    let sql = `SELECT tenant_id, channel, idempotency_key, provider_message_id, status,
         first_seen_at, last_seen_at
         FROM tenant_inbound_dedupe
         WHERE status = 'processing' AND last_seen_at < ?`;
    if (tenantId) {
      sql += ' AND tenant_id = ?';
      params.push(tenantId);
    }
    if (idempotencyKey) {
      sql += ' AND idempotency_key = ?';
      params.push(idempotencyKey);
    }
    sql += ' ORDER BY last_seen_at ASC LIMIT ?';
    params.push(perLaneLimit);
    const raw = await adapter.queryAll(sql, params);
    for (const r of raw) {
      const idem = String(r.idempotency_key ?? '');
      const pmid = r.provider_message_id != null && String(r.provider_message_id).trim() !== ''
        ? `provider_message_id:${String(r.provider_message_id)}`
        : 'no_provider_message_id_correlate_pipeline_logs';
      collected.push({
        tenant_id: String(r.tenant_id ?? ''),
        lane: 'inbound',
        channel: String(r.channel ?? ''),
        event_type: '',
        idempotency_key_fp: observabilityFingerprint(idem),
        current_status: String(r.status ?? 'processing'),
        current_version: null,
        evidence_http_or_provider: pmid,
        first_seen_at: rowTs(r.first_seen_at),
        last_seen_at: rowTs(r.last_seen_at),
        recommended_action: recommendedFor('g3_inbound_processing_stale'),
        gap_kind: 'g3_inbound_processing_stale',
      });
    }
  };

  const pushOutbound = async () => {
    const params: unknown[] = [cutoff];
    let sql = `SELECT tenant_id, channel, idempotency_key, message_trace_id, status, version,
         first_seen_at, last_seen_at
         FROM tenant_outbound_dedupe
         WHERE status = 'processing' AND last_seen_at < ?`;
    if (tenantId) {
      sql += ' AND tenant_id = ?';
      params.push(tenantId);
    }
    if (idempotencyKey) {
      sql += ' AND idempotency_key = ?';
      params.push(idempotencyKey);
    }
    sql += ' ORDER BY last_seen_at ASC LIMIT ?';
    params.push(perLaneLimit);
    const raw = await adapter.queryAll(sql, params);
    for (const r of raw) {
      const idem = String(r.idempotency_key ?? '');
      const mt = r.message_trace_id != null && String(r.message_trace_id).trim() !== ''
        ? `message_trace_id:${String(r.message_trace_id)}`
        : 'no_message_trace_id_correlate_outbound_logs';
      collected.push({
        tenant_id: String(r.tenant_id ?? ''),
        lane: 'outbound',
        channel: String(r.channel ?? ''),
        event_type: '',
        idempotency_key_fp: observabilityFingerprint(idem),
        current_status: String(r.status ?? 'processing'),
        current_version: r.version != null ? Number(r.version) : null,
        evidence_http_or_provider: mt,
        first_seen_at: rowTs(r.first_seen_at),
        last_seen_at: rowTs(r.last_seen_at),
        recommended_action: recommendedFor('g2_outbound_processing_stale'),
        gap_kind: 'g2_outbound_processing_stale',
      });
    }
  };

  const pushNotify = async () => {
    const params: unknown[] = [cutoff];
    let sql = `SELECT tenant_id, event_type, idempotency_key, status, version,
         first_seen_at, last_seen_at
         FROM tenant_notify_dedupe
         WHERE status = 'processing' AND last_seen_at < ?`;
    if (tenantId) {
      sql += ' AND tenant_id = ?';
      params.push(tenantId);
    }
    if (idempotencyKey) {
      sql += ' AND idempotency_key = ?';
      params.push(idempotencyKey);
    }
    sql += ' ORDER BY last_seen_at ASC LIMIT ?';
    params.push(perLaneLimit);
    const raw = await adapter.queryAll(sql, params);
    for (const r of raw) {
      const idem = String(r.idempotency_key ?? '');
      collected.push({
        tenant_id: String(r.tenant_id ?? ''),
        lane: 'notify',
        channel: '',
        event_type: String(r.event_type ?? ''),
        idempotency_key_fp: observabilityFingerprint(idem),
        current_status: String(r.status ?? 'processing'),
        current_version: r.version != null ? Number(r.version) : null,
        evidence_http_or_provider: notifyEvidence(),
        first_seen_at: rowTs(r.first_seen_at),
        last_seen_at: rowTs(r.last_seen_at),
        recommended_action: recommendedFor('g1_notify_processing_stale'),
        gap_kind: 'g1_notify_processing_stale',
      });
    }
  };

  for (const L of lanesToQuery) {
    if (L === 'inbound') await pushInbound();
    else if (L === 'outbound') await pushOutbound();
    else await pushNotify();
  }

  collected.sort((a, b) => a.last_seen_at.localeCompare(b.last_seen_at));
  const rows = collected.slice(0, maxRows);

  return {
    ok: true,
    write_policy: 'readonly',
    driver: 'postgres',
    postgres_only: false,
    stale_minutes: staleMinutes,
    cutoff_iso: cutoff,
    filters: baseFilters,
    row_count: rows.length,
    rows,
  };
}
