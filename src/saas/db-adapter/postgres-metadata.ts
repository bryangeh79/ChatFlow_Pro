import { listSaasDbMigrations, SAAS_SCHEMA_MIGRATIONS_TABLE } from '../db-migrations';
import { getPostgresConnectionConfigSummary, type PostgresConnectionConfigSource } from './postgres-config';
import {
  POSTGRES_CLIENT_MODULE_NOT_AVAILABLE,
  POSTGRES_CLIENT_RUNTIME_NOT_WIRED,
  getPostgresClientRuntimeSummary,
} from './postgres-client-loader';
import { isPostgresClientEnabled } from './postgres-gate';
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
  /** `CHATFLOW_SAAS_POSTGRES_CLIENT=1`; does not mean `pg` is loaded or connected. */
  postgres_client_gate_enabled: boolean;
  /** `true` only when gate on and dynamic `import('pg')` succeeded. */
  postgres_client_module_available: boolean;
  /** Always false until pool + query path is implemented (after 2J). */
  postgres_client_runtime_wired: boolean;
  connection_config_present: boolean;
  connection_config_valid: boolean;
  connection_config_source: PostgresConnectionConfigSource;
  connection_message: string;
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
 * Async: probes `pg` only when `CHATFLOW_SAAS_POSTGRES_CLIENT=1`.
 */
export async function getPostgresExecutionReadiness(): Promise<PostgresExecutionReadiness> {
  const driver = readDbDriverForMetadata();
  const postgres_client_gate_enabled = isPostgresClientEnabled();
  const runtime = await getPostgresClientRuntimeSummary();
  const postgres_client_module_available = postgres_client_gate_enabled && runtime.module_available;
  const postgres_client_runtime_wired = runtime.runtime_wired;
  const conn = getPostgresConnectionConfigSummary();
  const connection_config_present = conn.source !== 'missing';
  const connection_config_valid = conn.valid;
  const connection_config_source = conn.source;
  const connection_message = conn.message;

  let sql_assets_present = false;
  try {
    const m = listSaasDbMigrations();
    sql_assets_present =
      m.length > 0 && m.every((x) => typeof x.checksum_sha256 === 'string' && /^[a-f0-9]{64}$/.test(x.checksum_sha256));
  } catch {
    sql_assets_present = false;
  }

  let message: string;
  if (driver === 'postgres' && !postgres_client_gate_enabled) {
    message = `${POSTGRES_METADATA_QUERY_NOT_WIRED}: driver=postgres but CHATFLOW_SAAS_POSTGRES_CLIENT gate is closed (unset/0) — gate-closed, not pretending postgres-ready.`;
  } else if (driver === 'postgres' && postgres_client_gate_enabled && !postgres_client_module_available) {
    message = `${POSTGRES_METADATA_QUERY_NOT_WIRED}: ${POSTGRES_CLIENT_MODULE_NOT_AVAILABLE} — gate=on, driver=postgres, but \`pg\` did not load; fix install; ${POSTGRES_CLIENT_RUNTIME_NOT_WIRED}.`;
  } else if (driver === 'postgres' && postgres_client_gate_enabled && postgres_client_module_available) {
    message = `${POSTGRES_METADATA_QUERY_NOT_WIRED}: ${POSTGRES_CLIENT_RUNTIME_NOT_WIRED} — \`pg\` loads but pool/query adapter not wired (2K: config contract only, no connect).`;
  } else if (postgres_client_gate_enabled && driver === 'sqljs') {
    message = `${POSTGRES_METADATA_QUERY_NOT_WIRED}: gate=on, driver=sqljs — live path stays sql.js; \`pg\` probe=${postgres_client_module_available ? 'ok' : 'unavailable'} (not used for default driver).`;
  } else {
    message = `${POSTGRES_METADATA_QUERY_NOT_WIRED}: postgres runner and ledger persistence not wired; contract stub only (postgres client gate off).`;
  }

  return {
    driver,
    adapter_stub: true,
    execution_wired: false,
    ledger_persistence_wired: false,
    sql_assets_present,
    postgres_client_gate_enabled,
    postgres_client_module_available,
    postgres_client_runtime_wired,
    connection_config_present,
    connection_config_valid,
    connection_config_source,
    connection_message,
    message,
  };
}
