/**
 * SaaS migration bootstrap — **dry-run / summary only** (Phase 24 / 2E).
 * Does not connect to Postgres; does not run SQL; does not create ledger table.
 *
 * Marker lines (for automation): see stdout lines starting with saas_migration_bootstrap:
 */

import { createRequire } from 'node:module';
import { dirname, join as pathJoin } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = pathJoin(__dirname, '..');
const require = createRequire(import.meta.url);

function main() {
  const { buildSaasDbMigrationPlan, SAAS_SCHEMA_MIGRATIONS_TABLE } = require(pathJoin(
    root,
    'dist',
    'src',
    'saas',
    'db-migrations',
    'registry.js',
  ));
  const { getSaaSDbDriver, POSTGRES_ADAPTER_NOT_IMPLEMENTED } = require(pathJoin(
    root,
    'dist',
    'src',
    'saas',
    'db-adapter',
    'index.js',
  ));

  let driver;
  try {
    driver = getSaaSDbDriver();
  } catch (e) {
    console.error('saas_db_migration_bootstrap_error: invalid_driver_env', e instanceof Error ? e.message : e);
    process.exit(1);
  }

  const plan = buildSaasDbMigrationPlan();

  console.log('saas_migration_bootstrap: dry_run_only');
  console.log('saas_migration_bootstrap: postgres_migration_execution_not_wired');
  console.log('saas_migration_bootstrap: ledger_persistence_not_wired');
  console.log(`saas_migration_bootstrap: ledger_table_future=${SAAS_SCHEMA_MIGRATIONS_TABLE}`);
  console.log(`saas_migration_bootstrap: current_driver=${driver}`);
  console.log(`saas_migration_bootstrap: registry_count=${plan.migrations.length}`);
  console.log(`saas_migration_bootstrap: postgres_adapter_stub_code=${POSTGRES_ADAPTER_NOT_IMPLEMENTED}`);
  console.log('saas_migration_bootstrap: sql_assets_summary');
  for (const m of plan.migrations) {
    console.log(
      `saas_migration_bootstrap: asset id=${m.id} path=${m.asset_path} checksum_sha256=${m.checksum_sha256}`,
    );
  }

  console.log('');
  console.log('Summary: migration registry is loaded in code. No database bootstrap runs in this phase.');
  console.log('When CHATFLOW_SAAS_DB_DRIVER=postgres, the adapter still throws on any DB call until pg is wired.');
}

main();
