import type { SaasDbMigrationDef } from './types';
import type { SaasMigrationLedgerProvider } from './ledger-contract';
import type {
  SaasPostgresMigrationEntryResult,
  SaasPostgresMigrationMode,
  SaasPostgresMigrationRunResult,
} from './execution-types';
import {
  POSTGRES_LEDGER_CHECKSUM_MISMATCH,
  POSTGRES_LEDGER_PERSISTENCE_NOT_WIRED,
  POSTGRES_MIGRATION_EXECUTION_NOT_WIRED,
} from './execution-types';

/**
 * Postgres migration execution contract (Phase 24 / 2F–2G).
 * No `pg`, no SQL execution — optional in-memory ledger for dry-run classification only.
 */
export function runSaasPostgresMigrations(params: {
  /** Must be `postgres` (target of these DDL migrations). */
  driver: string;
  mode: SaasPostgresMigrationMode;
  migrations: readonly SaasDbMigrationDef[];
  ledgerTable: string;
  /** Optional (e.g. `FakeSaasMigrationLedger`); never persisted to real DB in 2G. */
  ledger?: SaasMigrationLedgerProvider;
}): SaasPostgresMigrationRunResult {
  const { driver, mode, migrations, ledgerTable, ledger } = params;
  if (driver !== 'postgres') {
    throw new Error(`saas_postgres_migration_invalid_driver:expected_postgres_got:${driver}`);
  }

  const planned_count = migrations.length;

  if (mode === 'dry_run') {
    const appliedRows = ledger?.listAppliedMigrations() ?? [];
    const byId = new Map(appliedRows.map((r) => [r.migration_id, r]));
    let skipped_count = 0;
    const entries: SaasPostgresMigrationEntryResult[] = migrations.map((m) => {
      const rec = byId.get(m.id);
      if (!rec) {
        return {
          id: m.id,
          asset_path: m.asset_path,
          checksum_sha256: m.checksum_sha256,
          plan_status: 'pending_no_ledger',
          execution_status: 'would_apply',
          message: `${POSTGRES_LEDGER_PERSISTENCE_NOT_WIRED}; dry_run: would_apply.`,
        };
      }
      if (rec.checksum_sha256 !== m.checksum_sha256) {
        return {
          id: m.id,
          asset_path: m.asset_path,
          checksum_sha256: m.checksum_sha256,
          plan_status: 'checksum_mismatch',
          execution_status: 'failed',
          message: `${POSTGRES_LEDGER_CHECKSUM_MISMATCH}; ledger_checksum=${rec.checksum_sha256} asset_checksum=${m.checksum_sha256}`,
        };
      }
      skipped_count += 1;
      return {
        id: m.id,
        asset_path: m.asset_path,
        checksum_sha256: m.checksum_sha256,
        plan_status: 'recorded_in_ledger',
        execution_status: 'already_applied',
        message: 'dry_run: already_applied (ledger row checksum matches asset).',
      };
    });

    const hasLedgerMismatch = entries.some((e) => e.execution_status === 'failed');
    return {
      driver: 'postgres',
      mode: 'dry_run',
      ledger_table: ledgerTable,
      planned_count,
      applied_count: 0,
      skipped_count,
      status: hasLedgerMismatch ? 'failed' : 'dry_run_only',
      entries,
      contract_message: hasLedgerMismatch ? POSTGRES_LEDGER_CHECKSUM_MISMATCH : 'dry_run_only',
    };
  }

  const entries: SaasPostgresMigrationEntryResult[] = migrations.map((m) => ({
    id: m.id,
    asset_path: m.asset_path,
    checksum_sha256: m.checksum_sha256,
    plan_status: 'pending_no_ledger',
    execution_status: 'failed',
    message: `${POSTGRES_MIGRATION_EXECUTION_NOT_WIRED}; ${POSTGRES_LEDGER_PERSISTENCE_NOT_WIRED}`,
  }));

  return {
    driver: 'postgres',
    mode: 'apply',
    ledger_table: ledgerTable,
    planned_count,
    applied_count: 0,
    skipped_count: 0,
    status: 'not_wired',
    entries,
    contract_message: POSTGRES_MIGRATION_EXECUTION_NOT_WIRED,
  };
}
