#!/usr/bin/env node
/**
 * One-shot local staging: docker compose up → wait /health → smoke:webhooks → verify:lead-capture-states (Website+Telegram) → compose down.
 * Requires Docker Compose v2 + Node on the host (same as docs/158).
 *
 * Env:
 *   STAGING_HOST_PORT — host port mapped to 3030 (default 3030); use 3031 if 3030 is busy
 *   SMOKE_BASE_URL — if unset, derived as http://127.0.0.1:<STAGING_HOST_PORT>
 *   STAGING_WAIT_MS — max wait for /health (default 120000)
 *   STAGING_COMPOSE_DOWN=0 — skip `docker compose down` (leave stack running)
 *   STAGING_USE_LOCAL_ENV=1 — use `docker-compose.local-credentials.yml` (loads `.env` in container).
 *     If SMOKE_SKIP_CHANNELS is unset, defaults to whatsapp,messenger,line (POST signature).
 */

import { execSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const useLocalEnv = ['1', 'true', 'yes'].includes(
  (process.env.STAGING_USE_LOCAL_ENV || '').trim().toLowerCase(),
);
if (useLocalEnv && process.env.SMOKE_SKIP_CHANNELS === undefined) {
  process.env.SMOKE_SKIP_CHANNELS = 'whatsapp,messenger,line';
}

const composeCmdBase = useLocalEnv
  ? 'docker compose -f docker-compose.yml -f docker-compose.local-credentials.yml'
  : 'docker compose';

const hostPort = process.env.STAGING_HOST_PORT || '3030';
// Local compose always maps to 127.0.0.1:<hostPort>. If the shell has a stale SMOKE_BASE_URL (e.g. :3030),
// it must not override when STAGING_HOST_PORT is set explicitly.
if (process.env.STAGING_HOST_PORT) {
  process.env.SMOKE_BASE_URL = `http://127.0.0.1:${hostPort}`;
} else if (!process.env.SMOKE_BASE_URL) {
  process.env.SMOKE_BASE_URL = `http://127.0.0.1:3030`;
}

const base = process.env.SMOKE_BASE_URL.replace(/\/$/, '');
const healthUrl = `${base}/health`;
const maxWaitMs = Number(process.env.STAGING_WAIT_MS || 120000);
const intervalMs = 2000;
const skipDown = process.env.STAGING_COMPOSE_DOWN === '0' || process.env.STAGING_COMPOSE_DOWN === 'false';

/** Compose file uses ${STAGING_HOST_PORT:-3030}; always inject so Windows shells/npm do not drop it. */
const composeEnv = { ...process.env, STAGING_HOST_PORT: hostPort };

function sh(cmd, env = process.env) {
  execSync(cmd, { stdio: 'inherit', shell: true, env });
}

async function waitHealth() {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const r = await fetch(healthUrl, { signal: AbortSignal.timeout(5000) });
      if (r.ok) {
        console.log(`staging-docker-smoke: ${healthUrl} OK`);
        return;
      }
    } catch {
      /* retry */
    }
    await delay(intervalMs);
  }
  throw new Error(`staging-docker-smoke: timeout waiting for ${healthUrl} (${maxWaitMs}ms)`);
}

async function main() {
  console.log(
    `staging-docker-smoke: STAGING_HOST_PORT=${hostPort} SMOKE_BASE_URL=${base}${useLocalEnv ? ' STAGING_USE_LOCAL_ENV=1' : ''}${process.env.SMOKE_SKIP_CHANNELS ? ` SMOKE_SKIP_CHANNELS=${process.env.SMOKE_SKIP_CHANNELS}` : ''}`,
  );
  let upOk = false;
  try {
    sh(`${composeCmdBase} up -d --build`, composeEnv);
    upOk = true;
    await waitHealth();
    sh('npm run smoke:webhooks');
    sh('npm run verify:lead-capture-states');
    console.log('staging-docker-smoke: done');
  } finally {
    if (upOk && !skipDown) {
      try {
        sh(`${composeCmdBase} down`, composeEnv);
      } catch {
        console.error('staging-docker-smoke: docker compose down failed (containers may still be running)');
      }
    } else if (skipDown) {
      console.log('staging-docker-smoke: STAGING_COMPOSE_DOWN=0 — leaving compose stack up');
    }
  }
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exitCode = 1;
});
