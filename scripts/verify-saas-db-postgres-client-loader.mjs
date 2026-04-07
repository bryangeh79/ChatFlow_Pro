/**
 * Phase 24 / 2J — dynamic `pg` loader: gate off = no import; gate on = probe; runtime still unwired.
 * Requires: npm run build
 */

import { spawn, execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join as pathJoin } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = pathJoin(__dirname, '..');
const adapterIndex = pathJoin(root, 'dist', 'src', 'saas', 'db-adapter', 'index.js');

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function runNodeEval(code, env) {
  execFileSync(process.execPath, ['-e', code], { cwd: root, encoding: 'utf8', env, stdio: ['pipe', 'pipe', 'pipe'] });
}

function runVerifyScript(name) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [pathJoin(root, 'scripts', name)], {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env },
    });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${name} exited ${code}`))));
  });
}

async function main() {
  const pkg = JSON.parse(readFileSync(pathJoin(root, 'package.json'), 'utf8'));
  if (!pkg.dependencies?.pg) fail('package.json must list pg in dependencies');

  const envGateOff = { ...process.env };
  delete envGateOff.CHATFLOW_SAAS_POSTGRES_CLIENT;

  const gateOffProbe = `
    function pgCached() {
      return Object.keys(require.cache).some((k) => k.replace(/\\\\/g, '/').includes('node_modules/pg'));
    }
    (async () => {
      const { getPostgresClientRuntimeSummary, getPostgresExecutionReadiness } = require(${JSON.stringify(adapterIndex)});
      const before = pgCached();
      const s = await getPostgresClientRuntimeSummary();
      const mid = pgCached();
      const r = await getPostgresExecutionReadiness();
      const after = pgCached();
      if (s.gate_enabled !== false || s.module_available !== false || s.runtime_wired !== false) process.exit(30);
      if (r.postgres_client_gate_enabled !== false || r.postgres_client_module_available !== false) process.exit(31);
      if (r.postgres_client_runtime_wired !== false) process.exit(32);
      if (before || mid || after) process.exit(33);
      process.exit(0);
    })().catch((e) => { console.error(e); process.exit(1); });
  `;
  try {
    runNodeEval(gateOffProbe, envGateOff);
  } catch (e) {
    fail(`gate-off loader probe failed: ${e?.message || e}`);
  }

  const gateOnProbe = `
    function pgCached() {
      return Object.keys(require.cache).some((k) => k.replace(/\\\\/g, '/').includes('node_modules/pg'));
    }
    (async () => {
      const { getPostgresExecutionReadiness, getPostgresClientRuntimeSummary } = require(${JSON.stringify(adapterIndex)});
      const s = await getPostgresClientRuntimeSummary();
      const r = await getPostgresExecutionReadiness();
      if (!s.gate_enabled || !s.module_available || s.runtime_wired !== false) process.exit(40);
      if (!r.postgres_client_module_available || r.postgres_client_runtime_wired !== false) process.exit(41);
      if (!pgCached()) process.exit(42);
      process.exit(0);
    })().catch((e) => { console.error(e); process.exit(1); });
  `;
  try {
    runNodeEval(gateOnProbe, { ...process.env, CHATFLOW_SAAS_POSTGRES_CLIENT: '1' });
  } catch (e) {
    fail(`gate-on loader probe failed: ${e?.message || e}`);
  }

  const cli = execFileSync(
    process.execPath,
    [pathJoin(root, 'scripts', 'saas-db-postgres-readiness.mjs'), '--format=json'],
    { cwd: root, encoding: 'utf8', env: envGateOff },
  );
  const j = JSON.parse(cli);
  if (typeof j.postgres_client_module_available !== 'boolean') fail('readiness CLI missing postgres_client_module_available');
  if (j.postgres_client_runtime_wired !== false) fail('readiness CLI runtime_wired must stay false');

  await runVerifyScript('verify-saas-db-postgres-client-gate.mjs');

  console.log('verify-saas-db-postgres-client-loader: ok');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
