/** Row shape returned by the SaaS DB adapter (driver-agnostic). */
export type DbRow = Record<string, unknown>;

/** `CHATFLOW_SAAS_DB_DRIVER` — default `sqljs`. */
export type SaaSDbDriver = 'sqljs' | 'postgres';

/**
 * Minimal SaaS persistence boundary for repository code.
 * sql.js today; Postgres later — callers must not assume sync flush except via persistIfNeeded.
 */
export interface SaaSDbAdapter {
  queryOne(sql: string, params?: unknown[]): Promise<DbRow | null>;
  queryAll(sql: string, params?: unknown[]): Promise<DbRow[]>;
  execute(sql: string, params?: unknown[]): Promise<void>;
  /** sql.js: flush to disk; Postgres: no-op or commit semantics (future). */
  persistIfNeeded(): Promise<void>;
  /** Phase 2B: no-op wrapper for sql.js; real transactions for Postgres later. */
  transaction<T>(fn: (tx: SaaSDbAdapter) => Promise<T>): Promise<T>;
}
