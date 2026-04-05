#!/usr/bin/env node
/**
 * Minimal lead-capture state checks (memory/36) against a running server.
 * POST /webhooks/* — same unified pipeline (flat bodies per docs/129 / smoke-webhooks.mjs).
 *
 * Env (align with smoke-webhooks.mjs):
 *   SMOKE_BASE_URL — default http://127.0.0.1:3030
 *   SMOKE_SKIP_WEBSITE=1 — skip Website triplet
 *   SMOKE_SKIP_TELEGRAM_LEAD=1 — skip Telegram triplet
 *   SMOKE_SKIP_WHATSAPP_LEAD=1 — skip WhatsApp triplet
 *   SMOKE_SKIP_MESSENGER_LEAD=1 — skip Messenger triplet
 *   SMOKE_SKIP_LINE_LEAD=1 — skip Line triplet
 *   SMOKE_SKIP_ZALO_LEAD=1 — skip Zalo triplet
 *   SMOKE_SKIP_CHANNELS — comma list; channel names skip matching triplets
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
  if (res.status === 403 && path.includes('whatsapp')) {
    throw new Error(
      '403 on /webhooks/whatsapp — set SMOKE_SKIP_WHATSAPP_LEAD=1 or SMOKE_SKIP_CHANNELS=whatsapp, or relax Meta POST signature env for this check.',
    );
  }
  if (res.status === 403 && path.includes('messenger')) {
    throw new Error(
      '403 on /webhooks/messenger — set SMOKE_SKIP_MESSENGER_LEAD=1 or SMOKE_SKIP_CHANNELS=messenger, or relax Meta POST signature env for this check.',
    );
  }
  if (res.status === 403 && path.includes('/webhooks/line')) {
    throw new Error(
      '403 on /webhooks/line — set SMOKE_SKIP_LINE_LEAD=1 or SMOKE_SKIP_CHANNELS=line, or unset LINE_CHANNEL_SECRET for this check.',
    );
  }
  assert(res.status === 200, `${path}: expected 200, got ${res.status}`);
  const data = await res.json();
  assert(data?.ok === true, `${path}: expected ok=true, got ${JSON.stringify(data).slice(0, 200)}`);
  assert(data.session?.lead_capture_state, `${path}: missing session.lead_capture_state`);
  return data;
}

/**
 * Shared none → partial → captured assertions (memory/36).
 * @param {(ts: number, iso: () => string) => { none: object, partial: object, cap1: object, cap2: object }} buildBodies
 */
async function verifyLeadTriplet(ts, channelLabel, path, buildBodies) {
  const iso = () => new Date().toISOString();
  const { none, partial, cap1, cap2 } = buildBodies(ts, iso);

  const rNone = await postJson(path, none);
  assert(
    rNone.session.lead_capture_state.status === 'none',
    `${channelLabel}: expected none, got ${rNone.session.lead_capture_state.status}`,
  );

  const rPart = await postJson(path, partial);
  assert(
    rPart.session.lead_capture_state.status === 'partial',
    `${channelLabel}: expected partial, got ${rPart.session.lead_capture_state.status}`,
  );
  assert(
    Array.isArray(rPart.session.lead_capture_state.missing_fields),
    `${channelLabel}: expected missing_fields`,
  );

  await postJson(path, cap1);
  const rCap = await postJson(path, cap2);
  assert(
    rCap.session.lead_capture_state.status === 'captured',
    `${channelLabel}: expected captured, got ${rCap.session.lead_capture_state.status}`,
  );
  const cf = rCap.session.lead_capture_state.collected_fields || {};
  assert(cf.name && cf.phone && cf.email, `${channelLabel}: collected_fields ${JSON.stringify(cf)}`);
  const meta = rCap.response?.debug_metadata?.leadCaptureResult;
  assert(meta?.status === 'captured', `${channelLabel}: leadCaptureResult.status`);

  console.log(`[lead-verify] ${channelLabel}: none → partial → captured OK`);
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
  await verifyLeadTriplet(ts, 'website', '/webhooks/website', (t, iso) => ({
    none: {
      id: `id-${t}-1`,
      user_id: userNone,
      session_id: `s-${t}-1`,
      text: 'just talking about the weather today',
      language: 'en',
      timestamp: iso(),
    },
    partial: {
      id: `id-${t}-2`,
      user_id: userPartial,
      session_id: `s-${t}-2`,
      text: 'tel: +1 555 123 4567',
      language: 'en',
      timestamp: iso(),
    },
    cap1: {
      id: `id-${t}-3a`,
      user_id: userCap,
      session_id: sessCap,
      text: 'tel: +1 555 987 6543',
      language: 'en',
      timestamp: iso(),
    },
    cap2: {
      id: `id-${t}-3b`,
      user_id: userCap,
      session_id: sessCap,
      text: 'my name is Alice Lee email: alice.lee@example.com',
      language: 'en',
      timestamp: iso(),
    },
  }));
}

