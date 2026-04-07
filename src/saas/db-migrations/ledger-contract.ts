import type { SaasMigrationLedgerRecord } from './ledger-types';

/** Persistence boundary for migration ledger (Postgres table later; fake harness in 2G). */
export interface SaasMigrationLedgerProvider {
  listAppliedMigrations(): SaasMigrationLedgerRecord[];
  recordAppliedMigration(record: Omit<SaasMigrationLedgerRecord, 'status'> & { status?: SaasMigrationLedgerRecord['status'] }): void;
}
