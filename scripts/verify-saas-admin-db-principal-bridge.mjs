/**
 * Phase 24 / 1G — DB-backed tenant admin principals + priority over env bridge + env fallback.
 *
 * Uses isolated CHATFLOW_SAAS_DB_PATH. Optional: VERIFY_CHATFLOW_PORT (default 3101)
 */

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join as pathJoin } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = pathJoin(__dirname, '..');

const breakToken =
  process.env.CHATFLOW_SAAS_ADMIN_TOKEN?.trim() ||
  `verify-db-princ-bg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const chatflowPort = Number(process.env.VERIFY_CHATFLOW_PORT || '3101');
const base = `http://127.0.0.1:${chatflowPort}`;

const tmpDir = mkdtempSync(pathJoin(tmpdir(), 'cf-saas-dbprinc-'));
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

async function main() {
  const suffix = Date.now();
  const slugA = `dba${suffix}`;
  const slugB = `dbb${suffix}`;
  /** Same value in DB (slugA) and env map (slugB) — DB must win. */
  const sharedTok = `shared-${suffix}`;
  /** DB only (never in env) — disable → 401. */
  const dbAdminTok = `db-adm-${suffix}`;
  const dbRoTok = `db-ro-${suffix}`;

  const authBreak = {
    authorization: `Bearer ${breakToken}`,
    'content-type': 'application/json',
  };

  const childEnv = {
    ...process.env,
    PORT: String(chatflowPort),
    CHATFLOW_SAAS_ADMIN_TOKEN: breakToken,
    CHATFLOW_SAAS_DB_PATH: dbFile,
    CHATFLOW_SAAS_TENANT_ADMIN_TOKENS: JSON.stringify({ [slugB]: sharedTok }),
    CHATFLOW_SAAS_TENANT_READONLY_TOKENS: '',
  };

  const child = spawn(process.execPath, [pathJoin(root, 'dist', 'src', 'index.js')], {
    cwd: root,
    env: childEnv,
    stdio: 'inherit',
  });

  try {
    await waitForHealth();
  } catch (e) {
    child.kill();
    await waitChildExit(child);
    throw e;
  }

  if (child.exitCode !== null) {
    rmSync(tmpDir, { recursive: true, force: true });
    console.error('server exited early');
    process.exit(1);
  }

  const create = (slug, name) =>
    fetch(`${base}/saas/v1/admin/tenants`, {
      method: 'POST',
      headers: authBreak,
      body: JSON.stringify({ slug, name }),
    });

  const rA = await create(slugA, 'DB principal A');
  const rB = await create(slugB, 'DB principal B');
  if (!rA.ok || !rB.ok) {
    child.kill();
    await waitChildExit(child);
    rmSync(tmpDir, { recursive: true, force: true });
    console.error('create tenant failed', rA.status, await rA.text(), rB.status, await rB.text());
    process.exit(1);
  }

  const putPrincipals = (slug, body) =>
    fetch(`${base}/saas/v1/admin/tenants/${encodeURIComponent(slug)}/principals`, {
      method: 'PUT',
      headers: authBreak,
      body: JSON.stringify(body),
    });

  const rPutShared = await putPrincipals(slugA, {
    principals: [{ role: 'tenant_admin', bridge_token: sharedTok, is_enabled: true }],
  });
  if (!rPutShared.ok) {
    child.kill();
    await waitChildExit(child);
    rmSync(tmpDir, { recursive: true, force: true });
    console.error('PUT principals (shared) failed', rPutShared.status, await rPutShared.text());
    process.exit(1);
  }

  const authShared = { authorization: `Bearer ${sharedTok}` };

  const rOwnShared = await fetch(`${base}/saas/v1/admin/tenants/${encodeURIComponent(slugA)}`, {
    headers: authShared,
  });
  if (!rOwnShared.ok) {
    child.kill();
    await waitChildExit(child);
    rmSync(tmpDir, { recursive: true, force: true });
    console.error('expected sharedTok DB tenant_admin own GET ok', rOwnShared.status);
    process.exit(1);
  }

  const rCrossShared = await fetch(`${base}/saas/v1/admin/tenants/${encodeURIComponent(slugB)}`, {
    headers: authShared,
  });
  if (rCrossShared.status !== 403) {
    child.kill();
    await waitChildExit(child);
    rmSync(tmpDir, { recursive: true, force: true });
    console.error('expected DB wins over env: sharedTok bound slugA → GET B → 403, got', rCrossShared.status);
    process.exit(1);
  }

  const rPutAdm = await putPrincipals(slugA, {
    principals: [{ role: 'tenant_admin', bridge_token: dbAdminTok, is_enabled: true }],
  });
  if (!rPutAdm.ok) {
    child.kill();
    await waitChildExit(child);
    rmSync(tmpDir, { recursive: true, force: true });
    console.error('PUT principals (dbAdminTok) failed', rPutAdm.status);
    process.exit(1);
  }

  const authDbAdm = { authorization: `Bearer ${dbAdminTok}` };

  const rOwnAdm = await fetch(`${base}/saas/v1/admin/tenants/${encodeURIComponent(slugA)}`, {
    headers: authDbAdm,
  });
  if (!rOwnAdm.ok) {
    child.kill();
    await waitChildExit(child);
    rmSync(tmpDir, { recursive: true, force: true });
    console.error('expected DB tenant_admin own GET ok', rOwnAdm.status);
    process.exit(1);
  }

  const rCrossAdm = await fetch(`${base}/saas/v1/admin/tenants/${encodeURIComponent(slugB)}`, {
    headers: authDbAdm,
  });
  if (rCrossAdm.status !== 403) {
    child.kill();
    await waitChildExit(child);
    rmSync(tmpDir, { recursive: true, force: true });
    console.error('expected DB tenant_admin cross slug → 403, got', rCrossAdm.status);
    process.exit(1);
  }

  const rRoPut = await putPrincipals(slugA, {
    principals: [{ role: 'tenant_operator_readonly', bridge_token: dbRoTok, is_enabled: true }],
  });
  if (!rRoPut.ok) {
    child.kill();
    await waitChildExit(child);
    rmSync(tmpDir, { recursive: true, force: true });
    console.error('PUT readonly principal failed', rRoPut.status);
    process.exit(1);
  }

  const authRo = { authorization: `Bearer ${dbRoTok}` };
  const rRoGet = await fetch(`${base}/saas/v1/admin/tenants/${encodeURIComponent(slugA)}`, { headers: authRo });
  if (!rRoGet.ok) {
    child.kill();
    await waitChildExit(child);
    rmSync(tmpDir, { recursive: true, force: true });
    console.error('expected readonly GET tenant ok', rRoGet.status);
    process.exit(1);
  }

  const rRoPutDeny = await fetch(`${base}/saas/v1/admin/tenants/${encodeURIComponent(slugA)}/settings`, {
    method: 'PUT',
    headers: { ...authRo, 'content-type': 'application/json' },
    body: JSON.stringify({ settings: { verify_db_readonly: true } }),
  });
  if (rRoPutDeny.status !== 403) {
    child.kill();
    await waitChildExit(child);
    rmSync(tmpDir, { recursive: true, force: true });
    console.error('expected readonly PUT settings → 403, got', rRoPutDeny.status);
    process.exit(1);
  }

  const rDis = await putPrincipals(slugA, {
    principals: [{ role: 'tenant_admin', bridge_token: dbAdminTok, is_enabled: false }],
  });
  if (!rDis.ok) {
    child.kill();
    await waitChildExit(child);
    rmSync(tmpDir, { recursive: true, force: true });
    console.error('PUT disable principal failed', rDis.status);
    process.exit(1);
  }

  const rDisabled = await fetch(`${base}/saas/v1/admin/tenants/${encodeURIComponent(slugA)}`, {
    headers: authDbAdm,
  });
  if (rDisabled.status !== 401) {
    child.kill();
    await waitChildExit(child);
    rmSync(tmpDir, { recursive: true, force: true });
    console.error('expected disabled DB-only token → 401, got', rDisabled.status);
    process.exit(1);
  }

  const rBreak = await fetch(`${base}/saas/v1/admin/tenants`, { headers: authBreak });
  if (!rBreak.ok) {
    child.kill();
    await waitChildExit(child);
    rmSync(tmpDir, { recursive: true, force: true });
    console.error('break-glass list failed', rBreak.status);
    process.exit(1);
  }

  await putPrincipals(slugA, { principals: [] });
  await putPrincipals(slugB, { principals: [] });

  const rEnvOwn = await fetch(`${base}/saas/v1/admin/tenants/${encodeURIComponent(slugB)}`, {
    headers: authShared,
  });
  if (!rEnvOwn.ok) {
    child.kill();
    await waitChildExit(child);
    rmSync(tmpDir, { recursive: true, force: true });
    console.error('expected env bridge after DB clear → GET B ok, got', rEnvOwn.status, await rEnvOwn.text());
    process.exit(1);
  }

  child.kill();
  await waitChildExit(child);
  rmSync(tmpDir, { recursive: true, force: true });

  console.log(
    JSON.stringify({
      ok: true,
      slugA,
      slugB,
      db_tenant_admin_scope: true,
      db_priority_over_env_same_token: true,
      db_readonly_get_put_deny: true,
      disabled_token_401: true,
      break_glass_ok: true,
      env_fallback_after_db_clear: true,
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
