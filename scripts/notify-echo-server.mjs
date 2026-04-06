#!/usr/bin/env node
/**
 * Local POST receiver for lead + handoff notify webhooks (docs/161).
 *
 * Run:
 *   npm run dev:notify-echo
 *
 * Then in .env (same machine):
 *   CHATFLOW_LEAD_NOTIFY_URL=http://127.0.0.1:<port>/notify
 *   CHATFLOW_HANDOFF_NOTIFY_URL=http://127.0.0.1:<port>/notify
 *
 * Secret headers are never printed — only length / presence.
 */

import http from 'node:http';

const port = Number(process.env.NOTIFY_ECHO_PORT || '3848');
const pathPrefix = (process.env.NOTIFY_ECHO_PATH_PREFIX || '/notify').replace(/\/$/, '') || '/notify';
const bodyLogMax = Number(process.env.NOTIFY_ECHO_BODY_LOG_MAX || '8000');

function redactHeader(name, value) {
  const n = name.toLowerCase();
  if (
    n.includes('secret') ||
    n === 'authorization' ||
    n === 'cookie' ||
    n === 'set-cookie'
  ) {
    const len = typeof value === 'string' ? value.length : 0;
    return `[REDACTED len=${len}]`;
  }
  return value;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? '127.0.0.1'}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'notify-echo' }));
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'method_not_allowed' }));
    return;
  }

  if (!url.pathname.startsWith(pathPrefix)) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'not_found' }));
    return;
  }

  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');

  console.log('[notify-echo] ==========', new Date().toISOString());
  console.log('[notify-echo] path:', url.pathname);
  for (const [k, v] of Object.entries(req.headers)) {
    if (v === undefined) continue;
    const val = Array.isArray(v) ? v.join(',') : v;
    console.log(`[notify-echo] ${k}:`, redactHeader(k, val));
  }

  let bodyOut = raw;
  if (bodyOut.length > bodyLogMax) {
    bodyOut = `${bodyOut.slice(0, bodyLogMax)}\n... [truncated, NOTIFY_ECHO_BODY_LOG_MAX=${bodyLogMax}]`;
  }
  try {
    const j = JSON.parse(raw);
    console.log('[notify-echo] body (json):', JSON.stringify(j, null, 2));
  } catch {
    console.log('[notify-echo] body (raw):', bodyOut || '(empty)');
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true, received: true }));
});

server.listen(port, '127.0.0.1', () => {
  const base = `http://127.0.0.1:${port}${pathPrefix}`;
  console.log(`[notify-echo] listening POST ${base}/*  (GET /health)`);
  console.log('[notify-echo] Example: CHATFLOW_LEAD_NOTIFY_URL=' + base);
  console.log('[notify-echo] Env: NOTIFY_ECHO_PORT, NOTIFY_ECHO_PATH_PREFIX, NOTIFY_ECHO_BODY_LOG_MAX');
});
