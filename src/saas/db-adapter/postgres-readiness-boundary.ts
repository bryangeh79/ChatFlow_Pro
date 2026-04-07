/**
 * Phase 24 / 2M — Go / no-go boundary for entering real Postgres runtime (contract only; current default NO_GO).
 */

import { getPostgresExecutionReadiness, type PostgresExecutionReadiness } from './postgres-metadata';
import type { PostgresProbeStatus } from './postgres-probe';
import type { SaaSDbDriver } from './types';

export type PostgresGoNoGoOverall = 'go' | 'no_go';

/** Stable machine-facing blocker codes (verify / automation). */
export const POSTGRES_GO_NO_GO_REASON_SQL_ASSETS = 'postgres_sql_assets_missing';
export const POSTGRES_GO_NO_GO_REASON_DRIVER = 'postgres_driver_not_postgres';
export const POSTGRES_GO_NO_GO_REASON_CLIENT_GATE = 'postgres_client_gate_off';
export const POSTGRES_GO_NO_GO_REASON_MODULE = 'postgres_pg_module_unavailable';
export const POSTGRES_GO_NO_GO_REASON_CONFIG = 'postgres_connection_config_invalid';
export const POSTGRES_GO_NO_GO_REASON_RUNTIME = 'postgres_client_runtime_not_wired';
export const POSTGRES_GO_NO_GO_REASON_EXECUTION = 'postgres_migration_execution_not_wired';
export const POSTGRES_GO_NO_GO_REASON_LEDGER = 'postgres_ledger_persistence_not_wired';
export const POSTGRES_GO_NO_GO_REASON_ADAPTER_STUB = 'postgres_adapter_still_stub';
export const POSTGRES_GO_NO_GO_REASON_PROBE_FAILED = 'postgres_tcp_probe_connect_failed';

export interface PostgresReadinessCheckRow {
  id: string;
  /** If true, failure contributes to `blocking_reasons` and prevents GO. */
  required_for_go: boolean;
  ok: boolean;
  label: string;
}

export interface PostgresGoNoGoSummary {
  driver: SaaSDbDriver;
  postgres_client_gate_enabled: boolean;
  postgres_probe_enabled: boolean;
  postgres_probe_status: PostgresProbeStatus;
  postgres_probe_attempted: boolean;
  connection_config_valid: boolean;
}

export interface PostgresGoNoGoResult {
  overall_status: PostgresGoNoGoOverall;
  blocking_reasons: string[];
  checks: PostgresReadinessCheckRow[];
  summary: PostgresGoNoGoSummary;
  /** Actionable backlog lines; no secrets. */
  next_required_capabilities: string[];
  /** Phase / package note for operators. */
  note: string;
}

function buildChecks(r: PostgresExecutionReadiness): PostgresReadinessCheckRow[] {
  return [
    {
      id: 'sql_assets_present',
      required_for_go: true,
      ok: r.sql_assets_present,
      label: 'Migration SQL assets registered with valid checksums',
    },
    {
      id: 'driver_postgres',
      required_for_go: true,
      ok: r.driver === 'postgres',
      label: 'CHATFLOW_SAAS_DB_DRIVER=postgres (hosted backend selected)',
    },
    {
      id: 'client_gate_on',
      required_for_go: true,
      ok: r.postgres_client_gate_enabled,
      label: 'CHATFLOW_SAAS_POSTGRES_CLIENT=1 (dynamic pg load allowed)',
    },
    {
      id: 'pg_module_available',
      required_for_go: true,
      ok: r.postgres_client_module_available,
      label: '`pg` package loads when client gate is on',
    },
    {
      id: 'connection_config_valid',
      required_for_go: true,
      ok: r.connection_config_valid,
      label: 'Postgres connection env / URL parses and validates',
    },
    {
      id: 'runtime_wired',
      required_for_go: true,
      ok: r.postgres_client_runtime_wired,
      label: 'Postgres client pool/query path wired (PostgresSaaSDbAdapter operational)',
    },
    {
      id: 'execution_wired',
      required_for_go: true,
      ok: r.execution_wired,
      label: 'Migration runner apply path wired (runSaasPostgresMigrations apply)',
    },
    {
      id: 'ledger_persistence_wired',
      required_for_go: true,
      ok: r.ledger_persistence_wired,
      label: 'DB-backed migration ledger persistence wired',
    },
    {
      id: 'adapter_not_stub',
      required_for_go: true,
      ok: !r.adapter_stub,
      label: 'SaaS DB adapter is not a throw-only stub for principals path',
    },
    {
      id: 'tcp_probe_ok_or_skipped',
      required_for_go: false,
      ok:
        !r.postgres_probe_attempted ||
        r.postgres_probe_status === 'probe_connect_ok' ||
        r.postgres_probe_status.startsWith('skipped_'),
      label: 'Optional TCP probe: connect OK, skipped, or not attempted (never sufficient alone for GO)',
    },
  ];
}

