/**
 * SaaS migration bootstrap — uses **execution contract** (Phase 24 / 2F).
 * Does not connect to Postgres; does not run SQL; does not persist ledger.
 *
 * Usage: node scripts/saas-db-migration-bootstrap.mjs [--mode=dry-run|apply]
 *
 * Marker lines: `saas_migration_bootstrap:*` and contract constants.
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

function main() {
  const mode = parseMode(process.argv.slice(2));

  const {
    runSaasPostgresMigrations,
    listSaasDbMigrations,
    SAAS_SCHEMA_MIGRATIONS_TABLE,
    POSTGRES_MIGRATION_EXECUTION_NOT_WIRED,
    POSTGRES_LEDGER_PERSISTENCE_NOT_WIRED,
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
  const runResult = runSaasPostgresMigrations({
    driver: 'postgres',
    mode,
    migrations,
    ledgerTable: SAAS_SCHEMA_MIGRATIONS_TABLE,
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
  console.log('Summary: execution contract stub only — no SQL, no ledger writes.');
  console.log('When CHATFLOW_SAAS_DB_DRIVER=postgres, app adapter still throws until pg is wired.');
}

main();
