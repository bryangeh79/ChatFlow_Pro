#!/usr/bin/env node
/**
 * T2 ladder (docs/158): compose with `.env` + smoke with default SMOKE_SKIP_CHANNELS for signed routes.
 * Cross-platform wrapper (sets env then runs staging-docker-smoke.mjs).
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...process.env, STAGING_USE_LOCAL_ENV: '1' };
if (env.SMOKE_SKIP_CHANNELS === undefined || env.SMOKE_SKIP_CHANNELS === '') {
  env.SMOKE_SKIP_CHANNELS = 'whatsapp,messenger,line';
}
const script = path.join(root, 'scripts', 'staging-docker-smoke.mjs');
const r = spawnSync(process.execPath, [script], { cwd: root, env, stdio: 'inherit' });
process.exit(r.status ?? 1);
