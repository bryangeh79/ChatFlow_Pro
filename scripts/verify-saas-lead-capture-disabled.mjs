/**
 * Phase 22B — tenant lead_capture.enabled=false: no partial/captured progression, no JSONL append path from hook.
 *
 * Spawns server child; tenant webhook Telegram lead-style triplet; expects lead_capture_state.status
 * to stay `none` and saas_control.lead_capture_suppressed === true.
 *
 * Env: CHATFLOW_SAAS_ADMIN_TOKEN
 * Optional: VERIFY_CHATFLOW_PORT (default 3098)
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

const chatflowPort = Number(process.env.VERIFY_CHATFLOW_PORT || '3098');
const base = `http://127.0.0.1:${chatflowPort}`;

function tg(uid, chatId, updId, text) {
  return {
    update_id: updId,
    message: {
      message_id: 1,
      from: { id: uid, is_bot: false, first_name: 'L', last_name: 'C' },
      chat: { id: chatId, first_name: 'L', last_name: 'C', type: 'private' },
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

  const slug = `leadcap-off-${Date.now()}`;
  const auth = `Bearer ${token}`;

  const r1 = await fetch(`${base}/saas/v1/admin/tenants`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: auth },
    body: JSON.stringify({ slug, name: 'Lead capture off verify' }),
  });
  if (!r1.ok) {
    child.kill();
    console.error('create tenant failed', r1.status, await r1.text());
    process.exit(1);
  }

  const r2 = await fetch(`${base}/saas/v1/admin/tenants/${encodeURIComponent(slug)}/settings`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', authorization: auth },
    body: JSON.stringify({
      settings: {
        lead_capture: { enabled: false },
        handoff: { enabled: false },
        notify: { enabled: false },
      },
    }),
  });
  if (!r2.ok) {
    child.kill();
    console.error('put settings failed', r2.status, await r2.text());
    process.exit(1);
  }

  const uid = 7700000 + Math.floor(Math.random() * 10000);
  const pathTg = `${base}/webhooks/t/${encodeURIComponent(slug)}/telegram`;
  const iso = new Date().toISOString();

  const bodies = [
    tg(uid, uid, 920001, 'weather only ' + iso),
    tg(uid, uid, 920002, 'tel: +1 555 123 4567'),
    tg(uid, uid, 920003, 'tel: +1 555 987 6543'),
    tg(uid, uid, 920004, 'my name is Alice Lee email: alice.lee@example.com'),
  ];

  for (const body of bodies) {
    const r = await fetch(pathTg, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) {
      child.kill();
      console.error('webhook failed', r.status, j);
      process.exit(1);
    }
    const st = j.session?.lead_capture_state?.status;
    if (st !== 'none') {
      child.kill();
      console.error('expected lead_capture none, got', st, j.session?.lead_capture_state);
      process.exit(1);
    }
    const sc = j.response?.debug_metadata?.saas_control;
    if (sc.lead_capture_suppressed !== true || sc.lead_capture_enabled !== false) {
      child.kill();
      console.error('unexpected saas_control lead flags', sc);
      process.exit(1);
    }
  }

  child.kill();
  await new Promise((r) => child.once('exit', r));

  console.log(JSON.stringify({ ok: true, slug }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
