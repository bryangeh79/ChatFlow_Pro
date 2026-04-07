import type { SaasMigrationLedgerRecord } from './ledger-types';

/** Persistence boundary for migration ledger (Postgres table + fake harness). Methods are async for real I/O. */
export interface SaasMigrationLedgerProvider {
  listAppliedMigrations(): Promise<SaasMigrationLedgerRecord[]>;
  recordAppliedMigration(
    record: Omit<SaasMigrationLedgerRecord, 'status'> & { status?: SaasMigrationLedgerRecord['status'] },
  ): Promise<void>;
}
