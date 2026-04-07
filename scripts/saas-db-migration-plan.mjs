/**
 * SaaS Postgres migration plan (inspect only — no SQL execution).
 * Requires: npm run build
 *
 * Usage: node scripts/saas-db-migration-plan.mjs [--format=json|text]
 */

import { createRequire } from 'node:module';
import { dirname, join as pathJoin } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = pathJoin(__dirname, '..');
const require = createRequire(import.meta.url);

function parseFormat(argv) {
  const i = argv.indexOf('--format');
  if (i >= 0 && argv[i + 1]) {
    const f = String(argv[i + 1]).toLowerCase();
    if (f === 'json' || f === 'text') return f;
    console.error('saas_db_migration_plan_error: invalid_format');
    process.exit(1);
  }
  return 'json';
}

function main() {
  const format = parseFormat(process.argv.slice(2));
  const { buildSaasDbMigrationPlan } = require(pathJoin(root, 'dist', 'src', 'saas', 'db-migrations', 'registry.js'));
  const { getSaaSDbDriver } = require(pathJoin(root, 'dist', 'src', 'saas', 'db-adapter', 'index.js'));

  let driver;
  try {
    driver = getSaaSDbDriver();
  } catch (e) {
    console.error('saas_db_migration_plan_error: invalid_driver_env', e instanceof Error ? e.message : e);
    process.exit(1);
  }

  const plan = buildSaasDbMigrationPlan();
  const payload = {
    ok: true,
    driver,
    ledger_table_future: plan.ledger_table_future,
    planned_migrations: plan.migrations,
    note: 'status is CLI-only; no ledger table exists yet (Phase 24 / 2D).',
  };

  if (format === 'json') {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log(`saas_db_migration_plan: ok`);
  console.log(`driver: ${driver}`);
  console.log(`ledger_table_future: ${plan.ledger_table_future}`);
  console.log(`count: ${plan.migrations.length}`);
  for (const m of plan.migrations) {
    console.log(`- ${m.id} [${m.kind}] ${m.status} — ${m.description}`);
  }
}

main();
