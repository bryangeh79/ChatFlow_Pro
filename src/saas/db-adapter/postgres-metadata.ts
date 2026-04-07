import { listSaasDbMigrations, SAAS_SCHEMA_MIGRATIONS_TABLE } from '../db-migrations';
import type { SaaSDbDriver } from './types';

/** Ledger table metadata query not connected to any database (Phase 24 / 2H). */
export const POSTGRES_METADATA_QUERY_NOT_WIRED = 'POSTGRES_METADATA_QUERY_NOT_WIRED';

export type PostgresLedgerMetadataStatus = 'not_wired' | 'unknown' | 'ready';

export interface PostgresMigrationLedgerInfo {
  ledger_table: string;
  exists: boolean;
  status: PostgresLedgerMetadataStatus;
  message: string;
}

export interface PostgresSchemaAssetSummary {
  id: string;
  asset_path: string;
  checksum_sha256: string;
}

export interface PostgresSchemaAssetInfo {
  count: number;
  migrations: PostgresSchemaAssetSummary[];
  message: string;
}

export interface PostgresExecutionReadiness {
  driver: SaaSDbDriver;
  adapter_stub: boolean;
  execution_wired: boolean;
  ledger_persistence_wired: boolean;
  sql_assets_present: boolean;
  message: string;
}

/** Duplicated env read to avoid circular import with `index.ts`. */
function readDbDriverForMetadata(): SaaSDbDriver {
  const raw = process.env.CHATFLOW_SAAS_DB_DRIVER;
  const t = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (t === '' || t === 'sqljs') return 'sqljs';
  if (t === 'postgres') return 'postgres';
  throw new Error(`invalid_chatflow_saas_db_driver:${t}`);
}

/** Read-only stub: no `pg`, no `information_schema` query. */
export function getPostgresMigrationLedgerInfo(): PostgresMigrationLedgerInfo {
  return {
    ledger_table: SAAS_SCHEMA_MIGRATIONS_TABLE,
    exists: false,
    status: 'not_wired',
    message: `${POSTGRES_METADATA_QUERY_NOT_WIRED}: ledger table existence not queried (no DB connection).`,
  };
}

/** Registry-backed asset list (checksums computed at registry load). */
export function getPostgresSchemaAssetInfo(): PostgresSchemaAssetInfo {
  const migrations = listSaasDbMigrations();
  return {
    count: migrations.length,
    migrations: migrations.map((m) => ({
      id: m.id,
      asset_path: m.asset_path,
      checksum_sha256: m.checksum_sha256,
    })),
    message: 'registry_sql_assets: checksums from disk at module load; not validated against a running Postgres.',
  };
}

/**
 * Single summary for operators — does not imply migrations are applied or DB is reachable.
 */
export function getPostgresExecutionReadiness(): PostgresExecutionReadiness {
  const driver = readDbDriverForMetadata();
  let sql_assets_present = false;
  try {
    const m = listSaasDbMigrations();
    sql_assets_present =
      m.length > 0 && m.every((x) => typeof x.checksum_sha256 === 'string' && /^[a-f0-9]{64}$/.test(x.checksum_sha256));
  } catch {
    sql_assets_present = false;
  }

  return {
    driver,
    adapter_stub: true,
    execution_wired: false,
    ledger_persistence_wired: false,
    sql_assets_present,
    message: `${POSTGRES_METADATA_QUERY_NOT_WIRED}: postgres runner and ledger persistence not wired; this is a contract stub only.`,
  };
}
