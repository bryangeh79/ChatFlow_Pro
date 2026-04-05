#!/usr/bin/env node
/**
 * Local / staging smoke: GET /health + minimal POST /webhooks/* per docs/129 flat samples.
 * Requires server already listening (e.g. npm run build && npm run start).
 *
 * Env:
 *   SMOKE_BASE_URL — default http://127.0.0.1:3030
 *   SMOKE_SKIP_WEBSITE=1 — skip POST /webhooks/website (use when WEBSITE_WEBHOOK_SIGNING_SECRET is set)
 *   SMOKE_SKIP_CHANNELS — comma list: website,telegram,whatsapp,messenger,line,zalo (e.g. when POST signature is enforced)
 */

const base = (process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3030').replace(/\/$/, '');

const skipSet = new Set(
  (process.env.SMOKE_SKIP_CHANNELS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);

/** Clear message when server is not running (ECONNREFUSED etc.). */
function wrapFetchError(err, targetUrl) {
  const code = err?.cause?.code || err?.code;
  if (code === 'ECONNREFUSED' || code === 'ENOTFOUND') {
    throw new Error(
      `Cannot reach ${targetUrl} (${code}). In another terminal: npm run build && npm run start — then re-run smoke (docs/152).`,
    );
  }
  const msg = String(err?.message || err);
  if (msg.includes('fetch failed') || msg.includes('ECONNREFUSED')) {
    throw new Error(
      `Cannot reach ${targetUrl}. Start server: npm run build && npm run start — then re-run smoke (docs/152).`,
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

const bodies = {
  website: {
    id: 'smoke-w-1',
    user_id: 'smoke-user-w',
    session_id: 'smoke-session-w',
    text: 'smoke test website',
    language: 'en',
    timestamp: '2026-04-03T10:57:00.000Z',
  },
  telegram: {
    update_id: 123456789,
    message: {
      message_id: 1,
      from: { id: 987654321, is_bot: false, first_name: 'Smoke', last_name: 'Test' },
      chat: { id: 987654321, first_name: 'Smoke', last_name: 'Test', type: 'private' },
      date: 1703275200,
      text: 'smoke telegram',
    },
  },
  whatsapp: {
    from: 'smoke-wa-user',
    conversation_id: 'smoke-wa-thread',
    id: 'smoke-wa-msg',
    text: 'smoke whatsapp',
    timestamp: '2026-04-03T10:57:00.000Z',
  },
  messenger: {
    sender: { id: 'smoke-fb-user', name: 'Smoke' },
    thread: { id: 'smoke-fb-thread' },
    text: 'smoke messenger',
    timestamp: '2026-04-03T10:57:00.000Z',
  },
  line: {
    userId: 'smoke-line-user',
    conversationId: 'smoke-line-conv',
    text: 'smoke line',
    timestamp: '2026-04-03T10:57:00.000Z',
  },
  zalo: {
    user_id: 'smoke-zalo-user',
    thread_id: 'smoke-zalo-thread',
    text: 'smoke zalo',
    timestamp: '2026-04-03T10:57:00.000Z',
  },
};

function checkJson(path, data) {
  if (typeof data?.ok !== 'boolean') {
    throw new Error(`${path}: expected top-level boolean ok`);
  }
  if (!data.ok && path !== '/health') {
    throw new Error(`${path}: ok=false ${JSON.stringify(data).slice(0, 200)}`);
  }
  if (data.ok && data.skipped === true) {
    return; // valid for some channels
  }
  if (data.ok && !data.skipped && path.startsWith('/webhooks/') && !data.error) {
    // processed path should have message or outbound evidence depending on channel
    if (!('message' in data) && !('sendResult' in data)) {
      throw new Error(`${path}: expected message or sendResult on ok response`);
    }
  }
}

async function run() {
  let failed = false;

  async function step(name, fn) {
    process.stdout.write(`[smoke] ${name} ... `);
    try {
      await fn();
      process.stdout.write('ok\n');
    } catch (e) {
      failed = true;
      process.stdout.write(`FAIL\n`);
      console.error(`  ${e.message || e}`);
    }
  }

  await step(`GET ${base}/health`, async () => {
    const res = await safeFetch(`${base}/health`);
    if (res.status !== 200) throw new Error(`status ${res.status}`);
    const rid = res.headers.get('x-request-id');
    if (!rid) throw new Error('missing X-Request-Id');
    const data = await res.json();
    if (!data.ok) throw new Error(JSON.stringify(data));
  });

  const skipWebsite = process.env.SMOKE_SKIP_WEBSITE === '1' || process.env.SMOKE_SKIP_WEBSITE === 'true';
  const webhookOrder = ['website', 'telegram', 'whatsapp', 'messenger', 'line', 'zalo'];

  for (const ch of webhookOrder) {
    if (skipSet.has(ch)) {
      process.stdout.write(`[smoke] POST /webhooks/${ch} ... skipped (SMOKE_SKIP_CHANNELS)\n`);
      continue;
    }
    if (ch === 'website' && skipWebsite) {
      process.stdout.write(`[smoke] POST /webhooks/website ... skipped (SMOKE_SKIP_WEBSITE)\n`);
      continue;
    }

    const path = `/webhooks/${ch}`;
    await step(`POST ${base}${path}`, async () => {
      const res = await safeFetch(`${base}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(bodies[ch]),
      });
      const rid = res.headers.get('x-request-id');
      if (!rid) throw new Error('missing X-Request-Id');

      if (res.status === 403) {
        throw new Error(
          `403 (likely POST signature on ${ch}) — set SMOKE_SKIP_CHANNELS=${ch} or SMOKE_SKIP_WEBSITE=1 (website), or run against env without verify secrets`,
        );
      }

      if (res.status !== 200) {
        const t = await res.text();
        throw new Error(`status ${res.status} body=${t.slice(0, 300)}`);
      }

      const data = await res.json();
      checkJson(path, data);
    });
  }

  if (failed) {
    console.error('\n[smoke] FAILED');
    process.exit(1);
  }
  console.log('\n[smoke] all passed');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
