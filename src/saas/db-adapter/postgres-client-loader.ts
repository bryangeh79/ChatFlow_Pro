/**
 * Phase 24 / 2J+ — dynamic `pg` load behind `CHATFLOW_SAAS_POSTGRES_CLIENT=1`.
 * When `CHATFLOW_SAAS_DB_DRIVER=postgres`, also probes shared Pool + `SELECT 1` for `runtime_wired`.
 */

import { isPostgresClientEnabled } from './postgres-gate';
import { POSTGRES_METADATA_QUERY_NOT_WIRED } from './postgres-metadata-constants';
import {
  getLastPostgresPoolFailureDetail,
  getSharedSaaSPostgresPool,
  postgresRuntimeWiredMessageNote,
} from './postgres-pool';

/** `loadPostgresClientModule` called while gate is off. */
export const POSTGRES_CLIENT_LOAD_SKIPPED_GATE_OFF = 'POSTGRES_CLIENT_LOAD_SKIPPED_GATE_OFF';

/** Gate on but `import('pg')` failed (missing install, broken native build, etc.). */
export const POSTGRES_CLIENT_MODULE_NOT_AVAILABLE = 'POSTGRES_CLIENT_MODULE_NOT_AVAILABLE';

/** Module may load; pool + `SELECT 1` probe not yet successful. */
export const POSTGRES_CLIENT_RUNTIME_NOT_WIRED = 'POSTGRES_CLIENT_RUNTIME_NOT_WIRED';

export type PostgresClientModule = typeof import('pg');

/**
 * When gate is off: returns `false` without touching `pg`.
 * When gate is on: attempts dynamic import once per call (no cross-env cache).
 */
export async function isPostgresClientModuleAvailable(): Promise<boolean> {
  if (!isPostgresClientEnabled()) return false;
  try {
    await import('pg');
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves the `pg` package only if `CHATFLOW_SAAS_POSTGRES_CLIENT=1`.
 * @throws Error with `message === POSTGRES_CLIENT_LOAD_SKIPPED_GATE_OFF` if gate off
 * @throws Error with `message === POSTGRES_CLIENT_MODULE_NOT_AVAILABLE` if import fails
 */
export async function loadPostgresClientModule(): Promise<PostgresClientModule> {
  if (!isPostgresClientEnabled()) {
    throw new Error(POSTGRES_CLIENT_LOAD_SKIPPED_GATE_OFF);
  }
  try {
    return (await import('pg')) as PostgresClientModule;
  } catch (e) {
    const err = new Error(POSTGRES_CLIENT_MODULE_NOT_AVAILABLE);
    (err as Error & { cause?: unknown }).cause = e;
    throw err;
  }
}

export interface PostgresClientRuntimeSummary {
  module_available: boolean;
  gate_enabled: boolean;
  /** `true` only when driver=postgres, gate on, config valid, shared Pool + parameterized `SELECT 1` succeeded. */
  runtime_wired: boolean;
  message: string;
}

function readDbDriverForLoader(): 'sqljs' | 'postgres' {
  const raw = process.env.CHATFLOW_SAAS_DB_DRIVER;
  const t = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (t === '' || t === 'postgres') return 'postgres';
  if (t === 'sqljs') return 'sqljs';
  throw new Error(`invalid_chatflow_saas_db_driver:${t}`);
}

/**
 * Gate off: no `pg` import.
 * Gate on: probes `import('pg')`; when driver=postgres, attempts shared Pool + `SELECT 1` for `runtime_wired`.
 */
export async function getPostgresClientRuntimeSummary(): Promise<PostgresClientRuntimeSummary> {
  const gate_enabled = isPostgresClientEnabled();
  if (!gate_enabled) {
    return {
      module_available: false,
      gate_enabled: false,
      runtime_wired: false,
      message: `${POSTGRES_CLIENT_RUNTIME_NOT_WIRED}: gate off — \`pg\` not loaded (by design).`,
    };
  }

  let module_available = false;
  try {
    await import('pg');
    module_available = true;
  } catch {
    module_available = false;
  }

  if (!module_available) {
    return {
      module_available: false,
      gate_enabled: true,
      runtime_wired: false,
      message: `${POSTGRES_CLIENT_MODULE_NOT_AVAILABLE}: gate on but \`pg\` failed to load — check install / native bindings; no DB connection attempted.`,
    };
  }

  const driver = readDbDriverForLoader();
  if (driver === 'sqljs') {
    return {
      module_available: true,
      gate_enabled: true,
      runtime_wired: false,
      message: `${POSTGRES_CLIENT_RUNTIME_NOT_WIRED}: gate on, driver=sqljs (compat mode) — default live chain remains postgres. ${POSTGRES_METADATA_QUERY_NOT_WIRED}: no postgres pool.`,
    };
  }

  const pool = await getSharedSaaSPostgresPool();
  if (pool) {
    return {
      module_available: true,
      gate_enabled: true,
      runtime_wired: true,
      message: postgresRuntimeWiredMessageNote(),
    };
  }

  const detail = getLastPostgresPoolFailureDetail() || 'pool init or SELECT 1 failed (detail unavailable).';
  return {
    module_available: true,
    gate_enabled: true,
    runtime_wired: false,
    message: `${POSTGRES_CLIENT_RUNTIME_NOT_WIRED}: ${detail}`,
  };
}
