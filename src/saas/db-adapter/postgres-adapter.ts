import type { DbRow, SaaSDbAdapter } from './types';

/** Thrown by all `PostgresSaaSDbAdapter` methods until a real client is wired (Phase 24+). */
export const POSTGRES_ADAPTER_NOT_IMPLEMENTED = 'postgres_adapter_not_implemented';

export class PostgresSaaSDbAdapter implements SaaSDbAdapter {
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
