/**
 * Phase D-C2B2 — break-glass TTL: valid window → auth ok + `break_glass_ttl_enabled`; expired → `break_glass_ttl_expired` + audit `break_glass_ttl_denied_expired`.
 * Run: npm run build && node scripts/verify-d-c2b2-break-glass-ttl.mjs
 */
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'cf-d2b2-bg-'));
const dbPath = join(dir, 'saas.sqlite');
const TOKEN = `BG_VERIFY_${randomBytes(24).toString('hex')}`;

process.env.CHATFLOW_SAAS_DB_DRIVER = 'sqljs';
process.env.CHATFLOW_SAAS_DB_PATH = dbPath;
process.env.CHATFLOW_SAAS_ADMIN_TOKEN = TOKEN;
process.env.CHATFLOW_BREAK_GLASS_ACTIVE = '1';
process.env.CHATFLOW_BREAK_GLASS_EXPIRES_AT = new Date(Date.now() + 3_600_000).toISOString();

const { resolveSaasAdminAuth } = await import('../dist/src/saas/admin-auth.js');
const { getSaasDbAdapter } = await import('../dist/src/saas/db-adapter/index.js');

await getSaasDbAdapter();

const r1 = await resolveSaasAdminAuth(`Bearer ${TOKEN}`, { httpRequestId: 'verify-d2b2-1' });
if (!r1.ok || !('context' in r1) || r1.context.auth_source !== 'break_glass_env') {
  console.error(JSON.stringify({ ok: false, step: 'ttl_window_auth', r1 }, null, 2));
  process.exit(1);
}

let adapter = await getSaasDbAdapter();
let audits = await adapter.queryAll('SELECT action, expires_at_iso, request_id, detail_json FROM break_glass_audit_events ORDER BY ts_iso', []);
const hasEnabled = audits.some((a) => String(a.action) === 'break_glass_ttl_enabled');
if (!hasEnabled) {
  console.error(JSON.stringify({ ok: false, step: 'missing_enabled_audit', audits }, null, 2));
  process.exit(1);
}

process.env.CHATFLOW_BREAK_GLASS_EXPIRES_AT = new Date(Date.now() - 60_000).toISOString();

const r2 = await resolveSaasAdminAuth(`Bearer ${TOKEN}`, { httpRequestId: 'verify-d2b2-2' });
if (r2.ok || !('error' in r2) || r2.error !== 'break_glass_ttl_expired') {
  console.error(JSON.stringify({ ok: false, step: 'expect_expired', r2 }, null, 2));
  process.exit(1);
}

adapter = await getSaasDbAdapter();
audits = await adapter.queryAll('SELECT action, expires_at_iso, request_id, detail_json FROM break_glass_audit_events ORDER BY ts_iso', []);
const hasDenied = audits.some((a) => String(a.action) === 'break_glass_ttl_denied_expired');
if (!hasDenied) {
  console.error(JSON.stringify({ ok: false, step: 'missing_denied_expired_audit', audits }, null, 2));
  process.exit(1);
}

const leak = JSON.stringify(audits);
if (leak.includes(TOKEN)) {
  console.error(JSON.stringify({ ok: false, step: 'audit_leaked_token' }, null, 2));
  process.exit(1);
}

delete process.env.CHATFLOW_BREAK_GLASS_ACTIVE;
delete process.env.CHATFLOW_BREAK_GLASS_EXPIRES_AT;

const r3 = await resolveSaasAdminAuth(`Bearer ${TOKEN}`);
if (!r3.ok || !('context' in r3)) {
  console.error(JSON.stringify({ ok: false, step: 'legacy_no_ttl_mode', r3 }, null, 2));
  process.exit(1);
}

rmSync(dir, { recursive: true, force: true });

console.log(JSON.stringify({ ok: true, message: 'D-C2B2 break-glass TTL verify passed' }, null, 2));