async function verifyTelegram(ts) {
  await verifyLeadTriplet(ts, 'telegram', '/webhooks/telegram', (t, iso) => ({
    none: tgBody(
      `upd-${t}-1`,
      `tg-none-${t}`,
      `tg-chat-none-${t}`,
      'just talking about the weather today',
      iso(),
    ),
    partial: tgBody(`upd-${t}-2`, `tg-part-${t}`, `tg-chat-part-${t}`, 'tel: +1 555 123 4567', iso()),
    cap1: tgBody(`upd-${t}-3a`, `tg-cap-${t}`, `tg-chat-cap-${t}`, 'tel: +1 555 987 6543', iso()),
    cap2: tgBody(
      `upd-${t}-3b`,
      `tg-cap-${t}`,
      `tg-chat-cap-${t}`,
      'my name is Alice Lee email: alice.lee@example.com',
      iso(),
    ),
  }));
}

/** Flat WhatsApp body (see `scripts/smoke-webhooks.mjs` / `WhatsAppRawInboundEvent`). */
function waBody(from, conversationId, id, text, tsIso) {
  return {
    from,
    conversation_id: conversationId,
    id,
    text,
    timestamp: tsIso,
  };
}

async function verifyWhatsApp(ts) {
  await verifyLeadTriplet(ts, 'whatsapp', '/webhooks/whatsapp', (t, iso) => ({
    none: waBody(
      `wa-none-${t}`,
      `wa-sess-none-${t}`,
      `wa-msg-${t}-n`,
      'just talking about the weather today',
      iso(),
    ),
    partial: waBody(`wa-part-${t}`, `wa-sess-part-${t}`, `wa-msg-${t}-p`, 'tel: +1 555 123 4567', iso()),
    cap1: waBody(`wa-cap-${t}`, `wa-sess-cap-${t}`, `wa-msg-${t}-c1`, 'tel: +1 555 987 6543', iso()),
    cap2: waBody(
      `wa-cap-${t}`,
      `wa-sess-cap-${t}`,
      `wa-msg-${t}-c2`,
      'my name is Alice Lee email: alice.lee@example.com',
      iso(),
    ),
  }));
}

/** Flat Messenger body (`MessengerRawInboundEvent`). */
function msBody(senderId, threadId, mid, text, tsIso) {
  return {
    sender: { id: senderId, name: 'lead_verify' },
    thread: { id: threadId },
    mid,
    text,
    timestamp: tsIso,
  };
}

async function verifyMessenger(ts) {
  await verifyLeadTriplet(ts, 'messenger', '/webhooks/messenger', (t, iso) => ({
    none: msBody(`msg-none-${t}`, `msg-th-none-${t}`, `m-${t}-n`, 'just talking about the weather today', iso()),
    partial: msBody(`msg-part-${t}`, `msg-th-part-${t}`, `m-${t}-p`, 'tel: +1 555 123 4567', iso()),
    cap1: msBody(`msg-cap-${t}`, `msg-th-cap-${t}`, `m-${t}-c1`, 'tel: +1 555 987 6543', iso()),
    cap2: msBody(
      `msg-cap-${t}`,
      `msg-th-cap-${t}`,
      `m-${t}-c2`,
      'my name is Alice Lee email: alice.lee@example.com',
      iso(),
    ),
  }));
}

/** Flat Line body (`LineRawInboundEvent`). */
function lineBody(userId, conversationId, id, text, tsIso) {
  return {
    userId,
    conversationId,
    id,
    text,
    timestamp: tsIso,
  };
}

async function verifyLine(ts) {
  await verifyLeadTriplet(ts, 'line', '/webhooks/line', (t, iso) => ({
    none: lineBody(
      `line-u-none-${t}`,
      `line-c-none-${t}`,
      `line-${t}-n`,
      'just talking about the weather today',
      iso(),
    ),
    partial: lineBody(
      `line-u-part-${t}`,
      `line-c-part-${t}`,
      `line-${t}-p`,
      'tel: +1 555 123 4567',
      iso(),
    ),
    cap1: lineBody(
      `line-u-cap-${t}`,
      `line-c-cap-${t}`,
      `line-${t}-c1`,
      'tel: +1 555 987 6543',
      iso(),
    ),
    cap2: lineBody(
      `line-u-cap-${t}`,
      `line-c-cap-${t}`,
      `line-${t}-c2`,
      'my name is Alice Lee email: alice.lee@example.com',
      iso(),
    ),
  }));
}

