/**
 * Phase 22C — tenant faq.fallback_enabled=false skips FAQ resolver fallbacks and default-phase text echo.
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

/** Avoid digit runs that match extractPhone() heuristics (e.g. 1[3-9]\\d{9} inside timestamps). */
const probe = `fbuqx${Array.from({ length: 16 }, () =>
  String.fromCharCode(97 + Math.floor(Math.random() * 26)),
).join('')}`;

function tg(uid, updId, text) {
  return {
    update_id: updId,
    message: {
      message_id: 1,
      from: {
        id: uid,
        is_bot: false,
        first_name: 'B',
        last_name: 'T',
        language_code: 'zh',
      },
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

  const slug = `faq-fb-off-${Date.now()}`;
  const auth = `Bearer ${token}`;

  const r1 = await fetch(`${base}/saas/v1/admin/tenants`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: auth },
    body: JSON.stringify({ slug, name: 'FAQ fallback off verify' }),
  });
  if (!r1.ok) {
    child.kill();
    console.error('create tenant failed', r1.status, await r1.text());
    process.exit(1);
  }

  const rSet = await fetch(`${base}/saas/v1/admin/tenants/${encodeURIComponent(slug)}/settings`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', authorization: auth },
    body: JSON.stringify({ settings: { faq: { fallback_enabled: false } } }),
  });
  if (!rSet.ok) {
    child.kill();
    console.error('put settings failed', rSet.status, await rSet.text());
    process.exit(1);
  }

  const rFaqEnOnly = await fetch(`${base}/saas/v1/admin/tenants/${encodeURIComponent(slug)}/faq`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', authorization: auth },
    body: JSON.stringify({
      entries: [
        {
          id: 'en-only',
          language: 'en',
          topic: 'probe',
          question: 'question en',
          answer: 'EN_ONLY_ANSWER',
          keywords: [probe],
        },
      ],
    }),
  });
  if (!rFaqEnOnly.ok) {
    child.kill();
    console.error('put faq failed', rFaqEnOnly.status, await rFaqEnOnly.text());
    process.exit(1);
  }

  const uid = 8800000 + Math.floor(Math.random() * 10000);
  const pathTg = `${base}/webhooks/t/${encodeURIComponent(slug)}/telegram`;

  const rMiss = await fetch(pathTg, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(tg(uid, 950001, probe)),
  });
  const jMiss = await rMiss.json().catch(() => ({}));
  if (!rMiss.ok || !jMiss.ok) {
    child.kill();
    console.error('webhook miss failed', rMiss.status, jMiss);
    process.exit(1);
  }

  const sc1 = jMiss.response?.debug_metadata?.saas_control;
  const meta1 = jMiss.response?.debug_metadata;
  if (jMiss.response?.should_send !== false) {
    child.kill();
    console.error('expected should_send false (no FAQ fallback echo)', jMiss.response?.should_send);
    process.exit(1);
  }
  if (jMiss.response?.reply_text != null && String(jMiss.response.reply_text).trim() !== '') {
    child.kill();
    console.error('expected empty reply_text', jMiss.response?.reply_text);
    process.exit(1);
  }
  if (!Array.isArray(meta1?.debug_steps) || !meta1.debug_steps.includes('faq_no_match')) {
    child.kill();
    console.error('expected faq_no_match', meta1?.debug_steps);
    process.exit(1);
  }
  if (sc1?.faq_fallback_suppressed !== true || sc1.faq_fallback_enabled !== false) {
    child.kill();
    console.error('unexpected saas_control faq fallback flags (miss)', sc1);
    process.exit(1);
  }

  const rFaqZh = await fetch(`${base}/saas/v1/admin/tenants/${encodeURIComponent(slug)}/faq`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', authorization: auth },
    body: JSON.stringify({
      entries: [
        {
          id: 'en-only',
          language: 'en',
          topic: 'probe',
          question: 'question en',
          answer: 'EN_ONLY_ANSWER',
          keywords: [probe],
        },
        {
          id: 'zh-hit',
          language: 'zh',
          topic: 'probe',
          question: 'question zh',
          answer: 'ZH_PRIMARY_HIT',
          keywords: [probe],
        },
      ],
    }),
  });
  if (!rFaqZh.ok) {
    child.kill();
    console.error('put faq zh failed', rFaqZh.status, await rFaqZh.text());
    process.exit(1);
  }

  const rHit = await fetch(pathTg, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(tg(uid, 950002, probe)),
  });
  const jHit = await rHit.json().catch(() => ({}));
  if (!rHit.ok || !jHit.ok) {
    child.kill();
    console.error('webhook hit failed', rHit.status, jHit);
    process.exit(1);
  }
  if (jHit.response?.should_send !== true) {
    child.kill();
    console.error('expected should_send true on zh-tier FAQ hit', jHit.response?.should_send);
    process.exit(1);
  }
  if (!String(jHit.response?.reply_text || '').includes('ZH_PRIMARY_HIT')) {
    child.kill();
    console.error('expected ZH_PRIMARY_HIT in reply', jHit.response?.reply_text);
    process.exit(1);
  }
  const meta2 = jHit.response?.debug_metadata;
  if (!Array.isArray(meta2?.debug_steps) || !meta2.debug_steps.includes('faq_hit')) {
    child.kill();
    console.error('expected faq_hit', meta2?.debug_steps);
    process.exit(1);
  }

  child.kill();
  await new Promise((r) => child.once('exit', r));

  console.log(JSON.stringify({ ok: true, slug, miss_no_echo: true, zh_tier_hit: true }));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
