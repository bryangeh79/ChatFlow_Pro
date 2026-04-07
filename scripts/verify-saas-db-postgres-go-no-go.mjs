/**
 * Phase 24 / 2M — go/no-go boundary (default NO_GO; probe OK does not grant GO).
 * Requires: npm run build
 */

import { spawn, execFileSync } from 'node:child_process';
import { dirname, join as pathJoin } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = pathJoin(__dirname, '..');
const adapterIndex = pathJoin(root, 'dist', 'src', 'saas', 'db-adapter', 'index.js');

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function scrub(base) {
  const e = { ...base };
  for (const k of Object.keys(e)) {
    if (k.startsWith('CHATFLOW_SAAS_POSTGRES')) delete e[k];
  }
  delete e.CHATFLOW_SAAS_POSTGRES_CLIENT;
  delete e.CHATFLOW_SAAS_POSTGRES_PROBE;
  delete e.CHATFLOW_SAAS_DB_DRIVER;
  return e;
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
  const base = scrub(process.env);
  const secret = 'go_no_go_secret_pw';

  const outDefault = execFileSync(
    process.execPath,
    [pathJoin(root, 'scripts', 'saas-db-postgres-go-no-go.mjs'), '--format=json'],
    { cwd: root, encoding: 'utf8', env: base },
  );
  if (outDefault.includes(secret)) fail('leak: default output');
  const j0 = JSON.parse(outDefault);
  if (j0.overall_status !== 'no_go') fail('default must be no_go');
  const br0 = j0.blocking_reasons;
  if (!Array.isArray(br0)) fail('blocking_reasons array');
  for (const code of [
    'postgres_client_runtime_not_wired',
    'postgres_ledger_persistence_not_wired',
    'postgres_migration_execution_not_wired',
  ]) {
    if (!br0.includes(code)) fail(`default missing blocker ${code}`);
  }

  const hotEnv = {
    ...base,
    CHATFLOW_SAAS_DB_DRIVER: 'postgres',
    CHATFLOW_SAAS_POSTGRES_CLIENT: '1',
    CHATFLOW_SAAS_POSTGRES_PROBE: '1',
    CHATFLOW_SAAS_POSTGRES_URL: `postgresql://u:${secret}@127.0.0.1:59998/dbname`,
  };
  const outHot = execFileSync(
    process.execPath,
    [pathJoin(root, 'scripts', 'saas-db-postgres-go-no-go.mjs'), '--format=json'],
    { cwd: root, encoding: 'utf8', env: hotEnv },
  );
  if (outHot.includes(secret)) fail('leak: hot env password in go/no-go JSON');
  const j1 = JSON.parse(outHot);
  if (j1.overall_status !== 'no_go') fail('strict env must remain no_go (probe OK is insufficient)');
  const br1 = j1.blocking_reasons;
  for (const code of [
    'postgres_client_runtime_not_wired',
    'postgres_ledger_persistence_not_wired',
    'postgres_migration_execution_not_wired',
  ]) {
    if (!br1.includes(code)) fail(`hot env missing blocker ${code}`);
  }

  const code = `
    (async () => {
      const { evaluatePostgresGoNoGo } = require(${JSON.stringify(adapterIndex)});
      const r = await evaluatePostgresGoNoGo();
      if (r.checks.length < 8) process.exit(200);
      process.exit(0);
    })().catch((e) => { console.error(e); process.exit(1); });
  `;
  execFileSync(process.execPath, ['-e', code], { cwd: root, encoding: 'utf8', env: base });

  await runVerifyScript('verify-saas-db-postgres-readiness.mjs');
  await runVerifyScript('verify-saas-db-postgres-config.mjs');
  await runVerifyScript('verify-saas-db-postgres-probe-gate.mjs');

  console.log('verify-saas-db-postgres-go-no-go: ok');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