/** Flat Zalo body (`ZaloRawInboundEvent`). */
function zaloBody(userId, threadId, id, text, tsIso) {
  return {
    user_id: userId,
    thread_id: threadId,
    id,
    text,
    timestamp: tsIso,
  };
}

async function verifyZalo(ts) {
  await verifyLeadTriplet(ts, 'zalo', '/webhooks/zalo', (t, iso) => ({
    none: zaloBody(
      `zalo-u-none-${t}`,
      `zalo-th-none-${t}`,
      `zalo-${t}-n`,
      'just talking about the weather today',
      iso(),
    ),
    partial: zaloBody(
      `zalo-u-part-${t}`,
      `zalo-th-part-${t}`,
      `zalo-${t}-p`,
      'tel: +1 555 123 4567',
      iso(),
    ),
    cap1: zaloBody(
      `zalo-u-cap-${t}`,
      `zalo-th-cap-${t}`,
      `zalo-${t}-c1`,
      'tel: +1 555 987 6543',
      iso(),
    ),
    cap2: zaloBody(
      `zalo-u-cap-${t}`,
      `zalo-th-cap-${t}`,
      `zalo-${t}-c2`,
      'my name is Alice Lee email: alice.lee@example.com',
      iso(),
    ),
  }));
}

async function main() {
  const skipWebsite =
    process.env.SMOKE_SKIP_WEBSITE === '1' || process.env.SMOKE_SKIP_WEBSITE === 'true';
  const skipTelegram =
    process.env.SMOKE_SKIP_TELEGRAM_LEAD === '1' ||
    process.env.SMOKE_SKIP_TELEGRAM_LEAD === 'true' ||
    skipChannelSet.has('telegram');
  const skipWhatsapp =
    process.env.SMOKE_SKIP_WHATSAPP_LEAD === '1' ||
    process.env.SMOKE_SKIP_WHATSAPP_LEAD === 'true' ||
    skipChannelSet.has('whatsapp');
  const skipMessenger =
    process.env.SMOKE_SKIP_MESSENGER_LEAD === '1' ||
    process.env.SMOKE_SKIP_MESSENGER_LEAD === 'true' ||
    skipChannelSet.has('messenger');
  const skipLine =
    process.env.SMOKE_SKIP_LINE_LEAD === '1' ||
    process.env.SMOKE_SKIP_LINE_LEAD === 'true' ||
    skipChannelSet.has('line');
  const skipZalo =
    process.env.SMOKE_SKIP_ZALO_LEAD === '1' ||
    process.env.SMOKE_SKIP_ZALO_LEAD === 'true' ||
    skipChannelSet.has('zalo');

  if (
    skipWebsite &&
    skipTelegram &&
    skipWhatsapp &&
    skipMessenger &&
    skipLine &&
    skipZalo
  ) {
    console.log('[lead-verify] skipped (all channel triplets off)');
    return;
  }

  const ts = Date.now();
  process.stdout.write(`[lead-verify] SMOKE_BASE_URL=${base}\n`);

  if (!skipWebsite) await verifyWebsite(ts);
  else console.log('[lead-verify] website: skipped (SMOKE_SKIP_WEBSITE)');

  if (!skipTelegram) await verifyTelegram(ts);
  else console.log('[lead-verify] telegram: skipped (SMOKE_SKIP_TELEGRAM_LEAD or SMOKE_SKIP_CHANNELS)');

  if (!skipWhatsapp) await verifyWhatsApp(ts);
  else console.log('[lead-verify] whatsapp: skipped (SMOKE_SKIP_WHATSAPP_LEAD or SMOKE_SKIP_CHANNELS)');

  if (!skipMessenger) await verifyMessenger(ts);
  else console.log('[lead-verify] messenger: skipped (SMOKE_SKIP_MESSENGER_LEAD or SMOKE_SKIP_CHANNELS)');

  if (!skipLine) await verifyLine(ts);
  else console.log('[lead-verify] line: skipped (SMOKE_SKIP_LINE_LEAD or SMOKE_SKIP_CHANNELS)');

  if (!skipZalo) await verifyZalo(ts);
  else console.log('[lead-verify] zalo: skipped (SMOKE_SKIP_ZALO_LEAD or SMOKE_SKIP_CHANNELS)');

  console.log('[lead-verify] all passed');
}

main().catch((e) => {
  console.error('[lead-verify] FAILED:', e?.message || e);
  process.exit(1);
});
