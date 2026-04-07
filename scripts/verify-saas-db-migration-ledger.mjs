/**
 * Phase 24 / 2D — migration registry + plan/bootstrap CLI smoke (no pg).
 * Requires: npm run build
 */

import { spawn } from 'node:child_process';
import { execFileSync } from 'node:child_process';
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
  const { SAAS_DB_MIGRATIONS, listSaasDbMigrations } = require(pathJoin(
    root,
    'dist',
    'src',
    'saas',
    'db-migrations',
    'registry.js',
  ));

  const list = listSaasDbMigrations();
  if (!Array.isArray(list) || list.length < 1) fail('registry empty');

  const ids = list.map((m) => m.id);
  if (new Set(ids).size !== ids.length) fail('migration ids not unique');

  for (const m of list) {
    if (m.target_driver !== 'postgres') fail(`expected target_driver postgres for ${m.id}`);
  }

  const planOut = execFileSync(process.execPath, [pathJoin(root, 'scripts', 'saas-db-migration-plan.mjs'), '--format=json'], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env },
  });
  let planJson;
  try {
    planJson = JSON.parse(planOut);
  } catch {
    fail('plan json parse failed');
  }
  if (!planJson.ok || !Array.isArray(planJson.planned_migrations)) fail('plan payload invalid');
  const planIds = planJson.planned_migrations.map((x) => x.id);
  if (!planIds.includes('pg_0001_core_saas_tables')) fail('plan missing pg_0001');
  if (!planIds.includes('pg_0002_admin_principals_and_audit')) fail('plan missing pg_0002');

  const bootOut = execFileSync(process.execPath, [pathJoin(root, 'scripts', 'saas-db-migration-bootstrap.mjs')], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env },
  });
  for (const line of [
    'saas_migration_bootstrap: dry_run_only',
    'postgres_migration_execution_not_wired',
    'ledger_persistence_not_wired',
  ]) {
    if (!bootOut.includes(line)) fail(`bootstrap missing marker: ${line}`);
  }

  if (SAAS_DB_MIGRATIONS.length !== list.length) fail('SAAS_DB_MIGRATIONS length mismatch');

  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [pathJoin(root, 'scripts', 'verify-saas-db-adapter-selection.mjs')], {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env },
    });
    child.on('exit', (code) => {
      if (code === 0) {
        console.log('verify-saas-db-migration-ledger: ok');
        resolve();
      } else reject(new Error('verify-saas-db-adapter-selection failed'));
    });
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
