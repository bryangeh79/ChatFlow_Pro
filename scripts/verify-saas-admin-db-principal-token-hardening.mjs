/**
 * Phase 24 / 1H — bridge_token hash-at-rest + GET principals redaction + legacy fallback / lazy migrate.
 */

import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join as pathJoin } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = pathJoin(__dirname, '..');

function hashBridgeToken(token) {
  const t = String(token).trim();
  if (!t) return '';
  return createHash('sha256').update(t, 'utf8').digest('hex');
}

async function openSqlJsDb(filePath) {
  const sqlPkgRoot = dirname(require.resolve('sql.js/package.json'));
  const mod = require('sql.js');
  const initSqlJs = typeof mod.default === 'function' ? mod.default : mod;
  const SQL = await initSqlJs({
    locateFile: (f) => pathJoin(sqlPkgRoot, 'dist', basename(f)),
  });
  const data = readFileSync(filePath);
  return new SQL.Database(data);
}

const breakToken =
  process.env.CHATFLOW_SAAS_ADMIN_TOKEN?.trim() ||
  `verify-1h-bg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const chatflowPort = Number(process.env.VERIFY_CHATFLOW_PORT || '3103');
const base = `http://127.0.0.1:${chatflowPort}`;

const tmpDir = mkdtempSync(pathJoin(tmpdir(), 'cf-saas-1h-'));
const dbFile = pathJoin(tmpDir, 'saas.sqlite');

function waitChildExit(child) {
  return new Promise((resolve) => child.once('exit', resolve));
}

