/**
 * Phase 24 / 2I — feature gate for a future real `pg` client (no `pg` installed yet).
 * Unset / `0` → disabled; `1` → enabled. Other values fail fast (same family as `CHATFLOW_SAAS_DB_DRIVER`).
 */

const ENV_POSTGRES_CLIENT = 'CHATFLOW_SAAS_POSTGRES_CLIENT';

function normalizePostgresClientEnv(raw: string | undefined): string {
  return typeof raw === 'string' ? raw.trim() : '';
}

/** `true` only when `CHATFLOW_SAAS_POSTGRES_CLIENT=1`. */
export function isPostgresClientEnabled(): boolean {
  const v = normalizePostgresClientEnv(process.env[ENV_POSTGRES_CLIENT]);
  if (v === '' || v === '0') return false;
  if (v === '1') return true;
  throw new Error(`invalid_chatflow_saas_postgres_client:${v}`);
}

export interface PostgresClientGateSummary {
  env_var: typeof ENV_POSTGRES_CLIENT;
  raw_value: string | null;
  enabled: boolean;
  /** Human-readable; does not imply DB connectivity. */
  message: string;
}

export function getPostgresClientGateSummary(): PostgresClientGateSummary {
  const raw = process.env[ENV_POSTGRES_CLIENT];
  const enabled = isPostgresClientEnabled();
  let message: string;
  if (enabled) {
    message =
      'postgres_client_gate: on (CHATFLOW_SAAS_POSTGRES_CLIENT=1) — permits future real client wiring only; no pg dependency/runtime yet.';
  } else {
    message =
      'postgres_client_gate: off (unset or 0) — real postgres client path must stay inert; sql.js default unaffected by package state.';
  }
  return {
    env_var: ENV_POSTGRES_CLIENT,
    raw_value: typeof raw === 'string' && raw.length > 0 ? raw : null,
    enabled,
    message,
  };
}
