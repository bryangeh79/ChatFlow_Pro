/**
 * Phase 24 — controlled PG integration probe for runtime_wired hard-gate branches.
 *
 * This script is optional and intentionally NOT part of default verify chain.
 * It validates controlled branch semantics only:
 * - controlled_runtime_wired_ok
 * - controlled_runtime_wired_hard_fail (via test-only injection in this script)
 */

import { execFileSync } from 'node:child_process';
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
  delete e.CHATFLOW_SAAS_POSTGRES_CONTROLLED_VERIFY;
  delete e.CHATFLOW_SAAS_RUNTIME_WIRED_TEST_INJECT_HARD_FAIL;
  return e;
}

function execReadiness(env) {
  const code = `
    (async () => {
      const { getPostgresExecutionReadiness } = require(${JSON.stringify(adapterIndex)});
      const r = await getPostgresExecutionReadiness();
      console.log(JSON.stringify({
        driver: r.driver,
        postgres_client_runtime_wired: r.postgres_client_runtime_wired,
        connection_config_valid: r.connection_config_valid,
        postgres_probe_status: r.postgres_probe_status,
      }));
    })().catch((e) => { console.error(e); process.exit(1); });
  `;
  const out = execFileSync(process.execPath, ['-e', code], { cwd: root, encoding: 'utf8', env });
  return JSON.parse(out.trim().split('\n').pop());
}

function execGoNoGo(env) {
  const code = `
    (async () => {
      const { evaluatePostgresGoNoGo } = require(${JSON.stringify(adapterIndex)});
      const r = await evaluatePostgresGoNoGo();
      console.log(JSON.stringify({ overall_status: r.overall_status }));
    })().catch((e) => { console.error(e); process.exit(1); });
  `;
  const out = execFileSync(process.execPath, ['-e', code], { cwd: root, encoding: 'utf8', env });
  return JSON.parse(out.trim().split('\n').pop());
}

function main() {
  const base = scrub(process.env);
  if (process.env.CHATFLOW_SAAS_POSTGRES_CONTROLLED_VERIFY !== '1') {
    console.log('verify-postgres-runtime-wired-controlled-integration: controlled_runtime_wired_skip(flag_off)');
    return;
  }
  const url = process.env.CHATFLOW_SAAS_POSTGRES_URL;
  if (!url || typeof url !== 'string' || !url.trim()) {
    console.log('verify-postgres-runtime-wired-controlled-integration: controlled_runtime_wired_skip(no_postgres_url)');
    return;
  }

  const env = {
    ...base,
    CHATFLOW_SAAS_DB_DRIVER: 'postgres',
    CHATFLOW_SAAS_POSTGRES_CLIENT: '1',
    CHATFLOW_SAAS_POSTGRES_URL: url,
  };
  const snap = execReadiness(env);
  if (!snap.connection_config_valid || snap.postgres_probe_status !== 'probe_connect_ok') {
    console.log(
      `verify-postgres-runtime-wired-controlled-integration: controlled_runtime_wired_skip(preconditions_not_met:config_valid=${snap.connection_config_valid};probe_status=${snap.postgres_probe_status})`,
    );
    return;
  }

  const injectedHardFail = process.env.CHATFLOW_SAAS_RUNTIME_WIRED_TEST_INJECT_HARD_FAIL === '1';
  if (injectedHardFail) {
    console.log('verify-postgres-runtime-wired-controlled-integration: controlled_runtime_wired_hard_fail');
    console.log('verify-postgres-runtime-wired-controlled-integration: overall_go_not_implied');
    process.exit(1);
  }

  if (snap.postgres_client_runtime_wired !== true) {
    console.log('verify-postgres-runtime-wired-controlled-integration: controlled_runtime_wired_hard_fail');
    console.log('verify-postgres-runtime-wired-controlled-integration: overall_go_not_implied');
    fail('controlled preconditions satisfied but postgres_client_runtime_wired is not true');
  }

  const g = execGoNoGo(env);
  if (g.overall_status === 'go') fail('controlled validation must not imply automatic GO');
  console.log('verify-postgres-runtime-wired-controlled-integration: controlled_runtime_wired_ok');
  console.log('verify-postgres-runtime-wired-controlled-integration: overall_go_not_implied');
  console.log('verify-postgres-runtime-wired-controlled-integration: ok');
}

main();
