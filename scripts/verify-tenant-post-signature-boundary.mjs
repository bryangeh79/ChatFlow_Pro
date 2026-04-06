/**
 * Phase 22D — tenant POST signature: no env secret fallback; legacy unchanged.
 *
 * Env: CHATFLOW_SAAS_ADMIN_TOKEN
 * Optional: VERIFY_CHATFLOW_PORT (default 3099)
 */

import { spawn } from 'node:child_process';
import { createHmac } from 'node:crypto';
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

const SHARED = 'p22d_tenant_post_sig_shared_secret_value_xx';

function metaHubSig(rawUtf8, secret) {
  const hex = createHmac('sha256', secret).update(rawUtf8, 'utf8').digest('hex');
  return `sha256=${hex}`;
}

function lineSig(rawUtf8, secret) {
  return createHmac('sha256', secret).update(rawUtf8, 'utf8').digest('base64');
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
        WHATSAPP_APP_SECRET: SHARED,
        MESSENGER_APP_SECRET: SHARED,
        LINE_CHANNEL_SECRET: SHARED,
        WEBSITE_WEBHOOK_SIGNING_SECRET: SHARED,
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
  const slugEmpty = `sig-empty-${Date.now()}`;
  const slugFull = `sig-full-${Date.now()}`;

  for (const slug of [slugEmpty, slugFull]) {
    const r1 = await fetch(`${base}/saas/v1/admin/tenants`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: auth },
      body: JSON.stringify({ slug, name: `Sig verify ${slug}` }),
    });
    if (!r1.ok) {
      child.kill();
      console.error('create tenant failed', slug, r1.status, await r1.text());
      process.exit(1);
    }
  }

  const assertMissing = async (channel, pathSuffix, rawBody, headers) => {
    const url = `${base}/webhooks/t/${encodeURIComponent(slugEmpty)}/${pathSuffix}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: rawBody,
    });
    const j = await r.json().catch(() => ({}));
    if (r.status !== 403 || j.error !== 'tenant_secret_missing') {
      child.kill();
      console.error('expected tenant_secret_missing', channel, r.status, j);
      process.exit(1);
    }
    const sc = j.debug_metadata?.saas_control;
    if (sc?.tenant_post_secret_present !== false || sc?.tenant_post_env_fallback_blocked !== true) {
      child.kill();
      console.error('unexpected saas_control (missing)', channel, sc);
      process.exit(1);
    }
  };

  const waBody = JSON.stringify({
    from: 'wa_verify_u1',
    conversation_id: 'wa_verify_u1',
    text: 'hi',
    id: 'wa_verify_m1',
  });
  await assertMissing('whatsapp', 'whatsapp', waBody, {
    'x-hub-signature-256': metaHubSig(waBody, SHARED),
  });

  const msBody = JSON.stringify({
    sender: { id: 'ms-u-1' },
    thread: { id: 'ms-t-1' },
    text: 'verify',
  });
  await assertMissing('messenger', 'messenger', msBody, {
    'x-hub-signature-256': metaHubSig(msBody, SHARED),
  });

  const lineBody = JSON.stringify({
    userId: 'line-u-1',
    conversationId: 'line-c-1',
    text: 'verify',
  });
  await assertMissing('line', 'line', lineBody, {
    'x-line-signature': lineSig(lineBody, SHARED),
  });

  const webBody = JSON.stringify({
    user_id: 'web-u-1',
    session_id: 'web-s-1',
    text: 'verify',
  });
  await assertMissing('website', 'website', webBody, {
    'x-webhook-signature': metaHubSig(webBody, SHARED),
  });

  const rCred = await fetch(`${base}/saas/v1/admin/tenants/${encodeURIComponent(slugFull)}/credentials`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', authorization: auth },
    body: JSON.stringify({
      credentials: {
        WHATSAPP_APP_SECRET: SHARED,
        MESSENGER_APP_SECRET: SHARED,
        LINE_CHANNEL_SECRET: SHARED,
        WEBSITE_WEBHOOK_SIGNING_SECRET: SHARED,
      },
    }),
  });
  if (!rCred.ok) {
    child.kill();
    console.error('put credentials failed', rCred.status, await rCred.text());
    process.exit(1);
  }

  const assertTenantOk = async (channel, pathSuffix, rawBody, headers) => {
    const url = `${base}/webhooks/t/${encodeURIComponent(slugFull)}/${pathSuffix}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: rawBody,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      child.kill();
      console.error('expected 200 tenant post', channel, r.status, j);
      process.exit(1);
    }
    return j;
  };

  const jWaOk = await assertTenantOk('whatsapp', 'whatsapp', waBody, {
    'x-hub-signature-256': metaHubSig(waBody, SHARED),
  });
  const scOk = jWaOk.response?.debug_metadata?.saas_control;
  if (scOk?.tenant_post_secret_present !== true || scOk?.tenant_post_env_fallback_blocked !== true) {
    child.kill();
    console.error('expected saas_control signature fields on tenant WA success', scOk);
    process.exit(1);
  }
  await assertTenantOk('messenger', 'messenger', msBody, {
    'x-hub-signature-256': metaHubSig(msBody, SHARED),
  });
  await assertTenantOk('line', 'line', lineBody, {
    'x-line-signature': lineSig(lineBody, SHARED),
  });
  await assertTenantOk('website', 'website', webBody, {
    'x-webhook-signature': metaHubSig(webBody, SHARED),
  });

  const rLegacyWa = await fetch(`${base}/webhooks/whatsapp`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-hub-signature-256': metaHubSig(waBody, SHARED),
    },
    body: waBody,
  });
  const jLegacy = await rLegacyWa.json().catch(() => ({}));
  if (!rLegacyWa.ok) {
    child.kill();
    console.error('legacy whatsapp expected ok', rLegacyWa.status, jLegacy);
    process.exit(1);
  }

  child.kill();
  await new Promise((r) => child.once('exit', r));

  console.log(
    JSON.stringify({
      ok: true,
      tenant_secret_missing_all_four: true,
      tenant_signed_ok_all_four: true,
      legacy_whatsapp_ok: true,
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
