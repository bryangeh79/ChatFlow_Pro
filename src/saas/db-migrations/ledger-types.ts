/** Row shape for `saas_schema_migrations` (future); in-memory only in Phase 24 / 2G. */
export type SaasMigrationLedgerRecordStatus = 'applied';

export interface SaasMigrationLedgerRecord {
  migration_id: string;
  driver: 'postgres';
  checksum_sha256: string;
  applied_at: string;
  status: SaasMigrationLedgerRecordStatus;
}
