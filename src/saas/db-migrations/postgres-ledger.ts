/**
 * Postgres-backed `saas_schema_migrations` ledger (Phase 24).
 * Conflict policy: if a row exists for `migration_id` and `checksum_sha256` differs from the new record, throw (no silent overwrite).
 * If checksum matches, record is idempotent (no second insert).
 */

import { getSharedSaaSPostgresPool } from '../db-adapter/postgres-pool';
import type { SaasMigrationLedgerProvider } from './ledger-contract';
import type { SaasMigrationLedgerRecord } from './ledger-types';
import { SAAS_SCHEMA_MIGRATIONS_TABLE } from './registry';
import type { Pool } from 'pg';

/** Thrown when an existing ledger row disagrees with the new checksum (never masked as success). */
export const SAAS_LEDGER_RECORD_CHECKSUM_CONFLICT = 'SAAS_LEDGER_RECORD_CHECKSUM_CONFLICT';

function assertLedgerTableName(): string {
  const t = SAAS_SCHEMA_MIGRATIONS_TABLE;
  if (!/^[a-z_][a-z0-9_]*$/i.test(t)) {
    throw new Error(`saas_ledger_invalid_table_constant:${t}`);
  }
  return t;
}

function mapAppliedAt(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'string') return v;
  return String(v);
}

export async function probePostgresSaasLedgerTableFromPool(pool: Pool): Promise<{
  status: 'ready' | 'table_missing' | 'not_ready';
  message: string;
}> {
  const table = assertLedgerTableName();
  try {
    await pool.query(
      `SELECT migration_id, driver, checksum_sha256, applied_at, status FROM ${table} LIMIT 0`,
    );
    return {
      status: 'ready',
      message: `ledger table ${table} exists and is readable; empty table only means persistence is available, not that migrations were applied.`,
    };
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code === '42P01') {
      return {
        status: 'table_missing',
        message: `ledger table ${table} does not exist — run DDL from migration asset postgres/pg_0003_saas_schema_migrations.sql (app does not auto-create).`,
      };
    }
    return {
      status: 'not_ready',
      message: `ledger table probe failed: ${err.message ?? String(e)}`,
    };
  }
}

export class PostgresSaasMigrationLedger implements SaasMigrationLedgerProvider {
  private async requirePool(): Promise<Pool> {
    const pool = await getSharedSaaSPostgresPool();
    if (!pool) {
      throw new Error('postgres_ledger_pool_unavailable');
    }
    return pool;
  }

  async listAppliedMigrations(): Promise<SaasMigrationLedgerRecord[]> {
    const pool = await this.requirePool();
    const table = assertLedgerTableName();
    const res = await pool.query<{
      migration_id: string;
      driver: string;
      checksum_sha256: string;
      applied_at: unknown;
      status: string;
    }>(
      `SELECT migration_id, driver, checksum_sha256, applied_at, status FROM ${table} ORDER BY applied_at ASC`,
    );
    return res.rows.map((row) => ({
      migration_id: row.migration_id,
      driver: 'postgres',
      checksum_sha256: row.checksum_sha256,
      applied_at: mapAppliedAt(row.applied_at),
      status: 'applied' as const,
    }));
  }

  async recordAppliedMigration(
    row: Omit<SaasMigrationLedgerRecord, 'status'> & { status?: SaasMigrationLedgerRecord['status'] },
  ): Promise<void> {
    const pool = await this.requirePool();
    const table = assertLedgerTableName();
    const status = row.status ?? 'applied';

    const existing = await pool.query<{ checksum_sha256: string }>(
      `SELECT checksum_sha256 FROM ${table} WHERE migration_id = $1`,
      [row.migration_id],
    );
    const prev = existing.rows[0];
    if (prev) {
      if (prev.checksum_sha256 !== row.checksum_sha256) {
        throw new Error(
          `${SAAS_LEDGER_RECORD_CHECKSUM_CONFLICT}:migration_id=${row.migration_id} existing=${prev.checksum_sha256} incoming=${row.checksum_sha256}`,
        );
      }
      return;
    }

    await pool.query(
      `INSERT INTO ${table} (migration_id, driver, checksum_sha256, applied_at, status) VALUES ($1, $2, $3, $4::timestamptz, $5)`,
      [row.migration_id, row.driver, row.checksum_sha256, row.applied_at, status],
    );
  }
}
