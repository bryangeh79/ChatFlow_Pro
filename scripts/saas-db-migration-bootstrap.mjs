/**
 * SaaS migration bootstrap — **execution contract** + optional **fake ledger** (Phase 24 / 2G).
 * Does not connect to Postgres; does not run SQL; does not persist a real ledger.
 *
 * Usage:
 *   node scripts/saas-db-migration-bootstrap.mjs [--mode=dry-run|apply] [--fake-applied=id1,id2]
 *
 * `--fake-applied` is **verify/bootstrap only** (in-memory); **not** production persistence.
 */

import { createRequire } from 'node:module';
import { dirname, join as pathJoin } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = pathJoin(__dirname, '..');
const require = createRequire(import.meta.url);

function parseMode(argv) {
  const raw = argv.find((a) => a.startsWith('--mode='));
  if (!raw) return 'dry_run';
  const v = raw.slice('--mode='.length).trim().toLowerCase().replace(/-/g, '_');
  if (v === 'dry_run') return 'dry_run';
  if (v === 'apply') return 'apply';
  console.error('saas_db_migration_bootstrap_error: invalid_mode');
  process.exit(1);
}

function parseFakeApplied(argv) {
  const raw = argv.find((a) => a.startsWith('--fake-applied='));
  if (!raw) return [];
  return raw
    .slice('--fake-applied='.length)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function main() {
  const argv = process.argv.slice(2);
  const mode = parseMode(argv);
  const fakeAppliedIds = parseFakeApplied(argv);

  const {
    runSaasPostgresMigrations,
    listSaasDbMigrations,
    SAAS_SCHEMA_MIGRATIONS_TABLE,
    POSTGRES_MIGRATION_EXECUTION_NOT_WIRED,
    POSTGRES_LEDGER_PERSISTENCE_NOT_WIRED,
    seedFakeLedgerFromMigrationIds,
  } = require(pathJoin(root, 'dist', 'src', 'saas', 'db-migrations', 'index.js'));

  const { getSaaSDbDriver, POSTGRES_ADAPTER_NOT_IMPLEMENTED } = require(pathJoin(
    root,
    'dist',
    'src',
    'saas',
    'db-adapter',
    'index.js',
  ));

  let appDriver;
  try {
    appDriver = getSaaSDbDriver();
  } catch (e) {
    console.error('saas_db_migration_bootstrap_error: invalid_driver_env', e instanceof Error ? e.message : e);
    process.exit(1);
  }

  const migrations = listSaasDbMigrations();
  let ledger = undefined;
  if (fakeAppliedIds.length > 0) {
    console.log('saas_migration_bootstrap: fake_ledger_only');
    console.log('saas_migration_bootstrap: real_ledger_persistence_not_wired');
    ledger = seedFakeLedgerFromMigrationIds(migrations, fakeAppliedIds);
    console.log(`saas_migration_bootstrap: fake_applied_ids=${fakeAppliedIds.join(',')}`);
  }

  const runResult = runSaasPostgresMigrations({
    driver: 'postgres',
    mode,
    migrations,
    ledgerTable: SAAS_SCHEMA_MIGRATIONS_TABLE,
    ledger,
  });

  if (runResult.status === 'dry_run_only') {
    console.log('saas_migration_bootstrap: dry_run_only');
  } else {
    console.log(`saas_migration_bootstrap: run_status=${runResult.status}`);
  }

  console.log('saas_migration_bootstrap: postgres_migration_execution_not_wired');
  console.log('saas_migration_bootstrap: ledger_persistence_not_wired');
  console.log(`saas_migration_bootstrap: ${POSTGRES_LEDGER_PERSISTENCE_NOT_WIRED}`);
  console.log(`saas_migration_bootstrap: ledger_table_future=${SAAS_SCHEMA_MIGRATIONS_TABLE}`);
  console.log(`saas_migration_bootstrap: app_runtime_driver=${appDriver}`);
  console.log(`saas_migration_bootstrap: contract_mode=${runResult.mode}`);
  console.log(`saas_migration_bootstrap: contract_message=${runResult.contract_message}`);
  console.log(`saas_migration_bootstrap: planned_count=${runResult.planned_count}`);
  console.log(`saas_migration_bootstrap: applied_count=${runResult.applied_count}`);
  console.log(`saas_migration_bootstrap: skipped_count=${runResult.skipped_count}`);
  console.log(`saas_migration_bootstrap: postgres_adapter_stub_code=${POSTGRES_ADAPTER_NOT_IMPLEMENTED}`);

  if (mode === 'apply') {
    console.log(`saas_migration_bootstrap: ${POSTGRES_MIGRATION_EXECUTION_NOT_WIRED}`);
  }

  console.log('saas_migration_bootstrap: sql_assets_summary');
  for (const e of runResult.entries) {
    console.log(
      `saas_migration_bootstrap: asset id=${e.id} path=${e.asset_path} checksum_sha256=${e.checksum_sha256} exec=${e.execution_status}`,
    );
  }

  console.log('saas_migration_bootstrap: contract_json_start');
  console.log(JSON.stringify(runResult, null, 2));
  console.log('saas_migration_bootstrap: contract_json_end');

  console.log('');
  console.log(
    fakeAppliedIds.length > 0
      ? 'Summary: fake in-memory ledger only — no SQL, no real ledger persistence.'
      : 'Summary: execution contract — no SQL, no real ledger writes.',
  );
  console.log('When CHATFLOW_SAAS_DB_DRIVER=postgres, app adapter still throws until pg is wired.');
}

main();
