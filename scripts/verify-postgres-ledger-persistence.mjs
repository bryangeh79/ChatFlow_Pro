/**
 * Phase 24 — controlled reachability verification for runtime_wired + ledger_ready.
 * Default chain (no controlled flag): must remain NO_GO and never require local PG.
 * Controlled chain: set CHATFLOW_SAAS_POSTGRES_CONTROLLED_VERIFY=1 (+ URL) to validate
 * runtime_wired + ledger_info.status=ready in a prepared PG environment.
 */

import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join as pathJoin } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = pathJoin(__dirname, '..');
const require = createRequire(import.meta.url);

const adapterIndex = pathJoin(root, 'dist', 'src', 'saas', 'db-adapter', 'index.js');
const migrationsIndex = pathJoin(root, 'dist', 'src', 'saas', 'db-migrations', 'index.js');
const poolPath = pathJoin(root, 'dist', 'src', 'saas', 'db-adapter', 'postgres-pool.js');

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
  delete e.CHATFLOW_SAAS_POSTGRES_LEDGER_INTEGRATION;
  delete e.CHATFLOW_SAAS_POSTGRES_CONTROLLED_VERIFY;
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
        ledger_persistence_wired: r.ledger_persistence_wired,
        ledger_status: r.ledger_info.status,
        ledger_exists: r.ledger_info.exists,
        execution_wired: r.execution_wired,
        controlled_reachability: r.controlled_reachability,
        reachability_basis: r.reachability_basis,
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
      console.log(JSON.stringify({ overall_status: r.overall_status, blocking_reasons: r.blocking_reasons }));
    })().catch((e) => { console.error(e); process.exit(1); });
  `;
  const out = execFileSync(process.execPath, ['-e', code], { cwd: root, encoding: 'utf8', env });
  return JSON.parse(out.trim().split('\n').pop());
}

async function maybeControlledReachability() {
  if (process.env.CHATFLOW_SAAS_POSTGRES_CONTROLLED_VERIFY !== '1') {
    console.log('verify-postgres-ledger-persistence: controlled_reachability_skip (flag_off)');
    return;
  }

  const url = process.env.CHATFLOW_SAAS_POSTGRES_URL;
  if (!url || typeof url !== 'string' || !url.trim()) {
    console.log('verify-postgres-ledger-persistence: controlled_reachability_skip (no_postgres_url)');
    return;
  }

  const env = {
    ...scrub(process.env),
    CHATFLOW_SAAS_DB_DRIVER: 'postgres',
    CHATFLOW_SAAS_POSTGRES_CLIENT: '1',
    CHATFLOW_SAAS_POSTGRES_URL: url,
  };

  const snap = execReadiness(env);
  if (!snap.postgres_client_runtime_wired) {
    console.log('verify-postgres-ledger-persistence: controlled_reachability_skip (runtime_unwired)');
    return;
  }
  if (snap.ledger_status !== 'ready') {
    console.log(
      `verify-postgres-ledger-persistence: controlled_reachability_skip (ledger_status=${snap.ledger_status}; need pg_0003 applied manually)`,
    );
    return;
  }
  if (!snap.ledger_persistence_wired) fail('integration: ready ledger must set ledger_persistence_wired');
  if (snap.controlled_reachability !== 'postgres_runtime_wired_ledger_ready') {
    fail('controlled_reachability must be postgres_runtime_wired_ledger_ready');
  }
  if (!String(snap.reachability_basis || '').includes('does not imply GO')) {
    fail('reachability_basis should remind overall_go_not_implied');
  }

  const code = `
    (async () => {
      const { PostgresSaasMigrationLedger } = require(${JSON.stringify(migrationsIndex)});
      const { getSharedSaaSPostgresPool } = require(${JSON.stringify(poolPath)});
      const L = new PostgresSaasMigrationLedger();
      const testId = '__verify_chatflow_ledger_rw__';
      const checksum = '0'.repeat(64);
      const ts = new Date().toISOString();
      await L.recordAppliedMigration({
        migration_id: testId,
        driver: 'postgres',
        checksum_sha256: checksum,
        applied_at: ts,
      });
      const rows = await L.listAppliedMigrations();
      const hit = rows.find((r) => r.migration_id === testId);
      if (!hit || hit.checksum_sha256 !== checksum) process.exit(30);
      const pool = await getSharedSaaSPostgresPool();
      if (!pool) process.exit(31);
      await pool.query('DELETE FROM saas_schema_migrations WHERE migration_id = $1', [testId]);
      process.exit(0);
    })().catch((e) => { console.error(e); process.exit(1); });
  `;
  execFileSync(process.execPath, ['-e', code], { cwd: root, encoding: 'utf8', env, stdio: 'inherit' });
  const g = execGoNoGo(env);
  if (g.overall_status === 'go') fail('controlled chain must not imply automatic GO');
  console.log('verify-postgres-ledger-persistence: controlled_reachability_ok');
  console.log('verify-postgres-ledger-persistence: overall_go_not_implied');
}

async function main() {
  const base = scrub(process.env);

  const d0 = execReadiness(base);
  if (d0.driver !== 'sqljs') fail('default driver sqljs');
  if (d0.ledger_persistence_wired !== false) fail('default ledger_persistence_wired false');
  if (d0.ledger_status !== 'not_wired') fail('default ledger_status not_wired');
  if (d0.controlled_reachability !== 'default_path_no_postgres') fail('default controlled_reachability');
  const g0 = execGoNoGo(base);
  if (g0.overall_status !== 'no_go') fail('default go/no-go no_go');
  if (!g0.blocking_reasons.includes('postgres_ledger_persistence_not_wired')) fail('default missing ledger blocker');
  console.log('verify-postgres-ledger-persistence: default_no_go_ok');

  const eBad = {
    ...base,
    CHATFLOW_SAAS_DB_DRIVER: 'postgres',
    CHATFLOW_SAAS_POSTGRES_CLIENT: '1',
    CHATFLOW_SAAS_POSTGRES_URL: 'postgresql://u:p@127.0.0.1:59996/nope',
  };
  const d1 = execReadiness(eBad);
  if (d1.postgres_client_runtime_wired !== false) fail('dead PG: runtime unwired');
  if (d1.ledger_persistence_wired !== false) fail('dead PG: ledger not wired');
  if (d1.ledger_status !== 'not_wired') fail('dead PG: ledger status stays not_wired when runtime false');
  if (d1.controlled_reachability !== 'postgres_runtime_unwired') fail('dead PG: controlled_reachability');
  const g1 = execGoNoGo(eBad);
  if (g1.overall_status !== 'no_go') fail('dead PG: still no_go');

  await maybeControlledReachability();

  console.log('verify-postgres-ledger-persistence: ok');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
