import type { PostgresClientRuntimeSummary } from './postgres-client-loader';
import { getPostgresClientRuntimeSummary as resolvePostgresClientRuntimeSummary } from './postgres-client-loader';
import {
  getPostgresClientGateSummary as resolvePostgresClientGateSummary,
  type PostgresClientGateSummary,
} from './postgres-gate';
import { getSharedSaaSPostgresPool } from './postgres-pool';
import type { DbRow, SaaSDbAdapter } from './types';
import type { Pool } from 'pg';

/** Thrown when shared Pool is unavailable (stub path / probe failed). */
export const POSTGRES_ADAPTER_NOT_IMPLEMENTED = 'postgres_adapter_not_implemented';

function convertSqlitePlaceholdersToPg(sql: string, params: unknown[]): { text: string; values: unknown[] } {
  let i = 0;
  const text = sql.replace(/\?/g, () => `$${++i}`);
  if (i !== params.length) {
    throw new Error(`postgres_sql_param_mismatch: expected ${i} ? placeholders, got ${params.length} params`);
  }
  return { text, values: params };
}

export class PostgresSaaSDbAdapter implements SaaSDbAdapter {
  /** Read-only: current `CHATFLOW_SAAS_POSTGRES_CLIENT` gate (no DB I/O). */
  getPostgresClientGateSummary(): PostgresClientGateSummary {
    return resolvePostgresClientGateSummary();
  }

  /** Read-only: gate + optional Pool / `SELECT 1` summary. */
  getPostgresClientRuntimeSummary(): Promise<PostgresClientRuntimeSummary> {
    return resolvePostgresClientRuntimeSummary();
  }

  private async requirePool(): Promise<Pool> {
    const p = await getSharedSaaSPostgresPool();
    if (!p) {
      throw new Error(POSTGRES_ADAPTER_NOT_IMPLEMENTED);
    }
    return p;
  }

  async queryOne(sql: string, params: unknown[] = []): Promise<DbRow | null> {
    const pool = await this.requirePool();
    const { text, values } = convertSqlitePlaceholdersToPg(sql, params);
    const res = await pool.query(text, values);
    return (res.rows[0] as DbRow) ?? null;
  }

  async queryAll(sql: string, params: unknown[] = []): Promise<DbRow[]> {
    const pool = await this.requirePool();
    const { text, values } = convertSqlitePlaceholdersToPg(sql, params);
    const res = await pool.query(text, values);
    return res.rows as DbRow[];
  }

  async execute(sql: string, params: unknown[] = []): Promise<void> {
    const pool = await this.requirePool();
    const { text, values } = convertSqlitePlaceholdersToPg(sql, params);
    await pool.query(text, values);
  }

  async persistIfNeeded(): Promise<void> {
    /* Postgres: autocommit per statement; no sql.js file flush. */
  }

  async transaction<T>(fn: (tx: SaaSDbAdapter) => Promise<T>): Promise<T> {
    return fn(this);
  }
}

export {
  getPostgresConnectionConfigSummary,
  loadPostgresConnectionConfig,
  redactPostgresConnectionString,
} from './postgres-config';
export type { PostgresConnectionConfigResult, PostgresConnectionConfigSource } from './postgres-config';
export {
  getPostgresProbeGateSummary,
  getPostgresProbeReadinessSummary,
  isPostgresProbeEnabled,
  probePostgresConnection,
} from './postgres-probe';
export type { PostgresProbeGateSummary, PostgresProbeResult, PostgresProbeStatus } from './postgres-probe';
export {
  POSTGRES_GO_NO_GO_REASON_ADAPTER_STUB,
  POSTGRES_GO_NO_GO_REASON_CLIENT_GATE,
  POSTGRES_GO_NO_GO_REASON_CONFIG,
  POSTGRES_GO_NO_GO_REASON_DRIVER,
  POSTGRES_GO_NO_GO_REASON_EXECUTION,
  POSTGRES_GO_NO_GO_REASON_LEDGER,
  POSTGRES_GO_NO_GO_REASON_MODULE,
  POSTGRES_GO_NO_GO_REASON_PROBE_FAILED,
  POSTGRES_GO_NO_GO_REASON_RUNTIME,
  POSTGRES_GO_NO_GO_REASON_SQL_ASSETS,
  evaluatePostgresGoNoGo,
} from './postgres-readiness-boundary';
export type {
  PostgresGoNoGoResult,
  PostgresGoNoGoSummary,
  PostgresGoNoGoOverall,
  PostgresReadinessCheckRow,
} from './postgres-readiness-boundary';
export {
  POSTGRES_CLIENT_LOAD_SKIPPED_GATE_OFF,
  POSTGRES_CLIENT_MODULE_NOT_AVAILABLE,
  POSTGRES_CLIENT_RUNTIME_NOT_WIRED,
  getPostgresClientRuntimeSummary,
  isPostgresClientModuleAvailable,
  loadPostgresClientModule,
} from './postgres-client-loader';
export type { PostgresClientModule, PostgresClientRuntimeSummary } from './postgres-client-loader';
export { getPostgresClientGateSummary, isPostgresClientEnabled } from './postgres-gate';
export type { PostgresClientGateSummary } from './postgres-gate';
export {
  getPostgresExecutionReadiness,
  getPostgresMigrationLedgerInfo,
  getPostgresSchemaAssetInfo,
  POSTGRES_METADATA_QUERY_NOT_WIRED,
} from './postgres-metadata';
export type {
  PostgresExecutionReadiness,
  PostgresMigrationLedgerInfo,
  PostgresLedgerMetadataStatus,
  PostgresSchemaAssetInfo,
  PostgresSchemaAssetSummary,
} from './postgres-metadata';
