/**
 * Phase 22B — tenant notify.enabled=false must not POST lead or handoff notify URLs.
 *
 * Spawns server child with CHATFLOW_*_NOTIFY_URL pointing at local collector; creates tenant,
 * runs Telegram lead triplet + handoff keyword on /webhooks/t/:slug/telegram.
 *
 * Env: CHATFLOW_SAAS_ADMIN_TOKEN (must match child).
 * Optional: VERIFY_CHATFLOW_PORT (default 3097).
 */

import http from 'node:http';
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

const chatflowPort = Number(process.env.VERIFY_CHATFLOW_PORT || '3097');
const base = `http://127.0.0.1:${chatflowPort}`;

let postCount = 0;

function tg(uid, chatId, updId, text) {
  return {
    update_id: updId,
    message: {
      message_id: 1,
      from: { id: uid, is_bot: false, first_name: 'N', last_name: 'T' },
      chat: { id: chatId, first_name: 'N', last_name: 'T', type: 'private' },
      date: Math.floor(Date.now() / 1000),
      text,
    },
  };
}

async function main() {
  const collector = http.createServer((req, res) => {
    if (req.method === 'POST') {
      postCount += 1;
      req.resume();
    }
    res.writeHead(200);
    res.end('ok');
  });

  await new Promise((resolve) => collector.listen(0, '127.0.0.1', resolve));
  const collectorPort = collector.address().port;
  const notifyBase = `http://127.0.0.1:${collectorPort}/hook`;

  const child = spawn(
    process.execPath,
    [join(root, 'dist', 'src', 'index.js')],
    {
      cwd: root,
      env: {
        ...process.env,
        PORT: String(chatflowPort),
        CHATFLOW_SAAS_ADMIN_TOKEN: token,
        CHATFLOW_LEAD_NOTIFY_URL: notifyBase,
        CHATFLOW_HANDOFF_NOTIFY_URL: notifyBase,
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
      collector.close();
      console.error('server exited early');
      process.exit(1);
    }
  }

  const slug = `notify-off-${Date.now()}`;
  const auth = `Bearer ${token}`;

  const r1 = await fetch(`${base}/saas/v1/admin/tenants`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: auth },
    body: JSON.stringify({ slug, name: 'Notify off verify' }),
  });
  if (!r1.ok) {
    child.kill();
    collector.close();
    console.error('create tenant failed', r1.status, await r1.text());
    process.exit(1);
  }

  const r2 = await fetch(`${base}/saas/v1/admin/tenants/${encodeURIComponent(slug)}/settings`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', authorization: auth },
    body: JSON.stringify({
      settings: { notify: { enabled: false }, handoff: { enabled: true } },
    }),
  });
  if (!r2.ok) {
    child.kill();
    collector.close();
    console.error('put settings failed', r2.status, await r2.text());
    process.exit(1);
  }

  const uid = 8800000 + Math.floor(Math.random() * 10000);
  const pathTg = `${base}/webhooks/t/${encodeURIComponent(slug)}/telegram`;

  const iso = new Date().toISOString();
  for (const body of [
    tg(uid, uid, 910001, 'weather is nice ' + iso),
    tg(uid, uid, 910002, 'tel: +1 555 123 4567'),
    tg(uid, uid, 910003, 'tel: +1 555 987 6543'),
    tg(uid, uid, 910004, 'my name is Alice Lee email: alice.lee@example.com'),
    tg(uid, uid, 910005, '我需要人工客服'),
  ]) {
    const r = await fetch(pathTg, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) {
      child.kill();
      collector.close();
      console.error('webhook failed', r.status, j);
      process.exit(1);
    }
    const sc = j.response?.debug_metadata?.saas_control;
    if (!sc?.notify_http_suppressed || sc.notify_enabled_effective !== false) {
      child.kill();
      collector.close();
      console.error('expected notify suppressed in saas_control', sc);
      process.exit(1);
    }
  }

  await new Promise((r) => setTimeout(r, 1200));

  child.kill();
  await new Promise((r) => child.once('exit', r));
  collector.close();

  if (postCount !== 0) {
    console.error('expected 0 notify POSTs, got', postCount);
    process.exit(1);
  }

  console.log(JSON.stringify({ ok: true, slug, notify_posts: postCount }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
