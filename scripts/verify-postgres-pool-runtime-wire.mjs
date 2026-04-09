/**
 * Phase 24 — shared Pool + runtime_wired semantics (no live PG required).
 * Requires: npm run build
 *
 * Optional live check (manual): set DRIVER=postgres, CLIENT=1, valid POSTGRES_URL, run
 * `node -e "require('./dist/...').getPostgresExecutionReadiness().then(console.log)"` —
 * expect runtime_wired true; `evaluatePostgresGoNoGo()` must still be no_go.
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
        adapter_stub: r.adapter_stub,
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
      console.log(JSON.stringify({
        overall_status: r.overall_status,
        blocking_reasons: r.blocking_reasons,
      }));
    })().catch((e) => { console.error(e); process.exit(1); });
  `;
  const out = execFileSync(process.execPath, ['-e', code], { cwd: root, encoding: 'utf8', env });
  return JSON.parse(out.trim().split('\n').pop());
}

function maybeControlledRuntimeWiredGate(base) {
  if (process.env.CHATFLOW_SAAS_POSTGRES_CONTROLLED_VERIFY !== '1') {
    console.log('verify-postgres-pool-runtime-wire: controlled_runtime_wired_skip(flag_off)');
    return;
  }
  const url = process.env.CHATFLOW_SAAS_POSTGRES_URL;
  if (!url || typeof url !== 'string' || !url.trim()) {
    console.log('verify-postgres-pool-runtime-wire: controlled_runtime_wired_skip(no_postgres_url)');
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
      `verify-postgres-pool-runtime-wire: controlled_runtime_wired_skip(preconditions_not_met:config_valid=${snap.connection_config_valid};probe_status=${snap.postgres_probe_status})`,
    );
    return;
  }
  if (snap.postgres_client_runtime_wired !== true) {
    console.log('verify-postgres-pool-runtime-wire: controlled_runtime_wired_hard_fail');
    fail('controlled preconditions met but postgres_client_runtime_wired is not true');
  }

  const g = execGoNoGo(env);
  if (g.overall_status === 'go') fail('controlled runtime_wired success must not imply overall GO');
  console.log('verify-postgres-pool-runtime-wire: controlled_runtime_wired_ok');
  console.log('verify-postgres-pool-runtime-wire: overall_go_not_implied');
}

function main() {
  const base = scrub(process.env);

  const r0 = execReadiness(base);
  if (r0.driver !== 'postgres') fail('default driver must be postgres');
  if (r0.postgres_client_runtime_wired !== false) fail('default runtime_wired must be false');
  if (r0.adapter_stub !== true) fail('default adapter_stub must be true');
  const g0 = execGoNoGo(base);
  if (g0.overall_status !== 'no_go') fail('default go/no-go must be no_go');
  console.log('verify-postgres-pool-runtime-wire: default_no_go_ok');

  const e1 = {
    ...base,
    CHATFLOW_SAAS_DB_DRIVER: 'postgres',
    CHATFLOW_SAAS_POSTGRES_CLIENT: '0',
  };
  const r1 = execReadiness(e1);
  if (r1.postgres_client_runtime_wired !== false) fail('postgres driver + gate off: runtime_wired false');
  if (r1.adapter_stub !== true) fail('postgres driver + gate off: adapter stub');
  const g1 = execGoNoGo(e1);
  if (g1.overall_status !== 'no_go') fail('gate off: must stay no_go');

  const e2 = {
    ...base,
    CHATFLOW_SAAS_DB_DRIVER: 'postgres',
    CHATFLOW_SAAS_POSTGRES_CLIENT: '1',
    CHATFLOW_SAAS_POSTGRES_URL: 'postgresql://u:p@127.0.0.1:59997/nope',
  };
  const r2 = execReadiness(e2);
  if (r2.postgres_client_runtime_wired !== false) fail('unreachable PG: runtime_wired must stay false');
  if (r2.adapter_stub !== true) fail('unreachable PG: adapter_stub true');
  const g2 = execGoNoGo(e2);
  if (g2.overall_status !== 'no_go') fail('unreachable PG: overall must stay no_go');
  if (!g2.blocking_reasons.includes('postgres_client_runtime_not_wired')) {
    fail('unreachable PG: expect runtime_not_wired blocker');
  }

  maybeControlledRuntimeWiredGate(base);
  console.log('verify-postgres-pool-runtime-wire: ok');
}

main();
