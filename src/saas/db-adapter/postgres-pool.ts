/**
 * Phase 24 — Postgres execution: single shared `pg` Pool (opt-in only; default sql.js unchanged).
 */

import { loadPostgresConnectionConfig, resolvePostgresTcpCredentialsForProbe } from './postgres-config';
import { isPostgresClientEnabled } from './postgres-gate';
import { POSTGRES_METADATA_QUERY_NOT_WIRED } from './postgres-metadata-constants';
import type { Pool } from 'pg';
import type { SaaSDbDriver } from './types';

function readDbDriverForPool(): SaaSDbDriver {
  const raw = process.env.CHATFLOW_SAAS_DB_DRIVER;
  const t = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (t === '' || t === 'sqljs') return 'sqljs';
  if (t === 'postgres') return 'postgres';
  throw new Error(`invalid_chatflow_saas_db_driver:${t}`);
}

function redactPoolError(msg: string, password: string): string {
  let out = msg.slice(0, 500);
  if (password.length > 0) {
    out = out.split(password).join('REDACTED');
  }
  return out;
}

let cachedPool: Pool | null = null;
let connecting: Promise<Pool | null> | null = null;
let lastPoolFailureDetail: string | null = null;

export function getLastPostgresPoolFailureDetail(): string | null {
  return lastPoolFailureDetail;
}

async function connectSharedPoolOnce(): Promise<Pool | null> {
  lastPoolFailureDetail = null;

  if (readDbDriverForPool() !== 'postgres') {
    lastPoolFailureDetail = 'driver is not postgres — pool not created.';
    return null;
  }
  if (!isPostgresClientEnabled()) {
    lastPoolFailureDetail = 'CHATFLOW_SAAS_POSTGRES_CLIENT gate off — pool not created.';
    return null;
  }

  const cfg = loadPostgresConnectionConfig();
  if (!cfg.valid) {
    lastPoolFailureDetail = 'connection config invalid or missing — pool not created.';
    return null;
  }

  const creds = resolvePostgresTcpCredentialsForProbe();
  if (!creds) {
    lastPoolFailureDetail = 'TCP credentials unresolved — pool not created.';
    return null;
  }

  let pool: Pool | null = null;
  try {
    const pg = await import('pg');
    pool = new pg.Pool({
      host: creds.host,
      port: creds.port,
      user: creds.user,
      password: creds.password,
      database: creds.database,
      max: 10,
      connectionTimeoutMillis: 10_000,
      ssl: creds.ssl_enabled ? { rejectUnauthorized: false } : undefined,
    });
    const res = await pool.query('SELECT $1::int AS ok', [1]);
    const rowOk = res.rows?.[0] && Number((res.rows[0] as { ok?: unknown }).ok) === 1;
    if (!rowOk) {
      lastPoolFailureDetail = 'SELECT 1 probe returned unexpected row — pool discarded.';
      await pool.end();
      return null;
    }
    return pool;
  } catch (e) {
    if (pool) {
      try {
        await pool.end();
      } catch {
        /* ignore */
      }
    }
    const raw = e instanceof Error ? e.message : String(e);
    lastPoolFailureDetail = `pool or SELECT 1 failed — ${redactPoolError(raw, creds.password)}`;
    return null;
  }
}

/**
 * Single shared Pool when driver=postgres, client gate=1, config valid, and parameterized SELECT 1 succeeds.
 * Returns null without throwing when preconditions fail or probe fails.
 */
export async function getSharedSaaSPostgresPool(): Promise<Pool | null> {
  if (cachedPool) return cachedPool;
  if (connecting) return connecting;

  connecting = (async () => {
    const p = await connectSharedPoolOnce();
    if (p) cachedPool = p;
    return p;
  })();

  try {
    return await connecting;
  } finally {
    connecting = null;
  }
}

/** Message fragment for runtime_wired=true (must include metadata marker for verify). */
export function postgresRuntimeWiredMessageNote(): string {
  return `postgres_pool: shared Pool + parameterized SELECT 1 ok. ${POSTGRES_METADATA_QUERY_NOT_WIRED}: migration apply, ledger persistence, and production cutover remain unwired.`;
}
