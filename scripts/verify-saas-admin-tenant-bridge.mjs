/**
 * Phase 24 / 1E — tenant admin bridge (CHATFLOW_SAAS_TENANT_ADMIN_TOKENS) + break-glass.
 *
 * Optional: CHATFLOW_SAAS_ADMIN_TOKEN (defaults to ephemeral verify token), VERIFY_CHATFLOW_PORT (default 3101)
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const breakToken =
  process.env.CHATFLOW_SAAS_ADMIN_TOKEN?.trim() ||
  `verify-bridge-break-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

const chatflowPort = Number(process.env.VERIFY_CHATFLOW_PORT || '3101');
const base = `http://127.0.0.1:${chatflowPort}`;

const suffix = Date.now();
const slugAcme = `bacme${suffix}`;
const slugOther = `bother${suffix}`;
const acmeTenantToken = `tenant-acme-${suffix}`;
const otherTenantToken = `tenant-other-${suffix}`;
const tenantMapJson = JSON.stringify({
  [slugAcme]: acmeTenantToken,
  [slugOther]: otherTenantToken,
});

async function main() {
  const child = spawn(process.execPath, [join(root, 'dist', 'src', 'index.js')], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(chatflowPort),
      CHATFLOW_SAAS_ADMIN_TOKEN: breakToken,
      CHATFLOW_SAAS_TENANT_ADMIN_TOKENS: tenantMapJson,
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
  const authAcme = { authorization: `Bearer ${acmeTenantToken}` };

  const create = (slug, name) =>
    fetch(`${base}/saas/v1/admin/tenants`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authBreak },
      body: JSON.stringify({ slug, name }),
    });

  const rA = await create(slugAcme, 'Bridge acme');
  const rO = await create(slugOther, 'Bridge other');
  if (!rA.ok || !rO.ok) {
    child.kill();
    console.error('create tenant failed', rA.status, await rA.text(), rO.status, await rO.text());
    process.exit(1);
  }

  const rListTenant = await fetch(`${base}/saas/v1/admin/tenants`, { headers: authAcme });
  if (rListTenant.status !== 403) {
    child.kill();
    console.error('expected tenant bridge list tenants → 403, got', rListTenant.status);
    process.exit(1);
  }

  const rOwn = await fetch(`${base}/saas/v1/admin/tenants/${encodeURIComponent(slugAcme)}`, {
    headers: authAcme,
  });
  if (rOwn.status === 401 || rOwn.status === 403) {
    child.kill();
    console.error('expected tenant bridge own slug → not 401/403, got', rOwn.status, await rOwn.text());
    process.exit(1);
  }

  const rCross = await fetch(`${base}/saas/v1/admin/tenants/${encodeURIComponent(slugOther)}`, {
    headers: authAcme,
  });
  if (rCross.status !== 403) {
    child.kill();
    console.error('expected tenant bridge other slug → 403, got', rCross.status);
    process.exit(1);
  }

  const rBreakList = await fetch(`${base}/saas/v1/admin/tenants`, { headers: authBreak });
  if (!rBreakList.ok) {
    child.kill();
    console.error('expected break-glass list → ok, got', rBreakList.status);
    process.exit(1);
  }

  const rBreakCross = await fetch(`${base}/saas/v1/admin/tenants/${encodeURIComponent(slugOther)}`, {
    headers: authBreak,
  });
  if (!rBreakCross.ok) {
    child.kill();
    console.error('expected break-glass other slug → ok, got', rBreakCross.status);
    process.exit(1);
  }

  const rNoAuth = await fetch(`${base}/saas/v1/admin/tenants`);
  if (rNoAuth.status !== 401) {
    child.kill();
    console.error('expected no token → 401, got', rNoAuth.status);
    process.exit(1);
  }

  child.kill();
  await new Promise((r) => child.once('exit', r));

  console.log(
    JSON.stringify({
      ok: true,
      slugAcme,
      slugOther,
      tenant_bridge_own_ok: true,
      tenant_bridge_cross_403: true,
      tenant_bridge_list_403: true,
      break_glass_ok: true,
      no_auth_401: true,
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
