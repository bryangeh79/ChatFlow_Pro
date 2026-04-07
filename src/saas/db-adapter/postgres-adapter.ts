import type { PostgresClientRuntimeSummary } from './postgres-client-loader';
import { getPostgresClientRuntimeSummary as resolvePostgresClientRuntimeSummary } from './postgres-client-loader';
import {
  getPostgresClientGateSummary as resolvePostgresClientGateSummary,
  type PostgresClientGateSummary,
} from './postgres-gate';
import type { DbRow, SaaSDbAdapter } from './types';

/** Thrown by all `PostgresSaaSDbAdapter` methods until a real client is wired (Phase 24+). */
export const POSTGRES_ADAPTER_NOT_IMPLEMENTED = 'postgres_adapter_not_implemented';

export class PostgresSaaSDbAdapter implements SaaSDbAdapter {
  /** Read-only: current `CHATFLOW_SAAS_POSTGRES_CLIENT` gate (no DB I/O). */
  getPostgresClientGateSummary(): PostgresClientGateSummary {
    return resolvePostgresClientGateSummary();
  }

  /** Read-only: dynamic `pg` probe only when gate on (no DB I/O). */
  getPostgresClientRuntimeSummary(): Promise<PostgresClientRuntimeSummary> {
    return resolvePostgresClientRuntimeSummary();
  }

  private notImplemented(): never {
    throw new Error(POSTGRES_ADAPTER_NOT_IMPLEMENTED);
  }

  async queryOne(_sql: string, _params?: unknown[]): Promise<DbRow | null> {
    this.notImplemented();
  }

  async queryAll(_sql: string, _params?: unknown[]): Promise<DbRow[]> {
    this.notImplemented();
  }

  async execute(_sql: string, _params?: unknown[]): Promise<void> {
    this.notImplemented();
  }

  async persistIfNeeded(): Promise<void> {
    this.notImplemented();
  }

  async transaction<T>(_fn: (tx: SaaSDbAdapter) => Promise<T>): Promise<T> {
    this.notImplemented();
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
