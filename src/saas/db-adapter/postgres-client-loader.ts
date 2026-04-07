/**
 * Phase 24 / 2J — dynamic `pg` load behind `CHATFLOW_SAAS_POSTGRES_CLIENT=1` only.
 * No pool, no connection string, no queries.
 */

import { isPostgresClientEnabled } from './postgres-gate';

/** `loadPostgresClientModule` called while gate is off. */
export const POSTGRES_CLIENT_LOAD_SKIPPED_GATE_OFF = 'POSTGRES_CLIENT_LOAD_SKIPPED_GATE_OFF';

/** Gate on but `import('pg')` failed (missing install, broken native build, etc.). */
export const POSTGRES_CLIENT_MODULE_NOT_AVAILABLE = 'POSTGRES_CLIENT_MODULE_NOT_AVAILABLE';

/** Module may load; pool / query path not implemented yet. */
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
  /** Always `false` until a later phase wires pool + adapter methods. */
  runtime_wired: boolean;
  message: string;
}

/**
 * Gate off: no `pg` import.
 * Gate on: probes `import('pg')` to set `module_available`; `runtime_wired` stays false.
 */
export async function getPostgresClientRuntimeSummary(): Promise<PostgresClientRuntimeSummary> {
  const gate_enabled = isPostgresClientEnabled();
  if (!gate_enabled) {
    return {
      module_available: false,
      gate_enabled: false,
      runtime_wired: false,
      message: `${POSTGRES_CLIENT_RUNTIME_NOT_WIRED}: gate off — \`pg\` not loaded (by design); sql.js default path unaffected.`,
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

  return {
    module_available: true,
    gate_enabled: true,
    runtime_wired: false,
    message: `${POSTGRES_CLIENT_RUNTIME_NOT_WIRED}: \`pg\` module resolvable; pool/query/ledger runtime still not wired (2J skeleton only).`,
  };
}
