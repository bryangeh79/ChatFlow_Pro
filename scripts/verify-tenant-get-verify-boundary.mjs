/**
 * Phase 22D — tenant GET hub verify: no env verify-token fallback.
 *
 * Env: CHATFLOW_SAAS_ADMIN_TOKEN
 * Optional: VERIFY_CHATFLOW_PORT (default 3099)
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const token = process.env.CHATFLOW_SAAS_ADMIN_TOKEN?.trim();
if (!token) {
  console.error('CHATFLOW_SAAS_ADMIN_TOKEN is required');
  process.exit(1);
}

const chatflowPort = Number(process.env.VERIFY_CHATFLOW_PORT || '3099');
const base = `http://127.0.0.1:${chatflowPort}`;

const VTOK = 'hub_verify_shared_token_phase_22d_xx';

function hubQs(challenge = 'challenge_ok_22d') {
  const p = new URLSearchParams();
  p.set('hub.mode', 'subscribe');
  p.set('hub.verify_token', VTOK);
  p.set('hub.challenge', challenge);
  return p.toString();
}

async function main() {
  const child = spawn(
    process.execPath,
    [join(root, 'dist', 'src', 'index.js')],
    {
      cwd: root,
      env: {
        ...process.env,
        PORT: String(chatflowPort),
        CHATFLOW_SAAS_ADMIN_TOKEN: token,
        META_WEBHOOK_VERIFY_TOKEN: VTOK,
      },
      stdio: 'inherit',
    },
  );

  const deadline = Date.now() + 20_000;
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

  const auth = `Bearer ${token}`;
  const slugEmpty = `hub-empty-${Date.now()}`;
  const slugOk = `hub-ok-${Date.now()}`;

  for (const slug of [slugEmpty, slugOk]) {
    const r1 = await fetch(`${base}/saas/v1/admin/tenants`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: auth },
      body: JSON.stringify({ slug, name: `GET verify ${slug}` }),
    });
    if (!r1.ok) {
      child.kill();
      console.error('create tenant failed', slug, r1.status, await r1.text());
      process.exit(1);
    }
  }

  const qs = hubQs();
  const rMiss = await fetch(`${base}/webhooks/t/${encodeURIComponent(slugEmpty)}/whatsapp?${qs}`);
  const jMiss = await rMiss.json().catch(() => ({}));
  if (rMiss.status !== 403 || jMiss.error !== 'tenant_verify_token_missing') {
    child.kill();
    console.error('expected tenant_verify_token_missing', rMiss.status, jMiss);
    process.exit(1);
  }
  const sc = jMiss.debug_metadata?.saas_control;
  if (sc?.tenant_get_verify_token_present !== false || sc?.tenant_get_env_fallback_blocked !== true) {
    child.kill();
    console.error('unexpected saas_control (missing token)', sc);
    process.exit(1);
  }

  const rCred = await fetch(`${base}/saas/v1/admin/tenants/${encodeURIComponent(slugOk)}/credentials`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', authorization: auth },
    body: JSON.stringify({
      credentials: { WHATSAPP_WEBHOOK_VERIFY_TOKEN: VTOK },
    }),
  });
  if (!rCred.ok) {
    child.kill();
    console.error('put credentials failed', rCred.status, await rCred.text());
    process.exit(1);
  }

  const challenge = 'plain_challenge_body_22d';
  const rOk = await fetch(
    `${base}/webhooks/t/${encodeURIComponent(slugOk)}/whatsapp?${hubQs(challenge)}`,
  );
  const textOk = await rOk.text();
  if (rOk.status !== 200 || textOk !== challenge) {
    child.kill();
    console.error('expected 200 challenge echo', rOk.status, textOk);
    process.exit(1);
  }

  const rLegacy = await fetch(`${base}/webhooks/whatsapp?${hubQs('legacy_ch')}`);
  const textLegacy = await rLegacy.text();
  if (rLegacy.status !== 200 || textLegacy !== 'legacy_ch') {
    child.kill();
    console.error('legacy hub verify broken', rLegacy.status, textLegacy);
    process.exit(1);
  }

  child.kill();
  await new Promise((r) => child.once('exit', r));

  console.log(
    JSON.stringify({
      ok: true,
      tenant_missing_rejected: true,
      tenant_configured_ok: true,
      legacy_ok: true,
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
