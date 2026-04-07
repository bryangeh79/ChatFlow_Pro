/**
 * Phase 24 / 1I — principal replace audit trail + GET audit (no token/hash leakage).
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
  `verify-audit-bg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const chatflowPort = Number(process.env.VERIFY_CHATFLOW_PORT || '3104');
const base = `http://127.0.0.1:${chatflowPort}`;

const tmpDir = mkdtempSync(pathJoin(tmpdir(), 'cf-saas-audit-'));
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

function hasAction(entries, action) {
  return Array.isArray(entries) && entries.some((e) => e.action === action);
}

async function main() {
  const suffix = Date.now();
  const slug = `audt${suffix}`;
  const t1 = `aud-secret-one-${suffix}`;
  const t2 = `aud-secret-two-${suffix}`;

  const authBreak = {
    authorization: `Bearer ${breakToken}`,
    'content-type': 'application/json',
  };

  const child = spawn(process.execPath, [pathJoin(root, 'dist', 'src', 'index.js')], {
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

  try {
    await waitForHealth();
  } catch (e) {
    child.kill();
    await waitChildExit(child);
    rmSync(tmpDir, { recursive: true, force: true });
    throw e;
  }

  const create = await fetch(`${base}/saas/v1/admin/tenants`, {
    method: 'POST',
    headers: authBreak,
    body: JSON.stringify({ slug, name: 'Audit tenant' }),
  });
  if (!create.ok) {
    child.kill();
    await waitChildExit(child);
    rmSync(tmpDir, { recursive: true, force: true });
    console.error('create tenant failed', create.status, await create.text());
    process.exit(1);
  }

  const putP = (body) =>
    fetch(`${base}/saas/v1/admin/tenants/${encodeURIComponent(slug)}/principals`, {
      method: 'PUT',
      headers: authBreak,
      body: JSON.stringify(body),
    });

  const getAudit = async () => {
    const r = await fetch(`${base}/saas/v1/admin/tenants/${encodeURIComponent(slug)}/principals/audit?limit=100`, {
      headers: authBreak,
    });
    const j = await r.json();
    return { ok: r.ok, j };
  };

  const fail = async (msg) => {
    child.kill();
    await waitChildExit(child);
    rmSync(tmpDir, { recursive: true, force: true });
    console.error(msg);
    process.exit(1);
  };

  let r = await putP({
    principals: [{ role: 'tenant_admin', bridge_token: t1, is_enabled: true, display_name: 'n1' }],
  });
  if (!r.ok) await fail('PUT initial principal failed ' + r.status);

  let { ok: aOk, j: auditJ } = await getAudit();
  if (!aOk || !hasAction(auditJ.entries, 'created')) await fail('expected audit created');

  r = await putP({
    principals: [{ role: 'tenant_admin', bridge_token: t1, is_enabled: true, display_name: 'n2' }],
  });
  if (!r.ok) await fail('PUT display change failed');

  ({ j: auditJ } = await getAudit());
  if (!hasAction(auditJ.entries, 'updated')) await fail('expected audit updated');

  r = await putP({
    principals: [{ role: 'tenant_admin', bridge_token: t1, is_enabled: false, display_name: 'n2' }],
  });
  if (!r.ok) await fail('PUT disable failed');

  ({ j: auditJ } = await getAudit());
  if (!hasAction(auditJ.entries, 'disabled')) await fail('expected audit disabled');

  r = await putP({
    principals: [{ role: 'tenant_admin', bridge_token: t1, is_enabled: true, display_name: 'n2' }],
  });
  if (!r.ok) await fail('PUT re-enable failed');

  ({ j: auditJ } = await getAudit());
  if (!hasAction(auditJ.entries, 'enabled')) await fail('expected audit enabled');

  r = await putP({
    principals: [{ role: 'tenant_admin', bridge_token: t2, is_enabled: true, display_name: 'n2' }],
  });
  if (!r.ok) await fail('PUT rotate failed');

  ({ j: auditJ } = await getAudit());
  if (!hasAction(auditJ.entries, 'rotated')) await fail('expected audit rotated');

  const rTok = await fetch(`${base}/saas/v1/admin/tenants/${encodeURIComponent(slug)}`, {
    headers: { authorization: `Bearer ${t2}` },
  });
  if (!rTok.ok) await fail('DB principal auth after rotate failed ' + rTok.status);

  const rawAudit = JSON.stringify(auditJ);
  if (rawAudit.includes(t1) || rawAudit.includes(t2)) await fail('audit JSON leaked bearer material');

  r = await putP({ principals: [] });
  if (!r.ok) await fail('PUT clear principals failed');

  ({ j: auditJ } = await getAudit());
  if (!hasAction(auditJ.entries, 'deleted')) await fail('expected audit deleted');

  if (!auditJ.entries.some((e) => e.actor_role === 'platform_admin' && e.actor_auth_source === 'break_glass_env')) {
    await fail('expected break_glass platform_admin actor on audit rows');
  }

  child.kill();
  await waitChildExit(child);
  rmSync(tmpDir, { recursive: true, force: true });

  console.log(
    JSON.stringify({
      ok: true,
      audit_created: true,
      audit_rotated: true,
      audit_disabled: true,
      audit_enabled: true,
      audit_updated: true,
      audit_deleted: true,
      no_secret_in_audit_payload: true,
      db_auth_ok_after_rotate: true,
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
