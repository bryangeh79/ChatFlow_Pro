#!/usr/bin/env node
/**
 * Clean old delivery zip artifacts under dist/.
 *
 * Usage:
 *   npm run delivery:clean
 *   npm run delivery:clean -- --keep=5
 */

import { readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');

const keepArg = process.argv.find((a) => a.startsWith('--keep='));
const keep = keepArg ? Number(keepArg.slice('--keep='.length)) : 5;
if (!Number.isInteger(keep) || keep < 1) {
  console.error('delivery:clean invalid --keep value (must be integer >= 1)');
  process.exit(1);
}

let files = [];
try {
  files = readdirSync(distDir)
    .filter((n) => /^delivery-bundle-.*\.zip$/i.test(n))
    .map((name) => {
      const full = path.join(distDir, name);
      return { name, full, mtimeMs: statSync(full).mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
} catch {
  console.log('delivery:clean: dist/ not found, nothing to clean');
  process.exit(0);
}

if (files.length <= keep) {
  console.log(`delivery:clean: nothing to remove (found ${files.length}, keep ${keep})`);
  process.exit(0);
}

const toRemove = files.slice(keep);
for (const f of toRemove) {
  rmSync(f.full, { force: true });
}

console.log(`delivery:clean OK removed=${toRemove.length} kept=${keep}`);
for (const f of toRemove) {
  console.log(`- ${f.name}`);
}
