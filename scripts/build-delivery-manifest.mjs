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

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
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

function readNodeRuntimeRequirement() {
  const pkgPath = path.join(root, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  if (pkg.engines?.node) return String(pkg.engines.node);
  return '>=22';
}

function listFilesRecursively(target) {
  if (!existsSync(target)) return [];
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = path.join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else out.push(p);
    }
  };
  walk(target);
  out.sort();
  return out;
}

function checksumArtifacts() {
  const hash = createHash('sha256');
  const files = [
    ...listFilesRecursively(path.join(root, 'dist')),
    ...listFilesRecursively(path.join(root, 'public')),
  ];
  for (const p of files) {
    hash.update(path.relative(root, p));
    hash.update('\n');
    hash.update(readFileSync(p));
    hash.update('\n');
  }
  return hash.digest('hex');
}

function resolveMigrationTarget() {
  const pgDir = path.join(root, 'src', 'saas', 'db-migrations', 'postgres');
  if (!existsSync(pgDir)) return 'unknown';
  const names = readdirSync(pgDir)
    .filter((n) => /^pg_\d+_.*\.sql$/i.test(n))
    .sort();
  if (names.length === 0) return 'none';
  return names[names.length - 1].replace(/\.sql$/i, '');
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
  package_format_version: '1',
  version: readPackageVersion(),
  build_time: new Date().toISOString(),
  git_commit: git?.sha ?? null,
  artifact_checksum: checksumArtifacts(),
  migration_target: resolveMigrationTarget(),
  node_runtime_requirement: readNodeRuntimeRequirement(),
  source: 'chatflow-pro',
  deliverable_docs: docs.map((p) => ({ path: p, exists: existsSync(path.join(root, p)) })),
};

const outDir = path.join(root, 'data');
mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'delivery-manifest.json');
writeFileSync(outFile, JSON.stringify(manifest, null, 2), 'utf8');

console.log('delivery:manifest OK');
console.log(outFile);
