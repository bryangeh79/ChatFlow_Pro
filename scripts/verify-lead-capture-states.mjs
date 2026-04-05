#!/usr/bin/env node
/**
 * Minimal lead-capture state checks (memory/36) against a running server.
 * Uses POST /webhooks/website only — same unified pipeline as other channels.
 *
 * Env (align with smoke-webhooks.mjs):
 *   SMOKE_BASE_URL — default http://127.0.0.1:3030
 *   SMOKE_SKIP_WEBSITE=1 — skip all checks here
 */

const base = (process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3030').replace(/\/$/, '');

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

async function postWebsite(body) {
  const res = await safeFetch(`${base}/webhooks/website`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 403) {
    throw new Error(
      '403 on /webhooks/website — set SMOKE_SKIP_WEBSITE=1 or unset WEBSITE_WEBHOOK_SIGNING_SECRET for this check.',
    );
  }
  assert(res.status === 200, `expected 200, got ${res.status}`);
  const data = await res.json();
  assert(data?.ok === true, `expected ok=true, got ${JSON.stringify(data).slice(0, 200)}`);
  assert(data.session?.lead_capture_state, 'missing session.lead_capture_state');
  return data;
}

async function main() {
  const skip =
    process.env.SMOKE_SKIP_WEBSITE === '1' || process.env.SMOKE_SKIP_WEBSITE === 'true';
  if (skip) {
    console.log('[lead-verify] skipped (SMOKE_SKIP_WEBSITE)');
    return;
  }

  const ts = Date.now();
  const userNone = `lead-none-${ts}`;
  const userPartial = `lead-partial-${ts}`;
  const userCap = `lead-cap-${ts}`;
  const sessCap = `sess-cap-${ts}`;

  process.stdout.write(`[lead-verify] SMOKE_BASE_URL=${base}\n`);

  // none: no contact intent / no extractable fields
  const rNone = await postWebsite({
    id: `id-${ts}-1`,
    user_id: userNone,
    session_id: `s-${ts}-1`,
    text: 'just talking about the weather today',
    language: 'en',
    timestamp: new Date().toISOString(),
  });
  assert(
    rNone.session.lead_capture_state.status === 'none',
    `expected lead status none, got ${rNone.session.lead_capture_state.status}`,
  );

  // partial: detectable phone only (avoid FAQ seed keywords like "contact" / "get in touch")
  const rPart = await postWebsite({
    id: `id-${ts}-2`,
    user_id: userPartial,
    session_id: `s-${ts}-2`,
    text: 'tel: +1 555 123 4567',
    language: 'en',
    timestamp: new Date().toISOString(),
  });
  assert(
    rPart.session.lead_capture_state.status === 'partial',
    `expected partial, got ${rPart.session.lead_capture_state.status}`,
  );
  assert(
    Array.isArray(rPart.session.lead_capture_state.missing_fields),
    'expected missing_fields array on partial',
  );

  // captured: second turn merges name + email
  await postWebsite({
    id: `id-${ts}-3a`,
    user_id: userCap,
    session_id: sessCap,
    text: 'tel: +1 555 987 6543',
    language: 'en',
    timestamp: new Date().toISOString(),
  });
  const rCap = await postWebsite({
    id: `id-${ts}-3b`,
    user_id: userCap,
    session_id: sessCap,
    text: 'my name is Alice Lee email: alice.lee@example.com',
    language: 'en',
    timestamp: new Date().toISOString(),
  });
  assert(
    rCap.session.lead_capture_state.status === 'captured',
    `expected captured, got ${rCap.session.lead_capture_state.status}`,
  );
  const cf = rCap.session.lead_capture_state.collected_fields || {};
  assert(cf.name && cf.phone && cf.email, `expected name+phone+email in collected_fields, got ${JSON.stringify(cf)}`);

  const meta = rCap.response?.debug_metadata?.leadCaptureResult;
  assert(meta?.status === 'captured', 'debug_metadata.leadCaptureResult.status should be captured');

  console.log('[lead-verify] all passed (none → partial → captured)');
}

main().catch((e) => {
  console.error('[lead-verify] FAILED:', e?.message || e);
  process.exit(1);
});
