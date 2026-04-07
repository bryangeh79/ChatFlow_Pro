/**
 * Phase 24 / 2H — postgres metadata readiness stub + regression chain (no pg).
 * Requires: npm run build
 */

import { spawn, execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
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

function runVerifyScript(name) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [pathJoin(root, 'scripts', name)], {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env },
    });
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`${name} exited ${code}`)),
    );
  });
}

async function main() {
  const pkg = JSON.parse(readFileSync(pathJoin(root, 'package.json'), 'utf8'));
  if (pkg.dependencies && Object.prototype.hasOwnProperty.call(pkg.dependencies, 'pg')) fail('package.json must not depend on pg');
  if (pkg.devDependencies && Object.prototype.hasOwnProperty.call(pkg.devDependencies, 'pg')) fail('package.json devDependencies must not include pg');

  const {
    getPostgresMigrationLedgerInfo,
    getPostgresSchemaAssetInfo,
    getPostgresExecutionReadiness,
    POSTGRES_METADATA_QUERY_NOT_WIRED,
  } = require(pathJoin(root, 'dist', 'src', 'saas', 'db-adapter', 'index.js'));

  const ledger = getPostgresMigrationLedgerInfo();
  if (typeof ledger.ledger_table !== 'string' || !ledger.ledger_table) fail('ledger.ledger_table');
  if (ledger.exists !== false) fail('ledger.exists must be false (stub)');
  if (ledger.status !== 'not_wired') fail('ledger.status must be not_wired');
  if (!ledger.message.includes(POSTGRES_METADATA_QUERY_NOT_WIRED)) fail('ledger.message must reference POSTGRES_METADATA_QUERY_NOT_WIRED');

  const assets = getPostgresSchemaAssetInfo();
  if (typeof assets.count !== 'number' || assets.count < 1) fail('schema assets count');
  if (!Array.isArray(assets.migrations) || assets.migrations.length !== assets.count) fail('schema migrations array');
  const hex64 = /^[a-f0-9]{64}$/;
  for (const m of assets.migrations) {
    if (!m.id || !m.asset_path || !hex64.test(m.checksum_sha256)) fail(`bad asset row ${m.id}`);
  }

  const r = getPostgresExecutionReadiness();
  if (r.driver !== 'sqljs' && r.driver !== 'postgres') fail('readiness.driver');
  if (r.adapter_stub !== true) fail('adapter_stub');
  if (r.execution_wired !== false) fail('execution_wired');
  if (r.ledger_persistence_wired !== false) fail('ledger_persistence_wired');
  if (typeof r.sql_assets_present !== 'boolean') fail('sql_assets_present');
  if (typeof r.postgres_client_gate_enabled !== 'boolean') fail('postgres_client_gate_enabled');
  if (r.postgres_client_runtime_wired !== false) fail('postgres_client_runtime_wired');
  if (!r.message.includes(POSTGRES_METADATA_QUERY_NOT_WIRED)) fail('readiness.message');

  const out = execFileSync(process.execPath, [pathJoin(root, 'scripts', 'saas-db-postgres-readiness.mjs'), '--format=json'], {
    cwd: root,
    encoding: 'utf8',
  });
  let j;
  try {
    j = JSON.parse(out);
  } catch {
    fail('readiness CLI json parse failed');
  }
  if (!j.ok || j.postgres_metadata_query_not_wired !== true) fail('CLI payload markers');
  if (!j.ledger || j.ledger.status !== 'not_wired') fail('CLI ledger');
  if (!j.readiness || j.readiness.execution_wired !== false) fail('CLI readiness');
  if (typeof j.postgres_client_gate_enabled !== 'boolean') fail('CLI postgres_client_gate_enabled');
  if (j.postgres_client_runtime_wired !== false) fail('CLI postgres_client_runtime_wired');
  if (!j.postgres_client_gate || typeof j.postgres_client_gate.enabled !== 'boolean') fail('CLI postgres_client_gate');

  await runVerifyScript('verify-saas-db-migration-ledger.mjs');
  await runVerifyScript('verify-saas-db-migration-assets.mjs');
  await runVerifyScript('verify-saas-db-migration-execution-contract.mjs');
  await runVerifyScript('verify-saas-db-migration-ledger-contract.mjs');

  console.log('verify-saas-db-postgres-readiness: ok');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
