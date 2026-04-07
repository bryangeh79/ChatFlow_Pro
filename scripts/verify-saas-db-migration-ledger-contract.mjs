/**
 * Phase 24 / 2G — ledger persistence contract + fake in-memory harness (no pg).
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
  const {
    runSaasPostgresMigrations,
    listSaasDbMigrations,
    SAAS_SCHEMA_MIGRATIONS_TABLE,
    POSTGRES_MIGRATION_APPLY_FAILED,
    POSTGRES_MIGRATION_RUNTIME_UNWIRED,
    POSTGRES_LEDGER_CHECKSUM_MISMATCH,
    FakeSaasMigrationLedger,
    seedFakeLedgerFromMigrationIds,
  } = require(pathJoin(root, 'dist', 'src', 'saas', 'db-migrations', 'index.js'));

  const migrations = listSaasDbMigrations();
  if (migrations.length < 2) fail('need at least 2 migrations');

  const partial = await seedFakeLedgerFromMigrationIds(migrations, ['pg_0001_core_saas_tables']);
  const dr = await runSaasPostgresMigrations({
    driver: 'postgres',
    mode: 'dry_run',
    migrations,
    ledgerTable: SAAS_SCHEMA_MIGRATIONS_TABLE,
    ledger: partial,
  });
  if (dr.status !== 'dry_run_only') fail('partial dry_run status');
  if (dr.skipped_count !== 1) fail('partial skipped_count');
  const e1 = dr.entries.find((x) => x.id === 'pg_0001_core_saas_tables');
  const e2 = dr.entries.find((x) => x.id === 'pg_0002_admin_principals_and_audit');
  if (!e1 || e1.execution_status !== 'already_applied') fail('expected pg_0001 already_applied');
  if (!e2 || e2.execution_status !== 'would_apply') fail('expected pg_0002 would_apply');
  const e3 = dr.entries.find((x) => x.id === 'pg_0003_saas_schema_migrations');
  if (!e3 || e3.execution_status !== 'would_apply') fail('expected pg_0003 would_apply');

  const bad = new FakeSaasMigrationLedger();
  bad.seed([
    {
      migration_id: 'pg_0001_core_saas_tables',
      driver: 'postgres',
      checksum_sha256: '0'.repeat(64),
      applied_at: '2020-01-01T00:00:00.000Z',
      status: 'applied',
    },
  ]);
  const mm = await runSaasPostgresMigrations({
    driver: 'postgres',
    mode: 'dry_run',
    migrations,
    ledgerTable: SAAS_SCHEMA_MIGRATIONS_TABLE,
    ledger: bad,
  });
  if (mm.status !== 'failed') fail('checksum mismatch run status');
  if (mm.contract_message !== POSTGRES_LEDGER_CHECKSUM_MISMATCH) fail('checksum mismatch contract_message');
  const em = mm.entries.find((x) => x.id === 'pg_0001_core_saas_tables');
  if (!em || em.execution_status !== 'failed') fail('mismatch entry status');
  if (!em.message.includes(POSTGRES_LEDGER_CHECKSUM_MISMATCH)) fail('mismatch entry message');

  const app = await runSaasPostgresMigrations({
    driver: 'postgres',
    mode: 'apply',
    migrations,
    ledgerTable: SAAS_SCHEMA_MIGRATIONS_TABLE,
    ledger: partial,
  });
  if (app.status !== 'failed') fail('apply default must fail');
  if (app.applied_count !== 0) fail('apply must not increment applied');
  for (const x of app.entries) {
    if (x.execution_status !== 'failed') fail('apply entries failed');
    if (!x.message.includes(POSTGRES_MIGRATION_RUNTIME_UNWIRED)) fail('apply entry runtime msg');
    if (!x.message.includes(POSTGRES_MIGRATION_APPLY_FAILED)) fail('apply entry apply_failed msg');
  }

  const boot = execFileSync(
    process.execPath,
    [
      pathJoin(root, 'scripts', 'saas-db-migration-bootstrap.mjs'),
      '--fake-applied=pg_0001_core_saas_tables',
    ],
    { cwd: root, encoding: 'utf8' },
  );
  if (!boot.includes('fake_ledger_only')) fail('bootstrap fake marker');
  if (!boot.includes('"execution_status": "already_applied"')) fail('bootstrap json already_applied');
  if (!boot.includes('"execution_status": "would_apply"')) fail('bootstrap json would_apply');

  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [pathJoin(root, 'scripts', 'verify-saas-db-migration-execution-contract.mjs')], {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env },
    });
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error('verify-saas-db-migration-execution-contract failed')),
    );
  });

  console.log('verify-saas-db-migration-ledger-contract: ok');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
