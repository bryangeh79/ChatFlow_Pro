/**
 * Phase 24 / 2I — postgres client feature gate (no `pg` dependency).
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

function runVerifyReadiness() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [pathJoin(root, 'scripts', 'verify-saas-db-postgres-readiness.mjs')], {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env },
    });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`verify-saas-db-postgres-readiness exited ${code}`))));
  });
}

async function main() {
  const pkg = JSON.parse(readFileSync(pathJoin(root, 'package.json'), 'utf8'));
  if (pkg.dependencies && Object.prototype.hasOwnProperty.call(pkg.dependencies, 'pg')) fail('package.json must not depend on pg');
  if (pkg.devDependencies && Object.prototype.hasOwnProperty.call(pkg.devDependencies, 'pg')) fail('package.json devDependencies must not include pg');

  const envGateOff = { ...process.env };
  delete envGateOff.CHATFLOW_SAAS_POSTGRES_CLIENT;

  const offCode = `
    const r = require(${JSON.stringify(adapterIndex)});
    if (r.isPostgresClientEnabled() !== false) process.exit(10);
    const rd = r.getPostgresExecutionReadiness();
    if (rd.postgres_client_gate_enabled !== false) process.exit(11);
    if (rd.postgres_client_runtime_wired !== false) process.exit(12);
    process.exit(0);
  `;
  try {
    runNodeEval(offCode, envGateOff);
  } catch (e) {
    fail(`gate off subprocess failed: ${e?.message || e}`);
  }

  const onCode = `
    const r = require(${JSON.stringify(adapterIndex)});
    if (r.isPostgresClientEnabled() !== true) process.exit(20);
    const rd = r.getPostgresExecutionReadiness();
    if (rd.postgres_client_gate_enabled !== true) process.exit(21);
    if (rd.postgres_client_runtime_wired !== false) process.exit(22);
    process.exit(0);
  `;
  const envGateOn = { ...process.env, CHATFLOW_SAAS_POSTGRES_CLIENT: '1' };
  try {
    runNodeEval(onCode, envGateOn);
  } catch (e) {
    fail(`gate on subprocess failed: ${e?.message || e}`);
  }

  const cliOut = execFileSync(
    process.execPath,
    [pathJoin(root, 'scripts', 'saas-db-postgres-readiness.mjs'), '--format=json'],
    { cwd: root, encoding: 'utf8', env: envGateOff },
  );
  let j;
  try {
    j = JSON.parse(cliOut);
  } catch {
    fail('readiness CLI json parse failed');
  }
  if (typeof j.postgres_client_gate_enabled !== 'boolean') fail('CLI missing postgres_client_gate_enabled');
  if (j.postgres_client_runtime_wired !== false) fail('CLI postgres_client_runtime_wired must be false');
  if (!j.postgres_client_gate) fail('CLI missing postgres_client_gate block');

  let invalidThrew = false;
  try {
    const badCode = `
      const r = require(${JSON.stringify(adapterIndex)});
      r.isPostgresClientEnabled();
      process.exit(0);
    `;
    runNodeEval(badCode, { ...process.env, CHATFLOW_SAAS_POSTGRES_CLIENT: '2' });
  } catch {
    invalidThrew = true;
  }
  if (!invalidThrew) fail('invalid CHATFLOW_SAAS_POSTGRES_CLIENT must fail fast');

  await runVerifyReadiness();

  console.log('verify-saas-db-postgres-client-gate: ok');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
