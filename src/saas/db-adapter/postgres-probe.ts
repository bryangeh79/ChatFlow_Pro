/**
 * Phase 24 / 2L — optional TCP connect/end probe (no business SQL, no migration, not on default startup).
 */

import {
  loadPostgresConnectionConfig,
  resolvePostgresTcpCredentialsForProbe,
} from './postgres-config';
import { loadPostgresClientModule } from './postgres-client-loader';
import { isPostgresClientEnabled } from './postgres-gate';
import type { SaaSDbDriver } from './types';

const ENV_PROBE = 'CHATFLOW_SAAS_POSTGRES_PROBE';

function trim(s: string | undefined): string {
  return typeof s === 'string' ? s.trim() : '';
}

function readDbDriverForProbe(): SaaSDbDriver {
  const raw = process.env.CHATFLOW_SAAS_DB_DRIVER;
  const t = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (t === '' || t === 'sqljs') return 'sqljs';
  if (t === 'postgres') return 'postgres';
  throw new Error(`invalid_chatflow_saas_db_driver:${t}`);
}

/** `true` only when `CHATFLOW_SAAS_POSTGRES_PROBE=1`. */
export function isPostgresProbeEnabled(): boolean {
  const v = trim(process.env[ENV_PROBE]);
  if (v === '' || v === '0') return false;
  if (v === '1') return true;
  throw new Error(`invalid_chatflow_saas_postgres_probe:${v}`);
}

export interface PostgresProbeGateSummary {
  env_var: typeof ENV_PROBE;
  raw_value: string | null;
  enabled: boolean;
  message: string;
}

export function getPostgresProbeGateSummary(): PostgresProbeGateSummary {
  const raw = process.env[ENV_PROBE];
  const enabled = isPostgresProbeEnabled();
  return {
    env_var: ENV_PROBE,
    raw_value: typeof raw === 'string' && raw.length > 0 ? raw : null,
    enabled,
    message: enabled
      ? 'postgres_probe_gate: on — TCP connect/end allowed only when driver=postgres, client gate=1, config valid.'
      : 'postgres_probe_gate: off (unset/0) — no TCP probe.',
  };
}

export type PostgresProbeStatus =
  | 'skipped_gate_off'
  | 'skipped_invalid_config'
  | 'skipped_driver_not_postgres'
  | 'skipped_runtime_not_wired'
  | 'probe_connect_ok'
  | 'probe_connect_failed';

export interface PostgresProbeResult {
  attempted: boolean;
  success: boolean;
  status: PostgresProbeStatus;
  /** Never contains raw password or full DSN. */
  message: string;
  duration_ms?: number;
}

function redactErrorMessage(msg: string, password: string): string {
  let out = msg.slice(0, 500);
  if (password.length > 0) {
    out = out.split(password).join('REDACTED');
  }
  return out;
}

/**
 * Optional connect + immediate `end()`. No SELECT. Errors redacted.
 * Preconditions enforced in order: driver postgres → client gate → probe gate → valid config → `pg` load → TCP.
 */
export async function probePostgresConnection(): Promise<PostgresProbeResult> {
  if (!isPostgresProbeEnabled()) {
    return {
      attempted: false,
      success: false,
      status: 'skipped_gate_off',
      message: 'postgres_probe: skipped — CHATFLOW_SAAS_POSTGRES_PROBE not 1.',
    };
  }

  const driver = readDbDriverForProbe();
  if (driver !== 'postgres') {
    return {
      attempted: false,
      success: false,
      status: 'skipped_driver_not_postgres',
      message: 'postgres_probe: skipped — CHATFLOW_SAAS_DB_DRIVER is not postgres.',
    };
  }

  if (!isPostgresClientEnabled()) {
    return {
      attempted: false,
      success: false,
      status: 'skipped_gate_off',
      message: 'postgres_probe: skipped — CHATFLOW_SAAS_POSTGRES_CLIENT gate off.',
    };
  }

  const cfg = loadPostgresConnectionConfig();
  if (!cfg.valid) {
    return {
      attempted: false,
      success: false,
      status: 'skipped_invalid_config',
      message: 'postgres_probe: skipped — connection config invalid or missing.',
    };
  }

  const creds = resolvePostgresTcpCredentialsForProbe();
  if (!creds) {
    return {
      attempted: false,
      success: false,
      status: 'skipped_invalid_config',
      message: 'postgres_probe: skipped — could not resolve TCP credentials.',
    };
  }

  let pg: typeof import('pg');
  try {
    pg = await loadPostgresClientModule();
  } catch {
    return {
      attempted: false,
      success: false,
      status: 'skipped_runtime_not_wired',
      message: 'postgres_probe: skipped — `pg` module not available.',
    };
  }

  const t0 = Date.now();
  const client = new pg.Client({
    host: creds.host,
    port: creds.port,
    user: creds.user,
    password: creds.password,
    database: creds.database,
    ssl: creds.ssl_enabled ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    await client.end();
    const duration_ms = Date.now() - t0;
    return {
      attempted: true,
      success: true,
      status: 'probe_connect_ok',
      message: 'postgres_probe: connect + end OK (no query; not a full runtime readiness claim).',
      duration_ms,
    };
  } catch (e) {
    const duration_ms = Date.now() - t0;
    const raw = e instanceof Error ? e.message : String(e);
    const safe = redactErrorMessage(raw, creds.password);
    try {
      await client.end();
    } catch {
      /* ignore */
    }
    return {
      attempted: true,
      success: false,
      status: 'probe_connect_failed',
      message: `postgres_probe: connect failed — ${safe}`,
      duration_ms,
    };
  }
}

/** Alias for readiness wiring; same behavior as `probePostgresConnection`. */
export async function getPostgresProbeReadinessSummary(): Promise<PostgresProbeResult> {
  return probePostgresConnection();
}
