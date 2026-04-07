import { resolveSaasMigrationAssetPath, sha256HexOfFile } from './checksum';
import type {
  MigrationLedgerStatus,
  SaasDbMigrationDef,
  SaasDbMigrationPlanEntry,
} from './types';

/** Ledger table name; DDL asset `postgres/pg_0003_saas_schema_migrations.sql` (app does not auto-apply). */
export const SAAS_SCHEMA_MIGRATIONS_TABLE = 'saas_schema_migrations';

type MigrationBase = Omit<SaasDbMigrationDef, 'checksum_sha256'>;

const SAAS_DB_MIGRATIONS_BASE: readonly MigrationBase[] = [
  {
    id: 'pg_0001_core_saas_tables',
    description: 'Core SaaS tenant metadata: tenants, credentials, FAQ entries, settings.',
    target_driver: 'postgres',
    phase_tag: 'phase24_2e',
    kind: 'schema',
    up_summary: 'CREATE core tenant tables per postgres/pg_0001_core_saas_tables.sql.',
    down_summary: 'Drop core SaaS tables — destructive; no automated down in MVP.',
    asset_path: 'postgres/pg_0001_core_saas_tables.sql',
    asset_kind: 'sql_file',
  },
  {
    id: 'pg_0002_admin_principals_and_audit',
    description: 'tenant_admin_principals + tenant_admin_principal_audit_logs (+ indexes).',
    target_driver: 'postgres',
    phase_tag: 'phase24_2e',
    kind: 'schema',
    up_summary: 'CREATE principal + audit tables per postgres/pg_0002_admin_principals_and_audit.sql.',
    down_summary: 'no rollback',
    asset_path: 'postgres/pg_0002_admin_principals_and_audit.sql',
    asset_kind: 'sql_file',
  },
  {
    id: 'pg_0003_saas_schema_migrations',
    description: 'Migration ledger table `saas_schema_migrations` (persistence boundary).',
    target_driver: 'postgres',
    phase_tag: 'phase24_2e',
    kind: 'schema',
    up_summary: 'CREATE saas_schema_migrations per postgres/pg_0003_saas_schema_migrations.sql.',
    down_summary: 'no rollback',
    asset_path: 'postgres/pg_0003_saas_schema_migrations.sql',
    asset_kind: 'sql_file',
  },
];

function buildMigrationsWithChecksums(): readonly SaasDbMigrationDef[] {
  return SAAS_DB_MIGRATIONS_BASE.map((m) => {
    const abs = resolveSaasMigrationAssetPath(m.asset_path);
    const checksum_sha256 = sha256HexOfFile(abs);
    return { ...m, checksum_sha256 };
  });
}

/** Resolved migrations with checksums; throws if any SQL asset is missing or unreadable. */
export const SAAS_DB_MIGRATIONS: readonly SaasDbMigrationDef[] = buildMigrationsWithChecksums();

const STATUS_PENDING: MigrationLedgerStatus = 'pending_no_ledger';

export function listSaasDbMigrations(): readonly SaasDbMigrationDef[] {
  return SAAS_DB_MIGRATIONS;
}

export function buildSaasDbMigrationPlan(): {
  ledger_table_future: string;
  migrations: SaasDbMigrationPlanEntry[];
} {
  return {
    ledger_table_future: SAAS_SCHEMA_MIGRATIONS_TABLE,
    migrations: SAAS_DB_MIGRATIONS.map((m) => ({ ...m, status: STATUS_PENDING })),
  };
}
