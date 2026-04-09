/**
 * Phase D-C2B1 — e2e: set credential → rotate with expected → read new → audit row has fps only → mismatch retry fails.
 * Run: npm run build && node scripts/verify-d-c2b1-credential-rotation.mjs
 */
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const masterHex = randomBytes(32).toString('hex');
const OLD = 'D2B1_ROT_OLD_SECRET_XYZ';
const NEW = 'D2B1_ROT_NEW_SECRET_ABC';

const dir = mkdtempSync(join(tmpdir(), 'cf-d2b1-rot-'));
const dbPath = join(dir, 'saas.sqlite');

process.env.CHATFLOW_SAAS_DB_DRIVER = 'sqljs';
process.env.CHATFLOW_SAAS_DB_PATH = dbPath;
process.env.CHATFLOW_SAAS_CREDENTIALS_MASTER_KEY = masterHex;

const { resetTenantSecretCryptoCacheForTests } = await import('../dist/src/saas/secret-crypto.js');
const { createTenant, mergeTenantCredentials, getTenantCredentialsForOutbound } = await import(
  '../dist/src/saas/repository.js',
);
const { getSaasDbAdapter } = await import('../dist/src/saas/db-adapter/index.js');
const {
  rotateTenantCredentialIfExpected,
  credentialSecretFingerprint,
  credentialStoredFingerprint,
} = await import('../dist/src/saas/credential-rotation.js');

resetTenantSecretCryptoCacheForTests();

const tenant = await createTenant(`d2b1-rot-${Date.now()}`, 'D2B1 Rot');
await mergeTenantCredentials(tenant.id, { OPENAI_API_KEY: OLD });

const adapter = await getSaasDbAdapter();
const rowBefore = await adapter.queryOne(
  'SELECT value FROM tenant_credentials WHERE tenant_id = ? AND key = ?',
  [tenant.id, 'OPENAI_API_KEY'],
);
const storedBefore = String(rowBefore?.value ?? '');
const prevBlobFp = credentialStoredFingerprint(storedBefore);

const { rotation_event_id } = await rotateTenantCredentialIfExpected({
  tenantId: tenant.id,
  credentialKey: 'OPENAI_API_KEY',
  expectedPlaintext: OLD,
  newPlaintext: NEW,
  actorSource: 'verify_script',
});

const map = await getTenantCredentialsForOutbound(tenant.id);
if (map.get('OPENAI_API_KEY') !== NEW) {
  console.error(JSON.stringify({ ok: false, step: 'read_after_rotate' }, null, 2));
  process.exit(1);
}
if (map.get('OPENAI_API_KEY') === OLD) {
  console.error(JSON.stringify({ ok: false, step: 'old_should_not_work' }, null, 2));
  process.exit(1);
}

const events = await adapter.queryAll(
  'SELECT id, tenant_id, credential_key, actor_source, rotation_reason, prev_plaintext_fp, new_plaintext_fp, prev_blob_fp, new_blob_fp, outcome, ts_iso FROM tenant_credential_rotation_events WHERE tenant_id = ?',
  [tenant.id],
);
if (events.length !== 1) {
  console.error(JSON.stringify({ ok: false, step: 'audit_count', events_length: events.length }, null, 2));
  process.exit(1);
}
const ev = events[0];
if (String(ev.id) !== rotation_event_id || String(ev.outcome) !== 'success') {
  console.error(JSON.stringify({ ok: false, step: 'audit_row', ev }, null, 2));
  process.exit(1);
}
if (String(ev.prev_plaintext_fp) !== credentialSecretFingerprint(OLD)) {
  console.error(JSON.stringify({ ok: false, step: 'prev_plain_fp' }, null, 2));
  process.exit(1);
}
if (String(ev.new_plaintext_fp) !== credentialSecretFingerprint(NEW)) {
  console.error(JSON.stringify({ ok: false, step: 'new_plain_fp' }, null, 2));
  process.exit(1);
}
if (String(ev.prev_blob_fp) !== prevBlobFp) {
  console.error(JSON.stringify({ ok: false, step: 'prev_blob_fp' }, null, 2));
  process.exit(1);
}
const rowAfter = await adapter.queryOne(
  'SELECT value FROM tenant_credentials WHERE tenant_id = ? AND key = ?',
  [tenant.id, 'OPENAI_API_KEY'],
);
if (String(ev.new_blob_fp) !== credentialStoredFingerprint(String(rowAfter?.value ?? ''))) {
  console.error(JSON.stringify({ ok: false, step: 'new_blob_fp' }, null, 2));
  process.exit(1);
}

const leakProbe = JSON.stringify(events);
if (leakProbe.includes(OLD) || leakProbe.includes(NEW)) {
  console.error(JSON.stringify({ ok: false, step: 'audit_leaked_plaintext', leakProbe }, null, 2));
  process.exit(1);
}

let threw = false;
try {
  await rotateTenantCredentialIfExpected({
    tenantId: tenant.id,
    credentialKey: 'OPENAI_API_KEY',
    expectedPlaintext: OLD,
    newPlaintext: 'SHOULD_NOT_APPLY',
    actorSource: 'verify_script',
  });
} catch (e) {
  threw = e instanceof Error && e.message === 'credential_expected_mismatch';
}
if (!threw) {
  console.error(JSON.stringify({ ok: false, step: 'second_rotate_should_fail' }, null, 2));
  process.exit(1);
}

const events2 = await adapter.queryAll(
  'SELECT id FROM tenant_credential_rotation_events WHERE tenant_id = ?',
  [tenant.id],
);
if (events2.length !== 1) {
  console.error(JSON.stringify({ ok: false, step: 'audit_no_second_row', count: events2.length }, null, 2));
  process.exit(1);
}

rmSync(dir, { recursive: true, force: true });

console.log(JSON.stringify({ ok: true, message: 'D-C2B1 credential rotation verify passed' }, null, 2));
