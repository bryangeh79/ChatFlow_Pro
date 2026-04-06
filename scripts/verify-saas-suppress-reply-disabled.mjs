/**
 * Phase 22C — tenant suppress_reply.enabled=false blocks env-driven handoff reply suppression.
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

function tg(uid, updId, text) {
  return {
    update_id: updId,
    message: {
      message_id: 1,
      from: { id: uid, is_bot: false, first_name: 'B', last_name: 'T' },
      chat: { id: uid, first_name: 'B', last_name: 'T', type: 'private' },
      date: Math.floor(Date.now() / 1000),
      text,
    },
  };
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
        CHATFLOW_SUPPRESS_REPLY_ON_HANDOFF: '1',
      },
      stdio: 'inherit',
    },
  );

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

  const slug = `suppress-off-${Date.now()}`;
  const auth = `Bearer ${token}`;

  const r1 = await fetch(`${base}/saas/v1/admin/tenants`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: auth },
    body: JSON.stringify({ slug, name: 'Suppress reply off verify' }),
  });
  if (!r1.ok) {
    child.kill();
    console.error('create tenant failed', r1.status, await r1.text());
    process.exit(1);
  }

  const r2 = await fetch(`${base}/saas/v1/admin/tenants/${encodeURIComponent(slug)}/settings`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', authorization: auth },
    body: JSON.stringify({ settings: { suppress_reply: { enabled: false } } }),
  });
  if (!r2.ok) {
    child.kill();
    console.error('put settings failed', r2.status, await r2.text());
    process.exit(1);
  }

  const uid = 7700000 + Math.floor(Math.random() * 10000);
  const pathTg = `${base}/webhooks/t/${encodeURIComponent(slug)}/telegram`;
  const r3 = await fetch(pathTg, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(tg(uid, 940001, 'I need a human agent ' + new Date().toISOString())),
  });
  const j = await r3.json().catch(() => ({}));
  if (!r3.ok || !j.ok) {
    child.kill();
    console.error('webhook failed', r3.status, j);
    process.exit(1);
  }

  const sc = j.response?.debug_metadata?.saas_control;
  const meta = j.response?.debug_metadata;

  if (j.response?.should_send !== true) {
    child.kill();
    console.error('expected should_send true (reply not suppressed)', j.response?.should_send);
    process.exit(1);
  }
  if (meta?.handoff_suppressed !== false) {
    child.kill();
    console.error('expected handoff_suppressed false', meta?.handoff_suppressed);
    process.exit(1);
  }
  if (!Array.isArray(meta?.debug_steps) || !meta.debug_steps.some((s) => String(s).includes('policy:handoff'))) {
    child.kill();
    console.error('expected handoff policy in debug_steps', meta?.debug_steps);
    process.exit(1);
  }
  if (sc?.suppress_reply_suppressed !== true || sc.suppress_reply_enabled !== false) {
    child.kill();
    console.error('unexpected saas_control suppress_reply flags', sc);
    process.exit(1);
  }

  child.kill();
  await new Promise((r) => child.once('exit', r));

  console.log(JSON.stringify({ ok: true, slug, handoff_reply_not_suppressed: true }));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
