import type { SaasDbMigrationDef } from './types';
import type {
  SaasPostgresMigrationEntryResult,
  SaasPostgresMigrationMode,
  SaasPostgresMigrationRunResult,
} from './execution-types';
import {
  POSTGRES_LEDGER_PERSISTENCE_NOT_WIRED,
  POSTGRES_MIGRATION_EXECUTION_NOT_WIRED,
} from './execution-types';

const PLAN_PENDING = 'pending_no_ledger' as const;

/**
 * Postgres migration execution contract (Phase 24 / 2F).
 * No `pg`, no SQL execution, no ledger I/O — structured results only.
 */
export function runSaasPostgresMigrations(params: {
  /** Must be `postgres` (target of these DDL migrations). */
  driver: string;
  mode: SaasPostgresMigrationMode;
  migrations: readonly SaasDbMigrationDef[];
  ledgerTable: string;
}): SaasPostgresMigrationRunResult {
  const { driver, mode, migrations, ledgerTable } = params;
  if (driver !== 'postgres') {
    throw new Error(`saas_postgres_migration_invalid_driver:expected_postgres_got:${driver}`);
  }

  const planned_count = migrations.length;

  if (mode === 'dry_run') {
    const entries: SaasPostgresMigrationEntryResult[] = migrations.map((m) => ({
      id: m.id,
      asset_path: m.asset_path,
      checksum_sha256: m.checksum_sha256,
      plan_status: PLAN_PENDING,
      execution_status: 'not_executed',
      message: `${POSTGRES_LEDGER_PERSISTENCE_NOT_WIRED}; dry_run: SQL not executed.`,
    }));

    return {
      driver: 'postgres',
      mode: 'dry_run',
      ledger_table: ledgerTable,
      planned_count,
      applied_count: 0,
      skipped_count: 0,
      status: 'dry_run_only',
      entries,
      contract_message: 'dry_run_only',
    };
  }

  const entries: SaasPostgresMigrationEntryResult[] = migrations.map((m) => ({
    id: m.id,
    asset_path: m.asset_path,
    checksum_sha256: m.checksum_sha256,
    plan_status: PLAN_PENDING,
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
