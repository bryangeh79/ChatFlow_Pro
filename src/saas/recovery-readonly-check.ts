/**
 * Phase D-C4A — post-restore / rollback read-only recovery check pack.
 * NO writes, NO repair, NO compensation. Postgres-only full sequence; sqljs returns postgres_only skip.
 */

import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { listDedupeConsistencyGaps, parseDedupeConsistencyStaleMinutesFromEnv } from './dedupe-consistency-readonly';
import { getSaaSDbDriver, getSaasDbAdapter } from './db-adapter';
import type { DbRow, SaaSDbAdapter } from './db-adapter/types';
import type { SaaSDbDriver } from './db-adapter/types';
import { listSaasDbMigrations, SAAS_SCHEMA_MIGRATIONS_TABLE } from './db-migrations/registry';

export type RecoveryOverallTier = 'observe' | 'manual_d_c3b_only' | 'freeze_no_go';

export interface RecoveryReadonlyCheckInput {
  staleMinutes?: number;
  maxDedupeRows?: number;
  tenantId?: string | null;
  /** Default true — list common JSONL paths under cwd (stat only). */
  includeJsonl?: boolean;
}

export interface RecoveryStepResult {
  id: string;
  order: number;
  ok: boolean;
  tier_hint: RecoveryOverallTier | 'neutral';
  detail: Record<string, unknown>;
}

export interface RecoveryReadonlyCheckReport {
  ok: true;
  write_policy: 'readonly';
  phase: 'd-c4a';
  driver: SaaSDbDriver;
  postgres_only: boolean;
  overall_tier: RecoveryOverallTier;
  overall_message: string;
  steps: RecoveryStepResult[];
  note?: string;
}

const JSONL_RELATIVE_PATHS = [
  'data/local-captured-leads.jsonl',
  'data/handoff-assignments.jsonl',
  'data/platform-audit-events.jsonl',
] as const;

const STATE_TABLES = ['tenant_session_state', 'tenant_processing_state', 'tenant_delivery_state'] as const;

const AUDIT_TABLES = ['dedupe_manual_repair_audit_events', 'break_glass_audit_events'] as const;

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

async function stepLedgerMigration(adapter: SaaSDbAdapter): Promise<RecoveryStepResult> {
  const defs = listSaasDbMigrations().filter((d) => d.target_driver === 'postgres');
  let applied: DbRow[];
  try {
    applied = await adapter.queryAll(
      `SELECT migration_id, checksum_sha256 FROM ${SAAS_SCHEMA_MIGRATIONS_TABLE} ORDER BY migration_id`,
      [],
    );
  } catch (e) {
    return {
      id: 'ledger_migration',
      order: 1,
      ok: false,
      tier_hint: 'freeze_no_go',
      detail: {
        code: 'ledger_unreadable',
        error: errMsg(e),
        hint: 'saas_schema_migrations missing or unreadable — do not open traffic until DDL/migrations resolved',
      },
    };
  }
  const byId = new Map(
    applied.map((r) => [String(r.migration_id ?? ''), String(r.checksum_sha256 ?? '')]),
  );
  const missing: string[] = [];
  const checksum_mismatches: { migration_id: string; expected: string; actual: string }[] = [];
  for (const d of defs) {
    const act = byId.get(d.id);
    if (!act) missing.push(d.id);
    else if (act !== d.checksum_sha256) {
      checksum_mismatches.push({ migration_id: d.id, expected: d.checksum_sha256, actual: act });
    }
  }
  const ok = missing.length === 0 && checksum_mismatches.length === 0;
  return {
    id: 'ledger_migration',
    order: 1,
    ok,
    tier_hint: ok ? 'neutral' : 'freeze_no_go',
    detail: {
      expected_migration_count: defs.length,
      ledger_row_count: applied.length,
      missing_migrations: missing,
      checksum_mismatches,
    },
  };
}

