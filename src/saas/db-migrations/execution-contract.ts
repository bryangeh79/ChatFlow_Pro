import type { SaasDbMigrationDef } from './types';
import type { SaasMigrationLedgerProvider } from './ledger-contract';
import { resolveSaasMigrationAssetPath } from './checksum';
import type {
  SaasPostgresMigrationEntryResult,
  SaasPostgresMigrationMode,
  SaasPostgresMigrationRunResult,
} from './execution-types';
import {
  POSTGRES_MIGRATION_APPLY_FAILED,
  POSTGRES_MIGRATION_LEDGER_NOT_READY,
  POSTGRES_MIGRATION_RUNTIME_UNWIRED,
  POSTGRES_MIGRATION_SQL_EXEC_FAILED,
  POSTGRES_LEDGER_CHECKSUM_MISMATCH,
  POSTGRES_LEDGER_PERSISTENCE_NOT_WIRED,
  POSTGRES_MIGRATION_EXECUTION_NOT_WIRED,
} from './execution-types';
import { getSharedSaaSPostgresPool } from '../db-adapter/postgres-pool';
import { PostgresSaasMigrationLedger, probePostgresSaasLedgerTableFromPool } from './postgres-ledger';
import { readFileSync } from 'node:fs';

/**
 * Postgres migration execution contract (Phase 24 / 2F–2G).
 * No migration SQL execution in `apply` mode until a later slice — optional ledger for dry-run classification.
 */
