#!/usr/bin/env node
/**
 * Read-only release verification (no new artifacts).
 *
 * Checks:
 * 1) npm run check:go-live
 * 2) npm run report:agent-git
 * 3) npm run report:github-ci
 * 4) required delivery docs exist
 */

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const requiredFiles = [
  'docs/161_phase17_notify_webhooks.md',
  'docs/162_customer_seven_channel_access_token_guide.pdf',
  'docs/168_pro_two_day_go_live_checklist.md',
  'docs/169_pro_commercial_one_customer_one_deploy.md',
  'docs/170_pro_customer_ops_runbook.md',
  'docs/171_pro_vendor_release_checklist.md',
  'docs/172_pro_https_reverse_proxy_caddy_nginx.md',
  '.env.example',
];

for (const rel of requiredFiles) {
  const full = path.join(root, rel);
  if (!existsSync(full)) {
    console.error(`[release:verify] missing required file: ${rel}`);
    process.exit(1);
  }
}

const steps = [
  ['npm', ['run', 'check:go-live']],
  ['npm', ['run', 'report:agent-git']],
  ['npm', ['run', 'report:github-ci']],
];

for (const [cmd, args] of steps) {
  console.log(`\n[release:verify] $ ${cmd} ${args.join(' ')}`);
  const r =
    process.platform === 'win32'
      ? spawnSync('cmd.exe', ['/d', '/s', '/c', `${cmd} ${args.join(' ')}`], { stdio: 'inherit' })
      : spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`\n[release:verify] FAILED at: ${cmd} ${args.join(' ')}`);
    process.exit(r.status ?? 1);
  }
}

console.log('\n[release:verify] OK');
console.log('[release:verify] No new bundle/zip created. This is verification-only.');
