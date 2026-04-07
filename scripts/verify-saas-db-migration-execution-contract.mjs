/**
 * Phase 24 — Postgres migration execution wired contract.
 * Requires: npm run build
 */

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join as pathJoin } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = pathJoin(__dirname, '..');
const require = createRequire(import.meta.url);

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

async function main() {
  const {
    runSaasPostgresMigrations,
    listSaasDbMigrations,
    SAAS_SCHEMA_MIGRATIONS_TABLE,
    POSTGRES_MIGRATION_APPLY_FAILED,
    POSTGRES_MIGRATION_RUNTIME_UNWIRED,
    POSTGRES_LEDGER_PERSISTENCE_NOT_WIRED,
  } = require(pathJoin(root, 'dist', 'src', 'saas', 'db-migrations', 'index.js'));

  const migrations = listSaasDbMigrations();
  if (migrations.length < 1) fail('registry empty');

  let threw = false;
  try {
    await runSaasPostgresMigrations({
      driver: 'sqljs',
      mode: 'dry_run',
      migrations,
      ledgerTable: SAAS_SCHEMA_MIGRATIONS_TABLE,
    });
  } catch (e) {
    threw = true;
    if (!String(e instanceof Error ? e.message : e).includes('saas_postgres_migration_invalid_driver')) {
      fail('unexpected driver error');
    }
  }
  if (!threw) fail('expected fail-fast for non-postgres driver');

  const dry = await runSaasPostgresMigrations({
    driver: 'postgres',
    mode: 'dry_run',
    migrations,
    ledgerTable: SAAS_SCHEMA_MIGRATIONS_TABLE,
  });
  if (dry.status !== 'dry_run_only') fail('dry_run status');
  if (dry.applied_count !== 0 || dry.skipped_count !== 0) fail('dry_run counts without ledger');
  if (dry.entries.length !== migrations.length) fail('dry_run entries length');
  const dryIds = new Set(dry.entries.map((e) => e.id));
  for (const m of migrations) {
    if (!dryIds.has(m.id)) fail(`dry_run missing entry ${m.id}`);
  }
  for (const e of dry.entries) {
    if (e.execution_status !== 'would_apply') fail('dry_run entry should be would_apply');
    if (!e.message.includes(POSTGRES_LEDGER_PERSISTENCE_NOT_WIRED)) fail('dry_run entry message');
  }

  const app = await runSaasPostgresMigrations({
    driver: 'postgres',
    mode: 'apply',
    migrations,
    ledgerTable: SAAS_SCHEMA_MIGRATIONS_TABLE,
  });
  if (app.status !== 'failed') fail('apply default must fail without runtime');
  if (app.applied_count !== 0) fail('apply must not pretend applied');
  if (app.contract_message !== POSTGRES_MIGRATION_RUNTIME_UNWIRED) fail('apply contract_message');
  for (const e of app.entries) {
    if (e.execution_status !== 'failed') fail('apply entry execution_status');
    if (!e.message.includes(POSTGRES_MIGRATION_RUNTIME_UNWIRED)) fail('apply entry message');
    if (!e.message.includes(POSTGRES_MIGRATION_APPLY_FAILED)) fail('apply entry apply_failed');
  }

  const { execFileSync } = await import('node:child_process');
  const bootDry = execFileSync(process.execPath, [pathJoin(root, 'scripts', 'saas-db-migration-bootstrap.mjs')], {
    cwd: root,
    encoding: 'utf8',
  });
  if (!bootDry.includes('contract_json_start')) fail('bootstrap dry missing json');
  if (!bootDry.includes('"status": "dry_run_only"')) fail('bootstrap dry status');

  const bootApply = execFileSync(
    process.execPath,
    [pathJoin(root, 'scripts', 'saas-db-migration-bootstrap.mjs'), '--mode=apply'],
    { cwd: root, encoding: 'utf8' },
  );
  if (!bootApply.includes('saas_migration_bootstrap: apply_failed')) fail('bootstrap apply marker');
  if (!bootApply.includes('"status": "failed"')) fail('bootstrap apply status');
  if (bootApply.includes('"applied_count": 1')) fail('bootstrap apply must not show applied');

  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [pathJoin(root, 'scripts', 'verify-saas-db-migration-assets.mjs')], {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env },
    });
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error('verify-saas-db-migration-assets failed')),
    );
  });

  console.log('verify-saas-db-migration-execution-contract: ok');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
