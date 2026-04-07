/** Migrations in this registry target Postgres when wired; sql.js uses separate SCHEMA in `db.ts`. */
export type SaasMigrationTargetDriver = 'postgres';

export type MigrationKind = 'schema' | 'seed' | 'data_migration';

export type SaasMigrationAssetKind = 'sql_file';

/**
 * Registry entry — SQL lives under `db-migrations/postgres/*.sql`.
 * `checksum_sha256` is computed at module load from the file (never hand-edited).
 */
export interface SaasDbMigrationDef {
  id: string;
  description: string;
  target_driver: SaasMigrationTargetDriver;
  /** Optional narrative tag (e.g. phase). */
  phase_tag?: string;
  kind: MigrationKind;
  up_summary: string;
  down_summary: string;
  /** Path relative to `src/saas/db-migrations/` (or dist mirror). */
  asset_path: string;
  asset_kind: SaasMigrationAssetKind;
  /** Lowercase hex SHA-256 of the asset file bytes. */
  checksum_sha256: string;
}

/** CLI-computed until `saas_schema_migrations` (or equivalent) is applied. */
export type MigrationLedgerStatus = 'pending_no_ledger';

export interface SaasDbMigrationPlanEntry extends SaasDbMigrationDef {
  status: MigrationLedgerStatus;
}