function reasonForCheck(row: PostgresReadinessCheckRow): string | null {
  if (row.ok) return null;
  switch (row.id) {
    case 'sql_assets_present':
      return POSTGRES_GO_NO_GO_REASON_SQL_ASSETS;
    case 'driver_postgres':
      return POSTGRES_GO_NO_GO_REASON_DRIVER;
    case 'client_gate_on':
      return POSTGRES_GO_NO_GO_REASON_CLIENT_GATE;
    case 'pg_module_available':
      return POSTGRES_GO_NO_GO_REASON_MODULE;
    case 'connection_config_valid':
      return POSTGRES_GO_NO_GO_REASON_CONFIG;
    case 'runtime_wired':
      return POSTGRES_GO_NO_GO_REASON_RUNTIME;
    case 'execution_wired':
      return POSTGRES_GO_NO_GO_REASON_EXECUTION;
    case 'ledger_persistence_wired':
      return POSTGRES_GO_NO_GO_REASON_LEDGER;
    case 'adapter_not_stub':
      return POSTGRES_GO_NO_GO_REASON_ADAPTER_STUB;
    case 'tcp_probe_ok_or_skipped':
      return POSTGRES_GO_NO_GO_REASON_PROBE_FAILED;
    default:
      return `postgres_check_failed:${row.id}`;
  }
}

function nextCapabilities(r: PostgresExecutionReadiness, checks: PostgresReadinessCheckRow[]): string[] {
  const out: string[] = [];
  const failed = new Set(checks.filter((c) => c.required_for_go && !c.ok).map((c) => c.id));
  if (failed.has('driver_postgres')) {
    out.push('Switch SaaS DB driver to postgres when moving off sql.js file backend.');
  }
  if (failed.has('client_gate_on')) {
    out.push('Set CHATFLOW_SAAS_POSTGRES_CLIENT=1 only after ops approves dynamic pg in this process.');
  }
  if (failed.has('pg_module_available')) {
    out.push('Ensure `pg` is installed and loadable (native build) where this process runs.');
  }
  if (failed.has('connection_config_valid')) {
    out.push('Provide CHATFLOW_SAAS_POSTGRES_URL or split HOST/DB/USER (+ PASSWORD, SSL, PORT).');
  }
  if (failed.has('sql_assets_present')) {
    out.push('Fix db-migrations registry / SQL assets so checksums load at startup.');
  }
  if (failed.has('runtime_wired')) {
    out.push('Implement connection pool + wire PostgresSaaSDbAdapter (queryOne/queryAll/execute/transaction).');
  }
  if (failed.has('execution_wired')) {
    out.push('Wire runSaasPostgresMigrations apply mode to real SQL execution (still separate from business queries).');
  }
  if (failed.has('ledger_persistence_wired')) {
    out.push('Persist migration ledger to Postgres (saas_schema_migrations or equivalent).');
  }
  if (failed.has('adapter_not_stub')) {
    out.push('Replace stub adapter behavior with real implementations for production paths.');
  }
  if (!r.postgres_probe_attempted || r.postgres_probe_status === 'probe_connect_failed') {
    out.push(
      'Optional: set CHATFLOW_SAAS_POSTGRES_PROBE=1 with strict gates to validate TCP reachability (does not grant GO).',
    );
  }
  return out;
}

/**
 * Evaluates whether the codebase/process may treat **Postgres runtime** as production-ready.
 * **2M default: always `no_go`** until execution, ledger, runtime, and adapter checks pass.
 * **`probe_connect_ok` alone never yields GO.**
 */
export async function evaluatePostgresGoNoGo(): Promise<PostgresGoNoGoResult> {
  const r = await getPostgresExecutionReadiness();
  const checks = buildChecks(r);
  const blocking_reasons: string[] = [];
  for (const row of checks) {
    if (!row.required_for_go || row.ok) continue;
    const code = reasonForCheck(row);
    if (code) blocking_reasons.push(code);
  }
  if (r.postgres_probe_attempted && r.postgres_probe_status === 'probe_connect_failed') {
    blocking_reasons.push(POSTGRES_GO_NO_GO_REASON_PROBE_FAILED);
  }

  const overall_status: PostgresGoNoGoOverall = blocking_reasons.length === 0 ? 'go' : 'no_go';
  const summary: PostgresGoNoGoSummary = {
    driver: r.driver,
    postgres_client_gate_enabled: r.postgres_client_gate_enabled,
    postgres_probe_enabled: r.postgres_probe_enabled,
    postgres_probe_status: r.postgres_probe_status,
    postgres_probe_attempted: r.postgres_probe_attempted,
    connection_config_valid: r.connection_config_valid,
  };

  return {
    overall_status,
    blocking_reasons,
    checks,
    summary,
    next_required_capabilities: nextCapabilities(r, checks),
    note:
      'Phase 24 / 2M: go/no-go is a team gate for real Postgres runtime — not a substitute for staging tests, backups, or cutover runbooks.',
  };
}
