#!/usr/bin/env node
/**
 * Build a zip archive from dist/delivery-bundle.
 * Requires `delivery:bundle` first.
 */

import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const bundleDir = path.join(root, 'dist', 'delivery-bundle');
if (!existsSync(bundleDir)) {
  console.error('delivery:zip requires dist/delivery-bundle');
  console.error('Run: npm run delivery:bundle');
  process.exit(1);
}

const outDir = path.join(root, 'dist');
mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const zipPath = path.join(outDir, `delivery-bundle-${stamp}.zip`);

const psCommand = [
  '$ErrorActionPreference = "Stop";',
  `Compress-Archive -Path "${bundleDir}\\*" -DestinationPath "${zipPath}" -Force;`,
  `Write-Output "${zipPath}"`,
].join(' ');

const r = spawnSync('powershell', ['-NoProfile', '-Command', psCommand], {
  stdio: 'inherit',
});
if (r.status !== 0) {
  process.exit(r.status ?? 1);
}

console.log('delivery:zip OK');
