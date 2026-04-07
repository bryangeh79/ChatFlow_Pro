/** Migrations in this registry target Postgres when wired; sql.js uses separate SCHEMA in `db.ts`. */
export type SaasMigrationTargetDriver = 'postgres';

export type MigrationKind = 'schema' | 'seed' | 'data_migration';

/** Code registry entry — no inline SQL; summaries only until execution ships. */
export interface SaasDbMigrationDef {
  id: string;
  description: string;
  target_driver: SaasMigrationTargetDriver;
  /** Optional narrative tag (e.g. phase). */
  phase_tag?: string;
  kind: MigrationKind;
  up_summary: string;
  down_summary: string;
}

/** CLI-computed until `saas_schema_migrations` (or equivalent) is applied. */
export type MigrationLedgerStatus = 'pending_no_ledger';

export interface SaasDbMigrationPlanEntry extends SaasDbMigrationDef {
  status: MigrationLedgerStatus;
}
