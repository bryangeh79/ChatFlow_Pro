/**
 * Phase 24 / 2L — optional postgres TCP probe gate (no requirement for live DB).
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

function scrubSaasPostgresEnv(base) {
  const e = { ...base };
  for (const k of Object.keys(e)) {
    if (k.startsWith('CHATFLOW_SAAS_POSTGRES')) delete e[k];
  }
  delete e.CHATFLOW_SAAS_POSTGRES_CLIENT;
  delete e.CHATFLOW_SAAS_POSTGRES_PROBE;
  delete e.CHATFLOW_SAAS_DB_DRIVER;
  return e;
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
  const base = scrubSaasPostgresEnv(process.env);

  const defaultProbeCode = `
    (async () => {
      const { getPostgresExecutionReadiness } = require(${JSON.stringify(adapterIndex)});
      const r = await getPostgresExecutionReadiness();
      if (r.postgres_probe_enabled !== false) process.exit(120);
      if (r.postgres_probe_attempted !== false) process.exit(121);
      if (r.postgres_probe_status !== 'skipped_gate_off') process.exit(122);
      process.exit(0);
    })().catch((e) => { console.error(e); process.exit(1); });
  `;
  try {
    runNodeEval(defaultProbeCode, base);
  } catch (e) {
    fail(`default probe off: ${e?.message || e}`);
  }

  let invalidThrew = false;
  try {
    runNodeEval(
      `require(${JSON.stringify(adapterIndex)}).isPostgresProbeEnabled();`,
      { ...base, CHATFLOW_SAAS_POSTGRES_PROBE: '2' },
    );
  } catch {
    invalidThrew = true;
  }
  if (!invalidThrew) fail('invalid CHATFLOW_SAAS_POSTGRES_PROBE must throw');

  const sqljsDriverCode = `
    (async () => {
      const { getPostgresExecutionReadiness } = require(${JSON.stringify(adapterIndex)});
      const r = await getPostgresExecutionReadiness();
      if (r.postgres_probe_status !== 'skipped_driver_not_postgres') process.exit(130);
      process.exit(0);
    })().catch((e) => { console.error(e); process.exit(1); });
  `;
  try {
    runNodeEval(sqljsDriverCode, {
      ...base,
      CHATFLOW_SAAS_DB_DRIVER: 'sqljs',
      CHATFLOW_SAAS_POSTGRES_CLIENT: '1',
      CHATFLOW_SAAS_POSTGRES_PROBE: '1',
    });
  } catch (e) {
    fail(`sqljs driver skip: ${e?.message || e}`);
  }

  const badConfigCode = `
    (async () => {
      const { getPostgresExecutionReadiness } = require(${JSON.stringify(adapterIndex)});
      const r = await getPostgresExecutionReadiness();
      if (r.postgres_probe_status !== 'skipped_invalid_config') process.exit(140);
      process.exit(0);
    })().catch((e) => { console.error(e); process.exit(1); });
  `;
  try {
    runNodeEval(badConfigCode, {
      ...base,
      CHATFLOW_SAAS_DB_DRIVER: 'postgres',
      CHATFLOW_SAAS_POSTGRES_CLIENT: '1',
      CHATFLOW_SAAS_POSTGRES_PROBE: '1',
    });
  } catch (e) {
    fail(`invalid config skip: ${e?.message || e}`);
  }

  const clientGateOffCode = `
    (async () => {
      const { getPostgresExecutionReadiness } = require(${JSON.stringify(adapterIndex)});
      const r = await getPostgresExecutionReadiness();
      if (r.postgres_probe_status !== 'skipped_gate_off') process.exit(145);
      if (!r.postgres_probe_message.includes('POSTGRES_CLIENT')) process.exit(146);
      process.exit(0);
    })().catch((e) => { console.error(e); process.exit(1); });
  `;
  try {
    runNodeEval(clientGateOffCode, {
      ...base,
      CHATFLOW_SAAS_DB_DRIVER: 'postgres',
      CHATFLOW_SAAS_POSTGRES_URL: 'postgresql://a:b@127.0.0.1:5432/db',
      CHATFLOW_SAAS_POSTGRES_PROBE: '1',
    });
  } catch (e) {
    fail(`client gate off skip: ${e?.message || e}`);
  }

  const secret = 'probe_secret_pw_xyz';
  const leakEnv = {
    ...base,
    CHATFLOW_SAAS_DB_DRIVER: 'postgres',
    CHATFLOW_SAAS_POSTGRES_CLIENT: '1',
    CHATFLOW_SAAS_POSTGRES_PROBE: '1',
    CHATFLOW_SAAS_POSTGRES_URL: `postgresql://u:${secret}@127.0.0.1:59999/nosuchdb`,
  };
  const out = execFileSync(
    process.execPath,
    [pathJoin(root, 'scripts', 'saas-db-postgres-readiness.mjs'), '--format=json'],
    { cwd: root, encoding: 'utf8', env: leakEnv },
  );
  if (out.includes(secret)) fail('readiness JSON leaked raw password');
  const j = JSON.parse(out);
  if (typeof j.readiness?.postgres_probe_status !== 'string') fail('CLI probe status');
  if (j.readiness.postgres_probe_attempted !== true) fail('expected probe attempted with valid config + gates');
  if (!['probe_connect_ok', 'probe_connect_failed'].includes(j.readiness.postgres_probe_status)) {
    fail(`expected connect outcome, got ${j.readiness.postgres_probe_status}`);
  }
  const pm = String(j.readiness.postgres_probe_message);
  if (pm.includes(secret)) fail('probe message leaked password');

  await runVerifyScript('verify-saas-db-postgres-config.mjs');

  console.log('verify-saas-db-postgres-probe-gate: ok');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
