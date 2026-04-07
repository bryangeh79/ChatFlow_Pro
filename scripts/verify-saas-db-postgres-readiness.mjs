/**
 * Phase 24 / 2H+ — postgres readiness + client loader regression chain.
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
  if (!pkg.dependencies || !Object.prototype.hasOwnProperty.call(pkg.dependencies, 'pg')) fail('package.json must depend on pg (Phase 24 / 2J)');
  if (pkg.devDependencies && Object.prototype.hasOwnProperty.call(pkg.devDependencies, 'pg')) fail('package.json devDependencies must not bundle pg');

  const { getPostgresSchemaAssetInfo, getPostgresExecutionReadiness, POSTGRES_METADATA_QUERY_NOT_WIRED } = require(
    pathJoin(root, 'dist', 'src', 'saas', 'db-adapter', 'index.js'),
  );

  const r0 = await getPostgresExecutionReadiness();
  const ledger = r0.ledger_info;
  if (typeof ledger.ledger_table !== 'string' || !ledger.ledger_table) fail('ledger.ledger_table');
  if (ledger.exists !== false) fail('ledger.exists must be false (default sqljs path)');
  if (ledger.status !== 'not_wired') fail('ledger.status must be not_wired');
  if (!ledger.message.includes(POSTGRES_METADATA_QUERY_NOT_WIRED)) fail('ledger.message must reference POSTGRES_METADATA_QUERY_NOT_WIRED');

  const assets = getPostgresSchemaAssetInfo();
  if (typeof assets.count !== 'number' || assets.count < 1) fail('schema assets count');
  if (!Array.isArray(assets.migrations) || assets.migrations.length !== assets.count) fail('schema migrations array');
  const hex64 = /^[a-f0-9]{64}$/;
  for (const m of assets.migrations) {
    if (!m.id || !m.asset_path || !hex64.test(m.checksum_sha256)) fail(`bad asset row ${m.id}`);
  }

  const r = r0;
  if (r.driver !== 'sqljs' && r.driver !== 'postgres') fail('readiness.driver');
  if (r.adapter_stub !== true) fail('adapter_stub');
  if (r.execution_wired !== false) fail('execution_wired');
  if (r.ledger_persistence_wired !== false) fail('ledger_persistence_wired');
  if (typeof r.sql_assets_present !== 'boolean') fail('sql_assets_present');
  if (typeof r.postgres_client_gate_enabled !== 'boolean') fail('postgres_client_gate_enabled');
  if (typeof r.postgres_client_module_available !== 'boolean') fail('postgres_client_module_available');
  if (r.postgres_client_runtime_wired !== false) fail('postgres_client_runtime_wired');
  if (typeof r.connection_config_present !== 'boolean') fail('connection_config_present');
  if (typeof r.connection_config_valid !== 'boolean') fail('connection_config_valid');
  if (!['missing', 'url', 'fields'].includes(r.connection_config_source)) fail('connection_config_source');
  if (typeof r.connection_message !== 'string') fail('connection_message');
  if (typeof r.postgres_probe_enabled !== 'boolean') fail('postgres_probe_enabled');
  if (typeof r.postgres_probe_attempted !== 'boolean') fail('postgres_probe_attempted');
  if (typeof r.postgres_probe_status !== 'string') fail('postgres_probe_status');
  if (typeof r.postgres_probe_message !== 'string') fail('postgres_probe_message');
  if (typeof r.controlled_reachability !== 'string') fail('controlled_reachability');
  if (typeof r.reachability_basis !== 'string') fail('reachability_basis');
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
  if (!j.readiness.ledger_info || typeof j.readiness.ledger_info.status !== 'string') fail('CLI readiness.ledger_info');
  if (typeof j.postgres_client_gate_enabled !== 'boolean') fail('CLI postgres_client_gate_enabled');
  if (typeof j.postgres_client_module_available !== 'boolean') fail('CLI postgres_client_module_available');
  if (j.postgres_client_runtime_wired !== false) fail('CLI postgres_client_runtime_wired');
  if (!j.postgres_client_gate || typeof j.postgres_client_gate.enabled !== 'boolean') fail('CLI postgres_client_gate');
  if (!j.postgres_client_runtime || typeof j.postgres_client_runtime.module_available !== 'boolean') fail('CLI postgres_client_runtime');
  if (typeof j.connection_config_present !== 'boolean') fail('CLI connection_config_present');
  if (typeof j.connection_config_valid !== 'boolean') fail('CLI connection_config_valid');
  if (!j.postgres_connection_config) fail('CLI postgres_connection_config');
  if (typeof j.readiness.postgres_probe_enabled !== 'boolean') fail('readiness postgres_probe_enabled');
  if (typeof j.readiness.postgres_probe_attempted !== 'boolean') fail('readiness postgres_probe_attempted');
  if (typeof j.readiness.postgres_probe_status !== 'string') fail('readiness postgres_probe_status');
  if (typeof j.readiness.postgres_probe_message !== 'string') fail('readiness postgres_probe_message');
  if (typeof j.readiness.controlled_reachability !== 'string') fail('readiness controlled_reachability');
  if (typeof j.readiness.reachability_basis !== 'string') fail('readiness reachability_basis');

  await runVerifyScript('verify-saas-db-migration-ledger.mjs');
  await runVerifyScript('verify-saas-db-migration-assets.mjs');
  await runVerifyScript('verify-saas-db-migration-execution-contract.mjs');
  await runVerifyScript('verify-saas-db-migration-ledger-contract.mjs');
  await runVerifyScript('verify-postgres-pool-runtime-wire.mjs');
  await runVerifyScript('verify-postgres-ledger-persistence.mjs');
  await runVerifyScript('verify-tenant-settings-read-path.mjs');

  console.log('verify-saas-db-postgres-readiness: ok');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
