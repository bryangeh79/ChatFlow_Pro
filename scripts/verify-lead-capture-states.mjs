#!/usr/bin/env node
/**
 * Minimal lead-capture state checks (memory/36) against a running server.
 * POST /webhooks/website and /webhooks/telegram — same unified pipeline.
 *
 * Env (align with smoke-webhooks.mjs):
 *   SMOKE_BASE_URL — default http://127.0.0.1:3030
 *   SMOKE_SKIP_WEBSITE=1 — skip Website triplet
 *   SMOKE_SKIP_TELEGRAM_LEAD=1 — skip Telegram triplet
 *   SMOKE_SKIP_CHANNELS — if it contains `telegram` (comma list), Telegram triplet is skipped
 */

const base = (process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3030').replace(/\/$/, '');

const skipChannelSet = new Set(
  (process.env.SMOKE_SKIP_CHANNELS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);

function wrapFetchError(err, targetUrl) {
  const code = err?.cause?.code || err?.code;
  if (code === 'ECONNREFUSED' || code === 'ENOTFOUND') {
    throw new Error(
      `Cannot reach ${targetUrl} (${code}). Start server or run after smoke (docs/158).`,
    );
  }
  throw err;
}

async function safeFetch(url, init) {
  try {
    return await fetch(url, init);
  } catch (e) {
    wrapFetchError(e, url);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function postJson(path, body) {
  const res = await safeFetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 403 && path.includes('website')) {
    throw new Error(
      '403 on /webhooks/website — set SMOKE_SKIP_WEBSITE=1 or unset WEBSITE_WEBHOOK_SIGNING_SECRET for this check.',
    );
  }
  assert(res.status === 200, `${path}: expected 200, got ${res.status}`);
  const data = await res.json();
  assert(data?.ok === true, `${path}: expected ok=true, got ${JSON.stringify(data).slice(0, 200)}`);
  assert(data.session?.lead_capture_state, `${path}: missing session.lead_capture_state`);
  return data;
}

/** Flat Telegram body (see `src/webhooks/telegram.mock.ts` / adapter). */
function tgBody(updateId, fromId, chatId, text, tsIso) {
  return {
    update_id: updateId,
    from: { id: fromId, username: 'lead_verify', language_code: 'en' },
    chat: { id: chatId },
    text,
    timestamp: tsIso,
  };
}

async function verifyWebsite(ts) {
  const userNone = `lead-none-${ts}`;
  const userPartial = `lead-partial-${ts}`;
  const userCap = `lead-cap-${ts}`;
  const sessCap = `sess-cap-${ts}`;
  const iso = () => new Date().toISOString();

  const rNone = await postJson('/webhooks/website', {
    id: `id-${ts}-1`,
    user_id: userNone,
    session_id: `s-${ts}-1`,
    text: 'just talking about the weather today',
    language: 'en',
    timestamp: iso(),
  });
  assert(
    rNone.session.lead_capture_state.status === 'none',
    `website: expected none, got ${rNone.session.lead_capture_state.status}`,
  );

  const rPart = await postJson('/webhooks/website', {
    id: `id-${ts}-2`,
    user_id: userPartial,
    session_id: `s-${ts}-2`,
    text: 'tel: +1 555 123 4567',
    language: 'en',
    timestamp: iso(),
  });
  assert(
    rPart.session.lead_capture_state.status === 'partial',
    `website: expected partial, got ${rPart.session.lead_capture_state.status}`,
  );
  assert(Array.isArray(rPart.session.lead_capture_state.missing_fields), 'website: expected missing_fields');

  await postJson('/webhooks/website', {
    id: `id-${ts}-3a`,
    user_id: userCap,
    session_id: sessCap,
    text: 'tel: +1 555 987 6543',
    language: 'en',
    timestamp: iso(),
  });
  const rCap = await postJson('/webhooks/website', {
    id: `id-${ts}-3b`,
    user_id: userCap,
    session_id: sessCap,
    text: 'my name is Alice Lee email: alice.lee@example.com',
    language: 'en',
    timestamp: iso(),
  });
  assert(
    rCap.session.lead_capture_state.status === 'captured',
    `website: expected captured, got ${rCap.session.lead_capture_state.status}`,
  );
  const cf = rCap.session.lead_capture_state.collected_fields || {};
  assert(cf.name && cf.phone && cf.email, `website: collected_fields ${JSON.stringify(cf)}`);
  const meta = rCap.response?.debug_metadata?.leadCaptureResult;
  assert(meta?.status === 'captured', 'website: leadCaptureResult.status');

  console.log('[lead-verify] website: none → partial → captured OK');
}

async function verifyTelegram(ts) {
  const iso = () => new Date().toISOString();
  const uidNone = `tg-none-${ts}`;
  const cidNone = `tg-chat-none-${ts}`;
  const uidPart = `tg-part-${ts}`;
  const cidPart = `tg-chat-part-${ts}`;
  const uidCap = `tg-cap-${ts}`;
  const cidCap = `tg-chat-cap-${ts}`;

  const rNone = await postJson(
    '/webhooks/telegram',
    tgBody(`upd-${ts}-1`, uidNone, cidNone, 'just talking about the weather today', iso()),
  );
  assert(
    rNone.session.lead_capture_state.status === 'none',
    `telegram: expected none, got ${rNone.session.lead_capture_state.status}`,
  );

  const rPart = await postJson(
    '/webhooks/telegram',
    tgBody(`upd-${ts}-2`, uidPart, cidPart, 'tel: +1 555 123 4567', iso()),
  );
  assert(
    rPart.session.lead_capture_state.status === 'partial',
    `telegram: expected partial, got ${rPart.session.lead_capture_state.status}`,
  );
  assert(Array.isArray(rPart.session.lead_capture_state.missing_fields), 'telegram: expected missing_fields');

  await postJson(
    '/webhooks/telegram',
    tgBody(`upd-${ts}-3a`, uidCap, cidCap, 'tel: +1 555 987 6543', iso()),
  );
  const rCap = await postJson(
    '/webhooks/telegram',
    tgBody(
      `upd-${ts}-3b`,
      uidCap,
      cidCap,
      'my name is Alice Lee email: alice.lee@example.com',
      iso(),
    ),
  );
  assert(
    rCap.session.lead_capture_state.status === 'captured',
    `telegram: expected captured, got ${rCap.session.lead_capture_state.status}`,
  );
  const cf = rCap.session.lead_capture_state.collected_fields || {};
  assert(cf.name && cf.phone && cf.email, `telegram: collected_fields ${JSON.stringify(cf)}`);
  const meta = rCap.response?.debug_metadata?.leadCaptureResult;
  assert(meta?.status === 'captured', 'telegram: leadCaptureResult.status');

  console.log('[lead-verify] telegram: none → partial → captured OK');
}

async function main() {
  const skipWebsite =
    process.env.SMOKE_SKIP_WEBSITE === '1' || process.env.SMOKE_SKIP_WEBSITE === 'true';
  const skipTelegram =
    process.env.SMOKE_SKIP_TELEGRAM_LEAD === '1' ||
    process.env.SMOKE_SKIP_TELEGRAM_LEAD === 'true' ||
    skipChannelSet.has('telegram');

  if (skipWebsite && skipTelegram) {
    console.log('[lead-verify] skipped (SMOKE_SKIP_WEBSITE and telegram triplet both off)');
    return;
  }

  const ts = Date.now();
  process.stdout.write(`[lead-verify] SMOKE_BASE_URL=${base}\n`);

  if (!skipWebsite) await verifyWebsite(ts);
  else console.log('[lead-verify] website: skipped (SMOKE_SKIP_WEBSITE)');

  if (!skipTelegram) await verifyTelegram(ts);
  else console.log('[lead-verify] telegram: skipped (SMOKE_SKIP_TELEGRAM_LEAD or SMOKE_SKIP_CHANNELS)');

  console.log('[lead-verify] all passed');
}

main().catch((e) => {
  console.error('[lead-verify] FAILED:', e?.message || e);
  process.exit(1);
});