async function stepPgCoreTenants(adapter: SaaSDbAdapter): Promise<RecoveryStepResult> {
  try {
    const row = await adapter.queryOne('SELECT COUNT(*)::bigint AS c FROM tenants', []);
    const c = Number(row?.c ?? 0);
    return {
      id: 'pg_core_tenants',
      order: 2,
      ok: true,
      tier_hint: 'neutral',
      detail: { tenant_row_count: c },
    };
  } catch (e) {
    return {
      id: 'pg_core_tenants',
      order: 2,
      ok: false,
      tier_hint: 'freeze_no_go',
      detail: { code: 'tenants_unreadable', error: errMsg(e) },
    };
  }
}

async function stepDedupeConsistency(input: {
  staleMinutes: number;
  maxDedupeRows: number;
  tenantId: string | null;
}): Promise<{ step: RecoveryStepResult; stale_row_count: number }> {
  try {
    const rep = await listDedupeConsistencyGaps({
      staleMinutes: input.staleMinutes,
      maxRows: input.maxDedupeRows,
      tenantId: input.tenantId,
      lane: null,
      idempotencyKey: null,
    });
    const stale = rep.row_count;
    return {
      stale_row_count: stale,
      step: {
        id: 'dedupe_consistency',
        order: 3,
        ok: true,
        tier_hint: stale > 0 ? 'manual_d_c3b_only' : 'neutral',
        detail: {
          d_c3a_write_policy: rep.write_policy,
          stale_row_count: stale,
          cutoff_iso: rep.cutoff_iso,
          stale_minutes: rep.stale_minutes,
        },
      },
    };
  } catch (e) {
    return {
      stale_row_count: 0,
      step: {
        id: 'dedupe_consistency',
        order: 3,
        ok: false,
        tier_hint: 'freeze_no_go',
        detail: {
          code: 'dedupe_consistency_query_failed',
          error: errMsg(e),
          hint: 'dedupe tables may be missing after partial restore — freeze until verified',
        },
      },
    };
  }
}

async function stepPgStateCounts(adapter: SaaSDbAdapter): Promise<RecoveryStepResult> {
  const counts: Record<string, number | string> = {};
  let anyMissing = false;
  for (const t of STATE_TABLES) {
    try {
      const r = await adapter.queryOne(`SELECT COUNT(*)::bigint AS c FROM ${t}`, []);
      counts[t] = Number(r?.c ?? 0);
    } catch {
      counts[t] = 'table_missing';
      anyMissing = true;
    }
  }
  return {
    id: 'pg_state_counts',
    order: 4,
    ok: !anyMissing,
    tier_hint: anyMissing ? 'freeze_no_go' : 'neutral',
    detail: {
      counts,
      hint: anyMissing
        ? 'D-B2 state table missing — possible partial restore; do not assume MI-safe'
        : null,
    },
  };
}

async function stepPgAuditCounts(adapter: SaaSDbAdapter): Promise<RecoveryStepResult> {
  const counts: Record<string, number | string> = {};
  for (const t of AUDIT_TABLES) {
    try {
      const r = await adapter.queryOne(`SELECT COUNT(*)::bigint AS c FROM ${t}`, []);
      counts[t] = Number(r?.c ?? 0);
    } catch {
      counts[t] = 'table_missing';
    }
  }
  return {
    id: 'pg_audit_counts',
    order: 5,
    ok: true,
    tier_hint: 'neutral',
    detail: {
      counts,
      note: 'missing audit tables are informational for older backups; not alone a freeze signal',
    },
  };
}

