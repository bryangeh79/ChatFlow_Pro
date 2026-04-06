#!/usr/bin/env node
/**
 * Print latest delivery zip under dist/ and its SHA256.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');

if (!existsSync(distDir)) {
  console.error('delivery:latest: dist/ not found. Run npm run delivery:zip first.');
  process.exit(1);
}

const zips = readdirSync(distDir)
  .filter((n) => /^delivery-bundle-.*\.zip$/i.test(n))
  .map((name) => {
    const full = path.join(distDir, name);
    return { name, full, mtimeMs: statSync(full).mtimeMs };
  })
  .sort((a, b) => b.mtimeMs - a.mtimeMs);

if (zips.length === 0) {
  console.error('delivery:latest: no delivery-bundle-*.zip found. Run npm run delivery:zip first.');
  process.exit(1);
}

const latest = zips[0];
const bytes = readFileSync(latest.full);
const sha256 = createHash('sha256').update(bytes).digest('hex');

console.log('delivery:latest OK');
console.log(`file=${latest.full}`);
console.log(`sha256=${sha256}`);
