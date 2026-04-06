#!/usr/bin/env node
/**
 * Build a delivery manifest JSON for vendor handoff.
 *
 * Output path:
 *   data/delivery-manifest.json
 *
 * Purpose:
 * - Freeze version + git SHA + timestamp
 * - List core docs for customer/vendo handoff
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readGitMetadataFromFs } from './agent-git-fs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function readPackageVersion() {
  const pkgPath = path.join(root, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  return pkg.version || 'unknown';
}

const git = readGitMetadataFromFs(root);
const docs = [
  'docs/168_pro_two_day_go_live_checklist.md',
  'docs/169_pro_commercial_one_customer_one_deploy.md',
  'docs/170_pro_customer_ops_runbook.md',
  'docs/171_pro_vendor_release_checklist.md',
  'docs/172_pro_https_reverse_proxy_caddy_nginx.md',
  'docs/161_phase17_notify_webhooks.md',
  'docs/162_customer_seven_channel_access_token_guide.pdf',
];

const manifest = {
  source: 'chatflow-pro',
  generated_at: new Date().toISOString(),
  version: readPackageVersion(),
  git: git
    ? { sha: git.sha, branch: git.branch, ref: git.ref }
    : { sha: null, branch: null, ref: null, note: 'git metadata unavailable' },
  deliverable_docs: docs.map((p) => ({ path: p, exists: existsSync(path.join(root, p)) })),
};

const outDir = path.join(root, 'data');
mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'delivery-manifest.json');
writeFileSync(outFile, JSON.stringify(manifest, null, 2), 'utf8');

console.log('delivery:manifest OK');
console.log(outFile);