function stepJsonlPresence(include: boolean): RecoveryStepResult {
  if (!include) {
    return {
      id: 'jsonl_presence',
      order: 6,
      ok: true,
      tier_hint: 'neutral',
      detail: { skipped: true },
    };
  }
  const cwd = process.cwd();
  const files: Record<string, { exists: boolean; size?: number; mtime_iso?: string }> = {};
  for (const rel of JSONL_RELATIVE_PATHS) {
    const abs = join(cwd, rel);
    if (!existsSync(abs)) {
      files[rel] = { exists: false };
      continue;
    }
    const st = statSync(abs);
    files[rel] = { exists: true, size: st.size, mtime_iso: st.mtime.toISOString() };
  }
  return {
    id: 'jsonl_presence',
    order: 6,
    ok: true,
    tier_hint: 'neutral',
    detail: {
      cwd,
      files,
      note: 'compare mtime vs PG restore point off-box; mismatch does not auto-change tier',
    },
  };
}

function computeOverallTier(steps: RecoveryStepResult[], dedupeStale: number): RecoveryOverallTier {
  for (const s of steps) {
    if (!s.ok || s.tier_hint === 'freeze_no_go') return 'freeze_no_go';
  }
  if (dedupeStale > 0) return 'manual_d_c3b_only';
  return 'observe';
}

function overallMessage(tier: RecoveryOverallTier): string {
  if (tier === 'freeze_no_go') return 'freeze_no_go: do_not_open_traffic_until_steps_resolved';
  if (tier === 'manual_d_c3b_only') return 'manual_d_c3b_only: stale_dedupe_candidates_use_d_c3a_d_c3b_with_evidence';
  return 'observe: no_automatic_blockers_in_readonly_pack_continue_correlation_off_box';
}

export function parseRecoveryReadonlyCheckStaleMinutes(input?: number): number {
  if (input != null && Number.isFinite(input) && input >= 1) {
    return Math.min(Math.floor(input), 10_080);
  }
  return parseDedupeConsistencyStaleMinutesFromEnv();
}

/**
 * Run ordered read-only checks per D-C4 design §3.2 (ledger → core → dedupe → state → audit → jsonl).
 */
export async function runRecoveryReadonlyCheck(
  input: RecoveryReadonlyCheckInput = {},
): Promise<RecoveryReadonlyCheckReport> {
  const driver = getSaaSDbDriver();
  const includeJsonl = input.includeJsonl !== false;
  const staleMinutes = parseRecoveryReadonlyCheckStaleMinutes(input.staleMinutes);
  const maxDedupeRows =
    input.maxDedupeRows != null && Number.isFinite(input.maxDedupeRows) && input.maxDedupeRows > 0
      ? Math.min(Math.floor(input.maxDedupeRows), 10_000)
      : 500;
  const tenantId = input.tenantId?.trim() ? input.tenantId.trim() : null;

  if (driver !== 'postgres') {
    return {
      ok: true,
      write_policy: 'readonly',
      phase: 'd-c4a',
      driver,
      postgres_only: true,
      overall_tier: 'observe',
      overall_message:
        'postgres_only_skip: full_recovery_sequence_requires_postgres_driver_sqljs_not_recovery_truth',
      steps: [],
      note: 'Re-run with CHATFLOW_SAAS_DB_DRIVER=postgres against the restored database.',
    };
  }

  const adapter = await getSaasDbAdapter();
  const steps: RecoveryStepResult[] = [];

  steps.push(await stepLedgerMigration(adapter));
  steps.push(await stepPgCoreTenants(adapter));

  const dedupe = await stepDedupeConsistency({ staleMinutes, maxDedupeRows, tenantId });
  steps.push(dedupe.step);

  steps.push(await stepPgStateCounts(adapter));
  steps.push(await stepPgAuditCounts(adapter));
  steps.push(stepJsonlPresence(includeJsonl));

  const staleCount = dedupe.stale_row_count;
  const tier = computeOverallTier(steps, staleCount);

  return {
    ok: true,
    write_policy: 'readonly',
    phase: 'd-c4a',
    driver: 'postgres',
    postgres_only: false,
    overall_tier: tier,
    overall_message: overallMessage(tier),
    steps,
  };
}
