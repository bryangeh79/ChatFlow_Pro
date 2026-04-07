/**
 * Phase 24 / 2K — postgres connection env / DSN validation stub (no connect).
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

function scrubPostgresEnv(base) {
  const e = { ...base };
  for (const k of Object.keys(e)) {
    if (k.startsWith('CHATFLOW_SAAS_POSTGRES')) delete e[k];
  }
  delete e.CHATFLOW_SAAS_POSTGRES_CLIENT;
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
  const base = scrubPostgresEnv(process.env);

  const missingCode = `
    (async () => {
      const { loadPostgresConnectionConfig, getPostgresExecutionReadiness } = require(${JSON.stringify(adapterIndex)});
      const c = loadPostgresConnectionConfig();
      if (c.source !== 'missing' || c.valid !== false) process.exit(50);
      const r = await getPostgresExecutionReadiness();
      if (r.connection_config_present !== false || r.connection_config_valid !== false || r.connection_config_source !== 'missing') process.exit(51);
      process.exit(0);
    })().catch((e) => { console.error(e); process.exit(1); });
  `;
  try {
    runNodeEval(missingCode, base);
  } catch (e) {
    fail(`missing config: ${e?.message || e}`);
  }

  const secret = 'super_secret_pw_99';
  const urlEnv = {
    ...base,
    CHATFLOW_SAAS_POSTGRES_URL: `postgresql://appuser:${secret}@db.example.test:5432/appdb?sslmode=require`,
  };
  const urlCode = `
    (async () => {
      const { loadPostgresConnectionConfig, redactPostgresConnectionString, getPostgresExecutionReadiness } = require(${JSON.stringify(adapterIndex)});
      const raw = process.env.CHATFLOW_SAAS_POSTGRES_URL;
      const c = loadPostgresConnectionConfig();
      if (c.source !== 'url' || !c.valid) process.exit(60);
      if (c.host !== 'db.example.test' || c.port !== 5432 || c.database !== 'appdb' || c.user !== 'appuser' || c.ssl_enabled !== true) process.exit(61);
      if (!c.redacted_url || c.redacted_url.includes('super_secret')) process.exit(62);
      const rd = redactPostgresConnectionString(raw);
      if (rd.includes('super_secret')) process.exit(63);
      const r = await getPostgresExecutionReadiness();
      if (r.connection_config_source !== 'url' || !r.connection_config_present || !r.connection_config_valid) process.exit(64);
      process.exit(0);
    })().catch((e) => { console.error(e); process.exit(1); });
  `;
  try {
    runNodeEval(urlCode, urlEnv);
  } catch (e) {
    fail(`url mode: ${e?.message || e}`);
  }

  const fieldsEnv = scrubPostgresEnv(process.env);
  Object.assign(fieldsEnv, {
    CHATFLOW_SAAS_POSTGRES_HOST: 'pghost.local',
    CHATFLOW_SAAS_POSTGRES_PORT: '5433',
    CHATFLOW_SAAS_POSTGRES_DB: 'mydb',
    CHATFLOW_SAAS_POSTGRES_USER: 'u1',
    CHATFLOW_SAAS_POSTGRES_PASSWORD: 'hidden',
    CHATFLOW_SAAS_POSTGRES_SSL: '1',
  });
  const fieldsCode = `
    (async () => {
      const { loadPostgresConnectionConfig, getPostgresExecutionReadiness } = require(${JSON.stringify(adapterIndex)});
      const c = loadPostgresConnectionConfig();
      if (c.source !== 'fields' || !c.valid) process.exit(70);
      if (c.host !== 'pghost.local' || c.port !== 5433 || c.database !== 'mydb' || c.user !== 'u1' || c.ssl_enabled !== true) process.exit(71);
      if (!c.redacted_url || !c.redacted_url.includes('REDACTED') || c.redacted_url.includes('hidden')) process.exit(72);
      const r = await getPostgresExecutionReadiness();
      if (!r.connection_config_valid || r.connection_config_source !== 'fields') process.exit(73);
      process.exit(0);
    })().catch((e) => { console.error(e); process.exit(1); });
  `;
  try {
    runNodeEval(fieldsCode, fieldsEnv);
  } catch (e) {
    fail(`fields mode: ${e?.message || e}`);
  }

  const badPortEnv = scrubPostgresEnv(process.env);
  Object.assign(badPortEnv, {
    CHATFLOW_SAAS_POSTGRES_HOST: 'h',
    CHATFLOW_SAAS_POSTGRES_PORT: '99999',
    CHATFLOW_SAAS_POSTGRES_DB: 'd',
    CHATFLOW_SAAS_POSTGRES_USER: 'u',
  });
  const badPortCode = `
    (async () => {
      const { loadPostgresConnectionConfig, getPostgresExecutionReadiness } = require(${JSON.stringify(adapterIndex)});
      const c = loadPostgresConnectionConfig();
      if (c.source !== 'fields' || c.valid !== false) process.exit(80);
      const r = await getPostgresExecutionReadiness();
      if (r.connection_config_valid !== false) process.exit(81);
      process.exit(0);
    })().catch((e) => { console.error(e); process.exit(1); });
  `;
  try {
    runNodeEval(badPortCode, badPortEnv);
  } catch (e) {
    fail(`bad port: ${e?.message || e}`);
  }

  const noHostEnv = scrubPostgresEnv(process.env);
  Object.assign(noHostEnv, {
    CHATFLOW_SAAS_POSTGRES_DB: 'd',
    CHATFLOW_SAAS_POSTGRES_USER: 'u',
  });
  const noHostCode = `
    (async () => {
      const { loadPostgresConnectionConfig } = require(${JSON.stringify(adapterIndex)});
      const c = loadPostgresConnectionConfig();
      if (c.source !== 'fields' || c.valid !== false) process.exit(90);
      process.exit(0);
    })().catch((e) => { console.error(e); process.exit(1); });
  `;
  try {
    runNodeEval(noHostCode, noHostEnv);
  } catch (e) {
    fail(`no host: ${e?.message || e}`);
  }

  const noUserEnv = scrubPostgresEnv(process.env);
  Object.assign(noUserEnv, {
    CHATFLOW_SAAS_POSTGRES_HOST: 'h',
    CHATFLOW_SAAS_POSTGRES_DB: 'd',
  });
  const noUserCode = `
    (async () => {
      const { loadPostgresConnectionConfig } = require(${JSON.stringify(adapterIndex)});
      const c = loadPostgresConnectionConfig();
      if (c.source !== 'fields' || c.valid !== false) process.exit(91);
      process.exit(0);
    })().catch((e) => { console.error(e); process.exit(1); });
  `;
  try {
    runNodeEval(noUserCode, noUserEnv);
  } catch (e) {
    fail(`no user: ${e?.message || e}`);
  }

  const urlPriorityEnv = scrubPostgresEnv(process.env);
  Object.assign(urlPriorityEnv, {
    CHATFLOW_SAAS_POSTGRES_URL: 'postgresql://a:b@c.test:5432/dbname',
    CHATFLOW_SAAS_POSTGRES_HOST: 'ignored-host',
    CHATFLOW_SAAS_POSTGRES_DB: 'ignored',
    CHATFLOW_SAAS_POSTGRES_USER: 'ignored',
  });
  const priorityCode = `
    (async () => {
      const { loadPostgresConnectionConfig } = require(${JSON.stringify(adapterIndex)});
      const c = loadPostgresConnectionConfig();
      if (c.source !== 'url' || c.host !== 'c.test') process.exit(100);
      process.exit(0);
    })().catch((e) => { console.error(e); process.exit(1); });
  `;
  try {
    runNodeEval(priorityCode, urlPriorityEnv);
  } catch (e) {
    fail(`url priority: ${e?.message || e}`);
  }

  const badSslEnv = scrubPostgresEnv(process.env);
  Object.assign(badSslEnv, {
    CHATFLOW_SAAS_POSTGRES_HOST: 'h',
    CHATFLOW_SAAS_POSTGRES_DB: 'd',
    CHATFLOW_SAAS_POSTGRES_USER: 'u',
    CHATFLOW_SAAS_POSTGRES_SSL: 'yes',
  });
  const badSslCode = `
    (async () => {
      const { loadPostgresConnectionConfig } = require(${JSON.stringify(adapterIndex)});
      const c = loadPostgresConnectionConfig();
      if (c.source !== 'fields' || c.valid !== false) process.exit(110);
      process.exit(0);
    })().catch((e) => { console.error(e); process.exit(1); });
  `;
  try {
    runNodeEval(badSslCode, badSslEnv);
  } catch (e) {
    fail(`bad ssl env: ${e?.message || e}`);
  }

  const cliOut = execFileSync(
    process.execPath,
    [pathJoin(root, 'scripts', 'saas-db-postgres-readiness.mjs'), '--format=json'],
    { cwd: root, encoding: 'utf8', env: scrubPostgresEnv(process.env) },
  );
  const j = JSON.parse(cliOut);
  if (typeof j.readiness?.connection_config_present !== 'boolean') fail('readiness CLI connection fields');
  if (j.readiness.postgres_client_runtime_wired !== false) fail('runtime must stay unwired');

  await runVerifyScript('verify-saas-db-postgres-client-loader.mjs');

  console.log('verify-saas-db-postgres-config: ok');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
