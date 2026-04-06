#!/usr/bin/env node
/**
 * GET /health against a running ChatFlow Pro instance (ops smoke).
 * Default: http://127.0.0.1:3030/health
 *
 * HEALTH_CHECK_URL  full URL override (e.g. https://chatflow.example.com/health)
 */

const url =
  process.env.HEALTH_CHECK_URL?.trim() ||
  `http://127.0.0.1:${process.env.PORT?.trim() || '3030'}/health`;

try {
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  const text = await res.text();
  if (!res.ok) {
    console.error('health:curl FAILED', res.status, url, text.slice(0, 200));
    process.exit(1);
  }
  console.log('health:curl OK', res.status, url, text.slice(0, 120));
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error('health:curl FAILED', url, msg);
  process.exit(1);
}