async function waitForHealth() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${base}/health`);
      if (r.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('health timeout');
}

function spawnServer() {
  return spawn(process.execPath, [pathJoin(root, 'dist', 'src', 'index.js')], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(chatflowPort),
      CHATFLOW_SAAS_ADMIN_TOKEN: breakToken,
      CHATFLOW_SAAS_DB_PATH: dbFile,
      CHATFLOW_SAAS_TENANT_ADMIN_TOKENS: '',
      CHATFLOW_SAAS_TENANT_READONLY_TOKENS: '',
    },
    stdio: 'inherit',
  });
}

async function main() {
  const suffix = Date.now();
  const slugA = `h1a${suffix}`;
  const slugB = `h1b${suffix}`;
  const secretA = `secret-a-${suffix}`;
  const secretRo = `secret-ro-${suffix}`;
  const legacyBearer = `legacy-plain-${suffix}`;

  const authBreak = {
    authorization: `Bearer ${breakToken}`,
    'content-type': 'application/json',
  };

  let child = spawnServer();
  await waitForHealth();

  const create = (slug, name) =>
    fetch(`${base}/saas/v1/admin/tenants`, {
      method: 'POST',
      headers: authBreak,
      body: JSON.stringify({ slug, name }),
    });

  const rA = await create(slugA, '1H A');
  const rB = await create(slugB, '1H B');
  const jA = await rA.json();
  const jB = await rB.json();
  if (!rA.ok || !rB.ok) {
    child.kill();
    await waitChildExit(child);
    rmSync(tmpDir, { recursive: true, force: true });
    console.error('create tenant failed', rA.status, jA, rB.status, jB);
    process.exit(1);
  }
  const tenantIdA = jA.tenant.id;
  const tenantIdB = jB.tenant.id;

  const putPrincipals = (slug, body) =>
    fetch(`${base}/saas/v1/admin/tenants/${encodeURIComponent(slug)}/principals`, {
      method: 'PUT',
      headers: authBreak,
      body: JSON.stringify(body),
    });

  const rPut = await putPrincipals(slugA, {
    principals: [{ role: 'tenant_admin', bridge_token: secretA, is_enabled: true }],
  });
  if (!rPut.ok) {
    child.kill();
    await waitChildExit(child);
    rmSync(tmpDir, { recursive: true, force: true });
    console.error('PUT principals failed', rPut.status, await rPut.text());
    process.exit(1);
  }

  child.kill();
  await waitChildExit(child);

  const expectedHash = hashBridgeToken(secretA);
  const db1 = await openSqlJsDb(dbFile);
  const st1 = db1.prepare(
    'SELECT id, bridge_token, bridge_token_hash FROM tenant_admin_principals WHERE tenant_id = ?',
  );
  st1.bind([tenantIdA]);
  if (!st1.step()) {
    st1.free();
    db1.close();
    rmSync(tmpDir, { recursive: true, force: true });
    console.error('expected principal row in DB');
    process.exit(1);
  }
  const o1 = st1.getAsObject();
  st1.free();
  db1.close();
  const pid = String(o1.id);
  const bTok = String(o1.bridge_token);
  const bHash = String(o1.bridge_token_hash ?? '');
  if (bHash.toLowerCase() !== expectedHash) {
    rmSync(tmpDir, { recursive: true, force: true });
    console.error('bridge_token_hash mismatch', bHash, expectedHash);
    process.exit(1);
  }
  if (bTok !== pid) {
    rmSync(tmpDir, { recursive: true, force: true });
    console.error('expected bridge_token placeholder === row id', bTok, pid);
    process.exit(1);
  }
  if (bTok === secretA || String(bHash).includes(secretA)) {
    rmSync(tmpDir, { recursive: true, force: true });
    console.error('plaintext secret leaked into bridge_token / hash column');
    process.exit(1);
  }

  child = spawnServer();
  await waitForHealth();

  const rList = await fetch(`${base}/saas/v1/admin/tenants/${encodeURIComponent(slugA)}/principals`, {
    headers: authBreak,
  });
  const listJ = await rList.json();
  if (!rList.ok) {
    child.kill();
    await waitChildExit(child);
    rmSync(tmpDir, { recursive: true, force: true });
    console.error('GET principals failed', rList.status, listJ);
    process.exit(1);
  }
  const rawList = JSON.stringify(listJ);
  if (rawList.includes(secretA)) {
    child.kill();
    await waitChildExit(child);
    rmSync(tmpDir, { recursive: true, force: true });
    console.error('GET principals leaked secret', rawList.slice(0, 500));
    process.exit(1);
  }
  const p0 = listJ.principals?.[0];
  if (!p0 || Object.prototype.hasOwnProperty.call(p0, 'bridge_token')) {
    child.kill();
    await waitChildExit(child);
    rmSync(tmpDir, { recursive: true, force: true });
    console.error('GET principals must not include bridge_token field', p0);
    process.exit(1);
  }
  if (!p0?.has_token || p0.token_state !== 'hash_at_rest') {
    child.kill();
    await waitChildExit(child);
    rmSync(tmpDir, { recursive: true, force: true });
    console.error('unexpected principal list shape', p0);
    process.exit(1);
  }

  const rBearer = await fetch(`${base}/saas/v1/admin/tenants/${encodeURIComponent(slugA)}`, {
    headers: { authorization: `Bearer ${secretA}` },
  });
  if (!rBearer.ok) {
    child.kill();
    await waitChildExit(child);
    rmSync(tmpDir, { recursive: true, force: true });
    console.error('Bearer hash lookup failed', rBearer.status);
    process.exit(1);
  }

  const rRoPut = await putPrincipals(slugA, {
    principals: [{ role: 'tenant_operator_readonly', bridge_token: secretRo, is_enabled: true }],
  });
  if (!rRoPut.ok) {
    child.kill();
    await waitChildExit(child);
    rmSync(tmpDir, { recursive: true, force: true });
    console.error('PUT readonly failed', rRoPut.status);
    process.exit(1);
  }
  const authRo = { authorization: `Bearer ${secretRo}` };
  const rRoGet = await fetch(`${base}/saas/v1/admin/tenants/${encodeURIComponent(slugA)}`, { headers: authRo });
  if (!rRoGet.ok) {
    child.kill();
    await waitChildExit(child);
    rmSync(tmpDir, { recursive: true, force: true });
    console.error('readonly GET failed', rRoGet.status);
    process.exit(1);
  }
  const rRoMut = await fetch(`${base}/saas/v1/admin/tenants/${encodeURIComponent(slugA)}/settings`, {
    method: 'PUT',
    headers: { ...authRo, 'content-type': 'application/json' },
    body: JSON.stringify({ settings: { x: 1 } }),
  });
  if (rRoMut.status !== 403) {
    child.kill();
    await waitChildExit(child);
    rmSync(tmpDir, { recursive: true, force: true });
    console.error('expected readonly PUT → 403', rRoMut.status);
    process.exit(1);
  }

  child.kill();
  await waitChildExit(child);

  const legId = randomUUID();
  const db2 = await openSqlJsDb(dbFile);
  db2.run(
    `INSERT INTO tenant_admin_principals (id, tenant_id, role, bridge_token, bridge_token_hash, is_enabled, display_name, created_at, updated_at)
     VALUES (?, ?, 'tenant_admin', ?, NULL, 1, 'legacy', datetime('now'), datetime('now'))`,
    [legId, tenantIdB, legacyBearer],
  );
  writeFileSync(dbFile, Buffer.from(db2.export()));
  db2.close();

  child = spawnServer();
  await waitForHealth();

  const rLeg = await fetch(`${base}/saas/v1/admin/tenants/${encodeURIComponent(slugB)}`, {
    headers: { authorization: `Bearer ${legacyBearer}` },
  });
  if (!rLeg.ok) {
    child.kill();
    await waitChildExit(child);
    rmSync(tmpDir, { recursive: true, force: true });
    console.error('legacy plaintext row auth failed', rLeg.status);
    process.exit(1);
  }

  child.kill();
  await waitChildExit(child);

  const db3 = await openSqlJsDb(dbFile);
  const stL = db3.prepare('SELECT id, bridge_token, bridge_token_hash FROM tenant_admin_principals WHERE id = ?');
  stL.bind([legId]);
  if (!stL.step()) {
    stL.free();
    db3.close();
    rmSync(tmpDir, { recursive: true, force: true });
    console.error('legacy row missing after auth');
    process.exit(1);
  }
  const oL = stL.getAsObject();
  stL.free();
  db3.close();
  const legTok = String(oL.bridge_token);
  const legHash = String(oL.bridge_token_hash ?? '');
  const expLegHash = hashBridgeToken(legacyBearer);
  if (legHash.toLowerCase() !== expLegHash || legTok !== legId) {
    rmSync(tmpDir, { recursive: true, force: true });
    console.error('lazy migrate failed', { legTok, legHash, expLegHash, legId });
    process.exit(1);
  }

  rmSync(tmpDir, { recursive: true, force: true });

  console.log(
    JSON.stringify({
      ok: true,
      hash_at_rest: true,
      no_plaintext_new_write: true,
      bearer_hash_lookup: true,
      rbac_readonly_unchanged: true,
      get_principals_redacted: true,
      legacy_then_lazy_migrate: true,
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
