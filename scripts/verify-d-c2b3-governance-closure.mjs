/**
 * Phase D-C2B3 — DB governance rows + D-C1 structured log (`governance_audit`) cross-check; no secret leakage.
 * Run: npm run build && node scripts/verify-d-c2b3-governance-closure.mjs
 */
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const captured = [];
const origLog = console.log.bind(console);
console.log = (...args) => {
  for (const a of args) {
    if (typeof a !== 'string') continue;
    const t = a.trimStart();
    if (!t.startsWith('{')) continue;
    try {
      const j = JSON.parse(a);
      if (j.type === 'governance_audit') captured.push(a);
    } catch {
      /* ignore non-JSON lines */
    }
  }
  origLog(...args);
};

const SECRET_OLD = `D2B3_OLD_${randomBytes(16).toString('hex')}`;
const SECRET_NEW = `D2B3_NEW_${randomBytes(16).toString('hex')}`;
const BG_TOKEN = `D2B3_BG_${randomBytes(16).toString('hex')}`;

const dir = mkdtempSync(join(tmpdir(), 'cf-d2b3-close-'));
const dbPath = join(dir, 'saas.sqlite');

process.env.CHATFLOW_SAAS_DB_DRIVER = 'sqljs';
process.env.CHATFLOW_SAAS_DB_PATH = dbPath;
process.env.CHATFLOW_SAAS_CREDENTIALS_MASTER_KEY = randomBytes(32).toString('hex');
process.env.CHATFLOW_STRUCTURED_RUNTIME_LOG = '1';

const { resetTenantSecretCryptoCacheForTests } = await import('../dist/src/saas/secret-crypto.js');
resetTenantSecretCryptoCacheForTests();

const { createTenant, mergeTenantCredentials } = await import('../dist/src/saas/repository.js');
const { rotateTenantCredentialIfExpected } = await import('../dist/src/saas/credential-rotation.js');
const { getSaasDbAdapter } = await import('../dist/src/saas/db-adapter/index.js');
const { resolveSaasAdminAuth } = await import('../dist/src/saas/admin-auth.js');
const { resetBreakGlassTtlEnabledAuditDedupeForTests } = await import('../dist/src/saas/break-glass-audit.js');

await getSaasDbAdapter();

const tenant = await createTenant(`d2b3-${Date.now()}`, 'D2B3');
await mergeTenantCredentials(tenant.id, { OPENAI_API_KEY: SECRET_OLD });
await rotateTenantCredentialIfExpected({
  tenantId: tenant.id,
  credentialKey: 'OPENAI_API_KEY',
  expectedPlaintext: SECRET_OLD,
  newPlaintext: SECRET_NEW,
  actorSource: 'verify_d2b3_closure',
});

let adapter = await getSaasDbAdapter();
const rots = await adapter.queryAll(
  'SELECT id FROM tenant_credential_rotation_events WHERE tenant_id = ?',
  [tenant.id],
);
if (rots.length < 1) {
  console.error(JSON.stringify({ ok: false, step: 'db_rotation_row' }));
  process.exit(1);
}

const rotLog = captured.some((line) => {
  try {
    const j = JSON.parse(line);
    return j.type === 'governance_audit' && j.governance_category === 'credential_rotation';
  } catch {
    return false;
  }
});
if (!rotLog) {
  console.error(JSON.stringify({ ok: false, step: 'missing_rotation_structured_log', captured: captured.length }));
  process.exit(1);
}

process.env.CHATFLOW_SAAS_ADMIN_TOKEN = BG_TOKEN;
process.env.CHATFLOW_BREAK_GLASS_ACTIVE = '1';
process.env.CHATFLOW_BREAK_GLASS_EXPIRES_AT = new Date(Date.now() + 3_600_000).toISOString();
resetBreakGlassTtlEnabledAuditDedupeForTests();

const r1 = await resolveSaasAdminAuth(`Bearer ${BG_TOKEN}`, { httpRequestId: 'd2b3-bg-1' });
if (!r1.ok) {
  console.error(JSON.stringify({ ok: false, step: 'bg_auth', r1 }));
  process.exit(1);
}

process.env.CHATFLOW_BREAK_GLASS_EXPIRES_AT = new Date(Date.now() - 60_000).toISOString();
const r2 = await resolveSaasAdminAuth(`Bearer ${BG_TOKEN}`, { httpRequestId: 'd2b3-bg-2' });
if (r2.ok || !('error' in r2)) {
  console.error(JSON.stringify({ ok: false, step: 'bg_should_expired', r2 }));
  process.exit(1);
}

adapter = await getSaasDbAdapter();
const bgRows = await adapter.queryAll('SELECT action FROM break_glass_audit_events ORDER BY ts_iso', []);
const hasEn = bgRows.some((r) => String(r.action) === 'break_glass_ttl_enabled');
const hasDe = bgRows.some((r) => String(r.action) === 'break_glass_ttl_denied_expired');
if (!hasEn || !hasDe) {
  console.error(JSON.stringify({ ok: false, step: 'bg_db_audit', bgRows }));
  process.exit(1);
}

const hasBgEnabledLog = captured.some((line) => {
  try {
    const j = JSON.parse(line);
    return j.type === 'governance_audit' && j.governance_action === 'break_glass_ttl_enabled';
  } catch {
    return false;
  }
});
const hasBgDeniedLog = captured.some((line) => {
  try {
    const j = JSON.parse(line);
    return j.type === 'governance_audit' && j.governance_action === 'break_glass_ttl_denied_expired';
  } catch {
    return false;
  }
});
if (!hasBgEnabledLog || !hasBgDeniedLog) {
  console.error(JSON.stringify({ ok: false, step: 'bg_structured_log', lines: captured.length }));
  process.exit(1);
}

const bundle = captured.join('\n');
if (bundle.includes(SECRET_OLD) || bundle.includes(SECRET_NEW) || bundle.includes(BG_TOKEN)) {
  console.error(JSON.stringify({ ok: false, step: 'structured_log_leak' }));
  process.exit(1);
}

rmSync(dir, { recursive: true, force: true });

console.log(JSON.stringify({ ok: true, message: 'D-C2B3 governance audit closure verify passed' }, null, 2));