export async function runSaasPostgresMigrations(params: {
  /** Must be `postgres` (target of these DDL migrations). */
  driver: string;
  mode: SaasPostgresMigrationMode;
  migrations: readonly SaasDbMigrationDef[];
  ledgerTable: string;
  /** Optional (e.g. `FakeSaasMigrationLedger`); Postgres real ledger is separate from bootstrap by default. */
  ledger?: SaasMigrationLedgerProvider;
}): Promise<SaasPostgresMigrationRunResult> {
  const { driver, mode, migrations, ledgerTable, ledger } = params;
  if (driver !== 'postgres') {
    throw new Error(`saas_postgres_migration_invalid_driver:expected_postgres_got:${driver}`);
  }

  const planned_count = migrations.length;

  if (mode === 'dry_run') {
    const appliedRows = ledger ? await ledger.listAppliedMigrations() : [];
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

  const pool = await getSharedSaaSPostgresPool();
  if (!pool) {
    const entries: SaasPostgresMigrationEntryResult[] = migrations.map((m) => ({
      id: m.id,
      asset_path: m.asset_path,
      checksum_sha256: m.checksum_sha256,
      plan_status: 'pending_no_ledger',
      execution_status: 'failed',
      message: `${POSTGRES_MIGRATION_RUNTIME_UNWIRED}; ${POSTGRES_MIGRATION_APPLY_FAILED}`,
    }));
    return {
      driver: 'postgres',
      mode: 'apply',
      ledger_table: ledgerTable,
      planned_count,
      applied_count: 0,
      skipped_count: 0,
      status: 'failed',
      entries,
      contract_message: POSTGRES_MIGRATION_RUNTIME_UNWIRED,
    };
  }

  const ledgerProbe = await probePostgresSaasLedgerTableFromPool(pool);
  if (ledgerProbe.status !== 'ready') {
    const code =
      ledgerProbe.status === 'table_missing'
        ? `${POSTGRES_MIGRATION_LEDGER_NOT_READY}:table_missing`
        : POSTGRES_MIGRATION_LEDGER_NOT_READY;
    const entries: SaasPostgresMigrationEntryResult[] = migrations.map((m) => ({
      id: m.id,
      asset_path: m.asset_path,
      checksum_sha256: m.checksum_sha256,
      plan_status: 'pending_no_ledger',
      execution_status: 'failed',
      message: `${code}; ${POSTGRES_MIGRATION_APPLY_FAILED}; ${ledgerProbe.message}`,
    }));
    return {
      driver: 'postgres',
      mode: 'apply',
      ledger_table: ledgerTable,
      planned_count,
      applied_count: 0,
      skipped_count: 0,
      status: 'failed',
      entries,
      contract_message: POSTGRES_MIGRATION_LEDGER_NOT_READY,
    };
  }

  const realLedger = ledger instanceof PostgresSaasMigrationLedger ? ledger : new PostgresSaasMigrationLedger();
  const byId = new Map((await realLedger.listAppliedMigrations()).map((r) => [r.migration_id, r]));
  const entries: SaasPostgresMigrationEntryResult[] = [];
  let applied_count = 0;
  let skipped_count = 0;

  for (let i = 0; i < migrations.length; i += 1) {
    const m = migrations[i];
    const rec = byId.get(m.id);
    if (rec && rec.checksum_sha256 !== m.checksum_sha256) {
      entries.push({
        id: m.id,
        asset_path: m.asset_path,
        checksum_sha256: m.checksum_sha256,
        plan_status: 'checksum_mismatch',
        execution_status: 'failed',
        message: `${POSTGRES_LEDGER_CHECKSUM_MISMATCH}; ${POSTGRES_MIGRATION_APPLY_FAILED}; ledger_checksum=${rec.checksum_sha256} asset_checksum=${m.checksum_sha256}`,
      });
      for (let j = i + 1; j < migrations.length; j += 1) {
        const left = migrations[j];
        entries.push({
          id: left.id,
          asset_path: left.asset_path,
          checksum_sha256: left.checksum_sha256,
          plan_status: 'pending_no_ledger',
          execution_status: 'not_executed',
          message: `${POSTGRES_MIGRATION_APPLY_FAILED}; skipped_due_to_previous_failure`,
        });
      }
      return {
        driver: 'postgres',
        mode: 'apply',
        ledger_table: ledgerTable,
        planned_count,
        applied_count,
        skipped_count,
        status: 'failed',
        entries,
        contract_message: POSTGRES_LEDGER_CHECKSUM_MISMATCH,
      };
    }
    if (rec) {
      skipped_count += 1;
      entries.push({
        id: m.id,
        asset_path: m.asset_path,
        checksum_sha256: m.checksum_sha256,
        plan_status: 'recorded_in_ledger',
        execution_status: 'already_applied',
        message: 'apply: already_applied (ledger row checksum matches asset).',
      });
      continue;
    }

    const abs = resolveSaasMigrationAssetPath(m.asset_path);
    const sql = readFileSync(abs, 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await realLedger.recordAppliedMigrationInTransaction(client, {
        migration_id: m.id,
        driver: 'postgres',
        checksum_sha256: m.checksum_sha256,
        applied_at: new Date().toISOString(),
      });
      await client.query('COMMIT');
      applied_count += 1;
      entries.push({
        id: m.id,
        asset_path: m.asset_path,
        checksum_sha256: m.checksum_sha256,
        plan_status: 'pending_no_ledger',
        execution_status: 'applied',
        message: 'apply: sql_executed_and_ledger_recorded',
      });
    } catch (e) {
      try {
        await client.query('ROLLBACK');
      } catch {
        /* ignore rollback secondary failure */
      }
      const msg = e instanceof Error ? e.message : String(e);
      entries.push({
        id: m.id,
        asset_path: m.asset_path,
        checksum_sha256: m.checksum_sha256,
        plan_status: 'pending_no_ledger',
        execution_status: 'failed',
        message: `${POSTGRES_MIGRATION_SQL_EXEC_FAILED}; ${POSTGRES_MIGRATION_APPLY_FAILED}; ${msg}`,
      });
      for (let j = i + 1; j < migrations.length; j += 1) {
        const left = migrations[j];
        entries.push({
          id: left.id,
          asset_path: left.asset_path,
          checksum_sha256: left.checksum_sha256,
          plan_status: 'pending_no_ledger',
          execution_status: 'not_executed',
          message: `${POSTGRES_MIGRATION_APPLY_FAILED}; skipped_due_to_previous_failure`,
        });
      }
      return {
        driver: 'postgres',
        mode: 'apply',
        ledger_table: ledgerTable,
        planned_count,
        applied_count,
        skipped_count,
        status: 'failed',
        entries,
        contract_message: POSTGRES_MIGRATION_APPLY_FAILED,
      };
    } finally {
      client.release();
    }
  }

  return {
    driver: 'postgres',
    mode: 'apply',
    ledger_table: ledgerTable,
    planned_count,
    applied_count,
    skipped_count,
    status: 'applied',
    entries,
    contract_message: 'applied',
  };
}
