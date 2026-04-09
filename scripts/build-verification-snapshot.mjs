#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSaasDbAdapter } from '../dist/src/saas/db-adapter/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'data', 'backup');
mkdirSync(outDir, { recursive: true });

const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const adapter = await getSaasDbAdapter();
const count = async (sql) => {
  const r = await adapter.queryOne(sql, []);
  return Number(r?.c ?? 0);
};

const snapshot = {
  captured_at: new Date().toISOString(),
  version: pkg.version,
  counts: {
    tenants: await count('SELECT COUNT(*) AS c FROM tenants'),
    knowledge_entries: await count('SELECT COUNT(*) AS c FROM tenant_faq_entries'),
    conversations: await count('SELECT COUNT(*) AS c FROM conversations'),
    leads: await count('SELECT COUNT(*) AS c FROM leads'),
  },
};
writeFileSync(path.join(outDir, 'verification_snapshot.json'), JSON.stringify(snapshot, null, 2), 'utf8');

const redacted = {};
const envPath = path.join(root, '.env');
if (existsSync(envPath)) {
  const raw = readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of raw) {
    if (!line || /^\s*#/.test(line) || !line.includes('=')) continue;
    const [k, ...rest] = line.split('=');
    const key = k.trim();
    const value = rest.join('=').trim();
    if (!key) continue;
    const secretLike = /(TOKEN|SECRET|KEY|PASSWORD|PASS|API)/i.test(key);
    redacted[key] = secretLike ? '<redacted>' : value;
  }
}
writeFileSync(path.join(outDir, 'redacted_config_snapshot.json'), JSON.stringify(redacted, null, 2), 'utf8');

console.log('[verification-snapshot] OK');
console.log(path.join(outDir, 'verification_snapshot.json'));
console.log(path.join(outDir, 'redacted_config_snapshot.json'));
