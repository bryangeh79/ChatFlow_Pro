#!/usr/bin/env node
/**
 * Print HEAD SHA + branch by reading .git only (no git binary). For containerized agents.
 * Usage: npm run report:agent-git
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readGitMetadataFromFs } from './agent-git-fs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const meta = readGitMetadataFromFs(root);
if (!meta) {
  console.error('[report:agent-git] FAIL: cannot read .git/HEAD or resolve ref (is this a full clone?)');
  process.exit(1);
}

console.log('[report:agent-git] mode: filesystem (.git only, no git CLI)');
console.log(`[report:agent-git] HEAD ${meta.sha}`);
console.log(`[report:agent-git] branch ${meta.branch ?? '(detached or unknown)'}`);
console.log('\n[report:agent-git] note: commit/push still require git on PATH or a host-side runner (see docs/155).');
