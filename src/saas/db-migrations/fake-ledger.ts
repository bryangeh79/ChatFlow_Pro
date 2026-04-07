import type { SaasDbMigrationDef } from './types';
import type { SaasMigrationLedgerProvider } from './ledger-contract';
import type { SaasMigrationLedgerRecord } from './ledger-types';

/** In-memory ledger for verify / bootstrap only — no disk, no `pg`. */
export class FakeSaasMigrationLedger implements SaasMigrationLedgerProvider {
  private readonly records: SaasMigrationLedgerRecord[] = [];

  /** Replace all rows (tests). */
  seed(rows: readonly SaasMigrationLedgerRecord[]): void {
    this.records.length = 0;
    this.records.push(...rows);
  }

  listAppliedMigrations(): SaasMigrationLedgerRecord[] {
    return [...this.records];
  }

  recordAppliedMigration(
    row: Omit<SaasMigrationLedgerRecord, 'status'> & { status?: SaasMigrationLedgerRecord['status'] },
  ): void {
    this.records.push({
      ...row,
      status: row.status ?? 'applied',
    });
  }
}

/** Mark `ids` as applied with current registry checksums (must match definitions). */
export function seedFakeLedgerFromMigrationIds(
  migrations: readonly SaasDbMigrationDef[],
  ids: readonly string[],
): FakeSaasMigrationLedger {
  const ledger = new FakeSaasMigrationLedger();
  const want = new Set(ids.map((s) => s.trim()).filter(Boolean));
  const ts = new Date().toISOString();
  for (const m of migrations) {
    if (want.has(m.id)) {
      ledger.recordAppliedMigration({
        migration_id: m.id,
        driver: 'postgres',
        checksum_sha256: m.checksum_sha256,
        applied_at: ts,
      });
    }
  }
  return ledger;
}
