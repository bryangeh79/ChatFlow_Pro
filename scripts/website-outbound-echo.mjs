#!/usr/bin/env node
/**
 * Minimal HTTPS callback receiver for local Website outbound E2E (docs/153).
 * Run: npm run dev:website-outbound-echo
 * Then set WEBSITE_OUTBOUND_URL=http://127.0.0.1:<port> (see listen log) and restart ChatFlow Pro.
 */

import http from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';

const port = Number(process.env.WEBSITE_OUTBOUND_ECHO_PORT || '3847');
const verifySecret = process.env.WEBSITE_OUTBOUND_ECHO_SECRET?.trim() || '';

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'method_not_allowed' }));
    return;
  }

  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');

  let sigOk = null;
  if (verifySecret) {
    const hdr = req.headers['x-webhook-signature'];
    const expected =
      'sha256=' +
      createHmac('sha256', verifySecret).update(raw).digest('hex');
    if (typeof hdr === 'string' && hdr.length === expected.length) {
      try {
        sigOk = timingSafeEqual(Buffer.from(hdr, 'utf8'), Buffer.from(expected, 'utf8'));
      } catch {
        sigOk = false;
      }
    } else {
      sigOk = false;
    }
  }

  console.log('[website-outbound-echo] ---');
  console.log('[website-outbound-echo] X-Request-Id:', req.headers['x-request-id'] ?? '(none)');
  if (verifySecret) {
    console.log('[website-outbound-echo] signature_ok:', sigOk);
  }
  console.log('[website-outbound-echo] body:', raw.slice(0, 2000));

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true, received: true }));
});

server.listen(port, '127.0.0.1', () => {
  console.log(`[website-outbound-echo] listening on http://127.0.0.1:${port}`);
  console.log('[website-outbound-echo] Set WEBSITE_OUTBOUND_URL to the URL above (no trailing slash).');
  if (verifySecret) {
    console.log('[website-outbound-echo] Verifying X-Webhook-Signature with WEBSITE_OUTBOUND_ECHO_SECRET.');
  }
});
