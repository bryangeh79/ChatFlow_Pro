import type { MigrationLedgerStatus } from './types';

/** How the runner is invoked; `apply` does not execute SQL until pg + ledger are wired. */
export type SaasPostgresMigrationMode = 'dry_run' | 'apply';

/** Aggregate run outcome (ledger + executor state). */
export type SaasPostgresMigrationRunStatus = 'dry_run_only' | 'not_wired' | 'applied' | 'failed';

/** Per-migration execution outcome within one run. */
export type SaasPostgresMigrationEntryExecutionStatus =
  | 'planned'
  | 'skipped_no_ledger'
  | 'not_executed'
  | 'applied'
  | 'failed';

/** Top-level contract codes for automation / logs. */
export const POSTGRES_MIGRATION_EXECUTION_NOT_WIRED = 'POSTGRES_MIGRATION_EXECUTION_NOT_WIRED';
export const POSTGRES_LEDGER_PERSISTENCE_NOT_WIRED = 'POSTGRES_LEDGER_PERSISTENCE_NOT_WIRED';

export interface SaasPostgresMigrationEntryResult {
  id: string;
  asset_path: string;
  checksum_sha256: string;
  plan_status: MigrationLedgerStatus;
  execution_status: SaasPostgresMigrationEntryExecutionStatus;
  message: string;
}

export interface SaasPostgresMigrationRunResult {
  driver: 'postgres';
  mode: SaasPostgresMigrationMode;
  ledger_table: string;
  planned_count: number;
  applied_count: number;
  skipped_count: number;
  status: SaasPostgresMigrationRunStatus;
  entries: SaasPostgresMigrationEntryResult[];
  /** Stable machine-readable summary (constants or short tokens). */
  contract_message: string;
}
