import type {
  MigrationLedgerStatus,
  SaasDbMigrationDef,
  SaasDbMigrationPlanEntry,
} from './types';

/**
 * Future Postgres ledger table — **not** created or written in Phase 24 / 2D.
 * Intended columns (later): `migration_id`, `applied_at`, `driver`, `checksum`.
 */
export const SAAS_SCHEMA_MIGRATIONS_TABLE = 'saas_schema_migrations';

/** Registry is the source of truth; order = apply order. */
export const SAAS_DB_MIGRATIONS: readonly SaasDbMigrationDef[] = [
  {
    id: 'pg_0001_core_saas_tables',
    description: 'Core SaaS tenant metadata: tenants, credentials, FAQ entries, settings.',
    target_driver: 'postgres',
    phase_tag: 'phase24_2d',
    kind: 'schema',
    up_summary:
      'Create Postgres equivalents of core tables from sql.js SCHEMA (DDL in future migration files, not in registry).',
    down_summary: 'Drop core SaaS tables — destructive; no automated down in MVP.',
  },
  {
    id: 'pg_0002_admin_principals_and_audit',
    description: 'tenant_admin_principals + tenant_admin_principal_audit_logs (+ indexes).',
    target_driver: 'postgres',
    phase_tag: 'phase24_2d',
    kind: 'schema',
    up_summary: 'Create principal + audit tables matching SQLite semantics (partial unique index on hash TBD in DDL pack).',
    down_summary: 'no rollback',
  },
];

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
