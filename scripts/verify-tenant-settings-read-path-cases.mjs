import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, join as pathJoin } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = pathJoin(__dirname, '..');
const require = createRequire(import.meta.url);
const repoPath = pathJoin(root, 'dist', 'src', 'saas', 'repository.js');
const dbPath = pathJoin(root, 'dist', 'src', 'saas', 'db.js');
const adapterPath = pathJoin(root, 'dist', 'src', 'saas', 'db-adapter', 'index.js');
const poolPath = pathJoin(root, 'dist', 'src', 'saas', 'db-adapter', 'postgres-pool.js');

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

async function runSqljsDefaultCase() {
  const { getSaaSDatabase } = require(dbPath);
  const { getTenantSettingsJson } = require(repoPath);
  const id = `verify_tenant_settings_${Date.now()}`;
  const slug = `verify-slug-${Date.now()}`;
  const db = await getSaaSDatabase();
  db.run('INSERT INTO tenants (id, slug, name) VALUES (?, ?, ?)', [id, slug, 'verify']);
  db.run('INSERT OR REPLACE INTO tenant_settings (tenant_id, settings_json, updated_at) VALUES (?, ?, datetime(\'now\'))', [
    id,
    JSON.stringify({ feature: true }),
  ]);

  const a = await getTenantSettingsJson(id);
  assert(a.feature === true, 'sqljs existing row read mismatch');

  const b = await getTenantSettingsJson(`${id}_missing`);
  assert(Object.keys(b).length === 0, 'sqljs missing row should fallback {}');

  db.run('UPDATE tenant_settings SET settings_json = ? WHERE tenant_id = ?', ['{bad-json', id]);
  const c = await getTenantSettingsJson(id);
  assert(Object.keys(c).length === 0, 'sqljs bad json should fallback {}');

  db.run('UPDATE tenant_settings SET settings_json = ? WHERE tenant_id = ?', [JSON.stringify([1, 2, 3]), id]);
  const d = await getTenantSettingsJson(id);
  assert(Object.keys(d).length === 0, 'sqljs non-object should fallback {}');

  db.run('DELETE FROM tenant_settings WHERE tenant_id = ?', [id]);
  db.run('DELETE FROM tenants WHERE id = ?', [id]);
}

async function runRuntimeUnwiredCase() {
  const { getTenantSettingsJson } = require(repoPath);
  const { getPostgresExecutionReadiness } = require(adapterPath);
  let threw = false;
  try {
    await getTenantSettingsJson('runtime_unwired_case');
  } catch (e) {
    threw = true;
    const msg = String(e instanceof Error ? e.message : e);
    assert(msg.includes('postgres_adapter_not_implemented'), 'runtime unwired should throw postgres_adapter_not_implemented');
  }
  assert(threw, 'runtime unwired should throw');
  const r = await getPostgresExecutionReadiness();
  assert(r.postgres_client_runtime_wired === false, 'runtime unwired should keep runtime_wired=false');
  assert(r.ledger_info.status !== 'ready', 'runtime unwired should not produce ledger ready');
}

async function runControlledCase() {
  const { getTenantSettingsJson } = require(repoPath);
  const { getPostgresExecutionReadiness, evaluatePostgresGoNoGo } = require(adapterPath);
  const { getSharedSaaSPostgresPool } = require(poolPath);

  const r = await getPostgresExecutionReadiness();
  if (!r.postgres_client_runtime_wired) {
    console.log('verify-tenant-settings-read-path: controlled_skip(runtime_unwired)');
    return;
  }
  if (r.ledger_info.status !== 'ready') {
    console.log(`verify-tenant-settings-read-path: controlled_skip(ledger_not_ready:${r.ledger_info.status})`);
    return;
  }
  const g = await evaluatePostgresGoNoGo();
  assert(g.overall_status !== 'go', 'controlled case must not imply overall GO');

  const pool = await getSharedSaaSPostgresPool();
  assert(pool, 'controlled case: postgres pool required');
  const id = `verify_tenant_settings_pg_${randomUUID()}`;
  const slug = `verify-tenant-settings-pg-${randomUUID().slice(0, 8)}`;
  await pool.query('INSERT INTO tenants (id, slug, name, created_at) VALUES ($1, $2, $3, now())', [id, slug, 'verify']);
  await pool.query('INSERT INTO tenant_settings (tenant_id, settings_json, updated_at) VALUES ($1, $2, now())', [
    id,
    JSON.stringify({ from_pg: true }),
  ]);
  const got = await getTenantSettingsJson(id);
  assert(got.from_pg === true, 'controlled case: pg read-path mismatch');
  await pool.query('DELETE FROM tenant_settings WHERE tenant_id = $1', [id]);
  await pool.query('DELETE FROM tenants WHERE id = $1', [id]);

  console.log('verify-tenant-settings-read-path: controlled_reachability_ok');
  console.log('verify-tenant-settings-read-path: overall_go_not_implied');
}

async function main() {
  const c = process.argv[2];
  if (c === 'sqljs-default') return runSqljsDefaultCase();
  if (c === 'runtime-unwired') return runRuntimeUnwiredCase();
  if (c === 'controlled') return runControlledCase();
  throw new Error(`unknown case: ${c}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
