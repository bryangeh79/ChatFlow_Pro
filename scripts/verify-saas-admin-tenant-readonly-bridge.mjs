/**
 * Phase 24 / 1F — tenant_operator_readonly bridge (CHATFLOW_SAAS_TENANT_READONLY_TOKENS).
 * Optional: VERIFY_CHATFLOW_PORT (default 3102)
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const breakToken =
  process.env.CHATFLOW_SAAS_ADMIN_TOKEN?.trim() ||
  `verify-ro-break-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

const chatflowPort = Number(process.env.VERIFY_CHATFLOW_PORT || '3102');
const base = `http://127.0.0.1:${chatflowPort}`;

const suffix = Date.now();
const slugRo = `bro${suffix}`;
const slugOther = `bother${suffix}`;
const adminTok = `adm-${suffix}`;
const readTok = `ro-${suffix}`;
const otherAdminTok = `adm-other-${suffix}`;

const tenantAdminMap = JSON.stringify({
  [slugRo]: adminTok,
  [slugOther]: otherAdminTok,
});
const tenantReadonlyMap = JSON.stringify({
  [slugRo]: readTok,
});

async function main() {
  const child = spawn(process.execPath, [join(root, 'dist', 'src', 'index.js')], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(chatflowPort),
      CHATFLOW_SAAS_ADMIN_TOKEN: breakToken,
      CHATFLOW_SAAS_TENANT_ADMIN_TOKENS: tenantAdminMap,
      CHATFLOW_SAAS_TENANT_READONLY_TOKENS: tenantReadonlyMap,
    },
    stdio: 'inherit',
  });

  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${base}/health`);
      if (r.ok) break;
    } catch {
      /* wait */
    }
    await new Promise((r) => setTimeout(r, 200));
    if (child.exitCode !== null) {
      console.error('server exited early');
      process.exit(1);
    }
  }

  const authBreak = { authorization: `Bearer ${breakToken}` };
  const authRo = { authorization: `Bearer ${readTok}` };
  const authAdmin = { authorization: `Bearer ${adminTok}` };

  const create = (slug, name) =>
    fetch(`${base}/saas/v1/admin/tenants`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authBreak },
      body: JSON.stringify({ slug, name }),
    });

  const r1 = await create(slugRo, 'RO bridge');
  const r2 = await create(slugOther, 'Other');
  if (!r1.ok || !r2.ok) {
    child.kill();
    console.error('create tenant failed', await r1.text(), await r2.text());
    process.exit(1);
  }

  const rGetOwn = await fetch(`${base}/saas/v1/admin/tenants/${encodeURIComponent(slugRo)}`, {
    headers: authRo,
  });
  if (rGetOwn.status === 401 || rGetOwn.status === 403) {
    child.kill();
    console.error('readonly GET own tenant expected ok, got', rGetOwn.status);
    process.exit(1);
  }

  const rFaqGet = await fetch(`${base}/saas/v1/admin/tenants/${encodeURIComponent(slugRo)}/faq`, {
    headers: authRo,
  });
  if (rFaqGet.status === 401 || rFaqGet.status === 403) {
    child.kill();
    console.error('readonly GET own faq expected ok, got', rFaqGet.status);
    process.exit(1);
  }

  const rFaqPut = await fetch(`${base}/saas/v1/admin/tenants/${encodeURIComponent(slugRo)}/faq`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', ...authRo },
    body: JSON.stringify({ entries: [] }),
  });
  if (rFaqPut.status !== 403) {
    child.kill();
    console.error('readonly PUT faq expected 403, got', rFaqPut.status);
    process.exit(1);
  }

  const rSetPut = await fetch(`${base}/saas/v1/admin/tenants/${encodeURIComponent(slugRo)}/settings`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', ...authRo },
    body: JSON.stringify({ settings: {} }),
  });
  if (rSetPut.status !== 403) {
    child.kill();
    console.error('readonly PUT settings expected 403, got', rSetPut.status);
    process.exit(1);
  }

  const rCross = await fetch(`${base}/saas/v1/admin/tenants/${encodeURIComponent(slugOther)}`, {
    headers: authRo,
  });
  if (rCross.status !== 403) {
    child.kill();
    console.error('readonly cross-tenant GET expected 403, got', rCross.status);
    process.exit(1);
  }

  const rList = await fetch(`${base}/saas/v1/admin/tenants`, { headers: authRo });
  if (rList.status !== 403) {
    child.kill();
    console.error('readonly list tenants expected 403, got', rList.status);
    process.exit(1);
  }

  const rAdminPut = await fetch(`${base}/saas/v1/admin/tenants/${encodeURIComponent(slugRo)}/faq`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', ...authAdmin },
    body: JSON.stringify({ entries: [] }),
  });
  if (rAdminPut.status === 401 || rAdminPut.status === 403) {
    child.kill();
    console.error('tenant_admin PUT own faq expected allowed, got', rAdminPut.status);
    process.exit(1);
  }

  const rBreakList = await fetch(`${base}/saas/v1/admin/tenants`, { headers: authBreak });
  if (!rBreakList.ok) {
    child.kill();
    console.error('break-glass list expected ok');
    process.exit(1);
  }

  child.kill();
  await new Promise((r) => child.once('exit', r));

  console.log(JSON.stringify({ ok: true, slugRo, regression_admin_and_break_glass: true }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
