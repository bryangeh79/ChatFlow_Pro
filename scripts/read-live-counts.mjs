#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSaasDbAdapter } from '../dist/src/saas/db-adapter/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const adapter = await getSaasDbAdapter();

const count = async (sql) => {
  const r = await adapter.queryOne(sql, []);
  return Number(r?.c ?? 0);
};

console.log(
  JSON.stringify(
    {
      version: pkg.version,
      counts: {
        tenants: await count('SELECT COUNT(*) AS c FROM tenants'),
        knowledge_entries: await count('SELECT COUNT(*) AS c FROM tenant_faq_entries'),
        conversations: await count('SELECT COUNT(*) AS c FROM conversations'),
        leads: await count('SELECT COUNT(*) AS c FROM leads'),
      },
    },
    null,
    2,
  ),
);
