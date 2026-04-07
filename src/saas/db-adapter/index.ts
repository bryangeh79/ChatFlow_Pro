import { getSaaSDatabase } from '../db';
import { PostgresSaaSDbAdapter, POSTGRES_ADAPTER_NOT_IMPLEMENTED } from './postgres-adapter';
import { SqlJsSaaSDbAdapter } from './sqljs-adapter';
import type { SaaSDbAdapter } from './types';
import type { SaaSDbDriver } from './types';

export type { DbRow, SaaSDbAdapter, SaaSDbDriver } from './types';
export { SqlJsSaaSDbAdapter } from './sqljs-adapter';
export {
  PostgresSaaSDbAdapter,
  POSTGRES_ADAPTER_NOT_IMPLEMENTED,
  POSTGRES_CLIENT_LOAD_SKIPPED_GATE_OFF,
  POSTGRES_CLIENT_MODULE_NOT_AVAILABLE,
  POSTGRES_CLIENT_RUNTIME_NOT_WIRED,
  POSTGRES_METADATA_QUERY_NOT_WIRED,
  getPostgresClientGateSummary,
  getPostgresClientRuntimeSummary,
  getPostgresExecutionReadiness,
  getPostgresMigrationLedgerInfo,
  getPostgresSchemaAssetInfo,
  isPostgresClientEnabled,
  isPostgresClientModuleAvailable,
  loadPostgresClientModule,
} from './postgres-adapter';
export type {
  PostgresClientGateSummary,
  PostgresClientModule,
  PostgresClientRuntimeSummary,
  PostgresExecutionReadiness,
  PostgresLedgerMetadataStatus,
  PostgresMigrationLedgerInfo,
  PostgresSchemaAssetInfo,
  PostgresSchemaAssetSummary,
} from './postgres-adapter';

let cachedDriver: SaaSDbDriver | null = null;
let cachedAdapter: Promise<SaaSDbAdapter> | null = null;

/**
 * Read-only: effective SaaS DB driver from `CHATFLOW_SAAS_DB_DRIVER`.
 * Default `sqljs`; unknown values fail fast.
 */
export function getSaaSDbDriver(): SaaSDbDriver {
  const raw = process.env.CHATFLOW_SAAS_DB_DRIVER;
  const t = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (t === '' || t === 'sqljs') return 'sqljs';
  if (t === 'postgres') return 'postgres';
  throw new Error(`invalid_chatflow_saas_db_driver:${t}`);
}

function resolveAdapterPromise(driver: SaaSDbDriver): Promise<SaaSDbAdapter> {
  if (driver === 'postgres') {
    return Promise.resolve(new PostgresSaaSDbAdapter());
  }
  return getSaaSDatabase().then((db) => new SqlJsSaaSDbAdapter(db));
}

/** Resolves adapter for current driver; default remains sql.js + file-backed DB. */
export async function getSaasDbAdapter(): Promise<SaaSDbAdapter> {
  const driver = getSaaSDbDriver();
  if (cachedDriver !== driver) {
    cachedDriver = driver;
    cachedAdapter = resolveAdapterPromise(driver);
  }
  return cachedAdapter!;
}
