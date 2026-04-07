/**
 * Phase 24 / 2C — CHATFLOW_SAAS_DB_DRIVER selection + Postgres stub (no pg client).
 * Requires: npm run build
 */

import { spawn } from 'node:child_process';
import { dirname, join as pathJoin } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = pathJoin(__dirname, '..');
const casesScript = pathJoin(__dirname, 'verify-saas-db-adapter-selection-cases.mjs');

function runCase(name) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    const child = spawn(process.execPath, [casesScript, name], {
      cwd: root,
      env,
      stdio: 'inherit',
    });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`case ${name} exit ${code}`))));
  });
}

async function main() {
  for (const c of ['default', 'sqljs', 'postgres', 'invalid']) {
    await runCase(c);
  }

  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [pathJoin(root, 'scripts', 'verify-saas-sqljs-adapter-principals.mjs')], {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env },
    });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('verify-saas-sqljs-adapter-principals failed'))));
  });

  console.log('verify-saas-db-adapter-selection: ok');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
