/** Row shape for `saas_schema_migrations` (Postgres + in-memory fake). */
export type SaasMigrationLedgerRecordStatus = 'applied';

export interface SaasMigrationLedgerRecord {
  migration_id: string;
  driver: 'postgres';
  checksum_sha256: string;
  applied_at: string;
  status: SaasMigrationLedgerRecordStatus;
}
