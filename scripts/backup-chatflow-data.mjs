#!/usr/bin/env node
/**
 * Copy ./data (JSONL + runtime JSON) to a timestamped directory outside data/.
 * Never prints file contents. No-op if ./data missing.
 *
 * CHATFLOW_BACKUP_PARENT  Parent directory for backups (default: ./backups)
 * argv[2]                 Optional override for parent directory
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dataDir = path.join(root, 'data');

const parentArg = process.argv[2]?.trim();
const parent =
  parentArg ||
  process.env.CHATFLOW_BACKUP_PARENT?.trim() ||
  path.join(root, 'backups');

if (!fs.existsSync(dataDir)) {
  console.log('backup-chatflow-data: no ./data directory — nothing to do.');
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const dest = path.join(parent, `chatflow-data-${stamp}`);

fs.mkdirSync(parent, { recursive: true });
if (fs.existsSync(dest)) {
  console.error('backup-chatflow-data: destination already exists:', dest);
  process.exit(1);
}

fs.cpSync(dataDir, dest, { recursive: true });
console.log('backup-chatflow-data: copied', dataDir, '->', dest);
