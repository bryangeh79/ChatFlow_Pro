/**
 * Phase 24 — tenant_settings read-path adapterization verification.
 */

import { spawn } from 'node:child_process';
import { dirname, join as pathJoin } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = pathJoin(__dirname, '..');
const casesScript = pathJoin(__dirname, 'verify-tenant-settings-read-path-cases.mjs');

function scrub(base) {
  const e = { ...base };
  for (const k of Object.keys(e)) {
    if (k.startsWith('CHATFLOW_SAAS_POSTGRES')) delete e[k];
  }
  delete e.CHATFLOW_SAAS_POSTGRES_CLIENT;
  delete e.CHATFLOW_SAAS_DB_DRIVER;
  delete e.CHATFLOW_SAAS_POSTGRES_CONTROLLED_VERIFY;
  return e;
}

function runCase(name, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [casesScript, name], {
      cwd: root,
      env,
      stdio: 'inherit',
    });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`case ${name} exit ${code}`))));
  });
}

async function main() {
  await runCase('sqljs-default', { ...scrub(process.env), CHATFLOW_SAAS_DB_DRIVER: 'sqljs' });
  await runCase('runtime-unwired', {
    ...scrub(process.env),
    CHATFLOW_SAAS_DB_DRIVER: 'postgres',
    CHATFLOW_SAAS_POSTGRES_CLIENT: '1',
    CHATFLOW_SAAS_POSTGRES_URL: 'postgresql://u:p@127.0.0.1:59995/nope',
  });
  console.log('verify-tenant-settings-read-path: default_no_go_ok');
  if (process.env.CHATFLOW_SAAS_POSTGRES_CONTROLLED_VERIFY === '1' && String(process.env.CHATFLOW_SAAS_POSTGRES_URL || '').trim()) {
    await runCase('controlled', {
      ...scrub(process.env),
      CHATFLOW_SAAS_DB_DRIVER: 'postgres',
      CHATFLOW_SAAS_POSTGRES_CLIENT: '1',
      CHATFLOW_SAAS_POSTGRES_URL: String(process.env.CHATFLOW_SAAS_POSTGRES_URL),
    });
  } else {
    console.log('verify-tenant-settings-read-path: controlled_skip(flag_or_url_missing)');
  }
  console.log('verify-tenant-settings-read-path: ok');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
