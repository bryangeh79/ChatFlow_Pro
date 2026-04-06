#!/usr/bin/env node
/**
 * Build a delivery bundle directory under dist/ for vendor handoff.
 * Includes core docs and delivery-manifest.json.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const distDir = path.join(root, 'dist', 'delivery-bundle');
rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });

const files = [
  'docs/161_phase17_notify_webhooks.md',
  'docs/162_customer_seven_channel_access_token_guide.pdf',
  'docs/168_pro_two_day_go_live_checklist.md',
  'docs/169_pro_commercial_one_customer_one_deploy.md',
  'docs/170_pro_customer_ops_runbook.md',
  'docs/171_pro_vendor_release_checklist.md',
  'docs/172_pro_https_reverse_proxy_caddy_nginx.md',
  'examples/reverse-proxy/Caddyfile.example',
  'examples/reverse-proxy/nginx-snippet.conf',
  '.env.example',
];

const manifestSrc = path.join(root, 'data', 'delivery-manifest.json');
if (!existsSync(manifestSrc)) {
  console.error('delivery:bundle requires data/delivery-manifest.json');
  console.error('Run: npm run delivery:manifest');
  process.exit(1);
}

const copied = [];
for (const rel of files) {
  const src = path.join(root, rel);
  if (!existsSync(src)) {
    console.error('Missing required file for bundle:', rel);
    process.exit(1);
  }
  const out = path.join(distDir, rel);
  mkdirSync(path.dirname(out), { recursive: true });
  copyFileSync(src, out);
  copied.push(rel);
}

const manifestOut = path.join(distDir, 'data', 'delivery-manifest.json');
mkdirSync(path.dirname(manifestOut), { recursive: true });
copyFileSync(manifestSrc, manifestOut);
copied.push('data/delivery-manifest.json');

const checksums = copied.map((rel) => {
  const data = readFileSync(path.join(distDir, rel));
  const sha256 = createHash('sha256').update(data).digest('hex');
  return `${sha256}  ${rel}`;
});
writeFileSync(path.join(distDir, 'SHA256SUMS.txt'), `${checksums.join('\n')}\n`, 'utf8');

const readme = [
  'ChatFlow Pro delivery bundle',
  '',
  'This bundle is generated from the repository for customer handoff.',
  'Verify checksums with SHA256SUMS.txt.',
  '',
  'Source refs:',
  '- docs/168, docs/169, docs/170, docs/171, docs/172',
  '- docs/161, docs/162 PDF',
].join('\n');
writeFileSync(path.join(distDir, 'README.txt'), `${readme}\n`, 'utf8');

console.log('delivery:bundle OK');
console.log(distDir);
