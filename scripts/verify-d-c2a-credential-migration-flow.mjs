/**
 * Phase D-C2A — e2e: plaintext rows -> migrate apply -> zero-plaintext -> idempotent second migrate.
 * Same-process migration avoids sql.js parent/child DB view skew.
 * Run: npm run build && node scripts/verify-d-c2a-credential-migration-flow.mjs
 */
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const masterHex = randomBytes(32).toString('hex');
const secret = 'MIGRATION_FLOW_PROBE_PLAINTEXT';

const dir = mkdtempSync(join(tmpdir(), 'cf-d2a-mig-'));
const dbPath = join(dir, 'saas.sqlite');

process.env.CHATFLOW_SAAS_DB_DRIVER = 'sqljs';
process.env.CHATFLOW_SAAS_DB_PATH = dbPath;
delete process.env.CHATFLOW_SAAS_CREDENTIALS_MASTER_KEY;

const { createTenant, mergeTenantCredentials, getTenantCredentialsForOutbound } = await import(
  '../dist/src/saas/repository.js',
);
const { getSaasDbAdapter } = await import('../dist/src/saas/db-adapter/index.js');
const { resetTenantSecretCryptoCacheForTests } = await import('../dist/src/saas/secret-crypto.js');
const {
  migratePlaintextTenantCredentialsToCf1,
  verifyTenantCredentialsZeroPlaintext,
} = await import('../dist/src/saas/tenant-credentials-plain-migration.js');

const tenant = await createTenant(`d2a-mig-${Date.now()}`, 'D2A Mig');
await mergeTenantCredentials(tenant.id, { OPENAI_API_KEY: secret });

process.env.CHATFLOW_SAAS_CREDENTIALS_MASTER_KEY = masterHex;
resetTenantSecretCryptoCacheForTests();

const dry1 = await migratePlaintextTenantCredentialsToCf1({ dryRun: true });
if (dry1.pending_plaintext_count !== 1) {
  console.error(JSON.stringify({ ok: false, step: 'dry_run', dry1 }, null, 2));
  process.exit(1);
}

const apply1 = await migratePlaintextTenantCredentialsToCf1({ dryRun: false });
if (apply1.rows_updated !== 1 || apply1.pending_plaintext_count !== 1) {
  console.error(JSON.stringify({ ok: false, step: 'first_apply', apply1 }, null, 2));
  process.exit(1);
}

const adapter = await getSaasDbAdapter();
const row = await adapter.queryOne(
  'SELECT value FROM tenant_credentials WHERE tenant_id = ? AND key = ?',
  [tenant.id, 'OPENAI_API_KEY'],
);
const stored = String(row?.value ?? '');
if (!stored.startsWith('cf1:') || stored.includes(secret)) {
  console.error(JSON.stringify({ ok: false, step: 'after_apply', storedPrefix: stored.slice(0, 32) }, null, 2));
  process.exit(1);
}

const map = await getTenantCredentialsForOutbound(tenant.id);
if (map.get('OPENAI_API_KEY') !== secret) {
  console.error(JSON.stringify({ ok: false, step: 'roundtrip' }, null, 2));
  process.exit(1);
}

const z = await verifyTenantCredentialsZeroPlaintext();
if (!z.ok) {
  console.error(JSON.stringify({ ok: false, step: 'zero_plaintext', z }, null, 2));
  process.exit(1);
}

const dry2 = await migratePlaintextTenantCredentialsToCf1({ dryRun: true });
if (dry2.pending_plaintext_count !== 0) {
  console.error(JSON.stringify({ ok: false, step: 'idempotent_dry_run', dry2 }, null, 2));
  process.exit(1);
}

const apply2 = await migratePlaintextTenantCredentialsToCf1({ dryRun: false });
if (apply2.rows_updated !== 0) {
  console.error(JSON.stringify({ ok: false, step: 'second_apply_should_noop', apply2 }, null, 2));
  process.exit(1);
}

const map2 = await getTenantCredentialsForOutbound(tenant.id);
if (map2.get('OPENAI_API_KEY') !== secret) {
  console.error(JSON.stringify({ ok: false, step: 'roundtrip_after_second_apply' }, null, 2));
  process.exit(1);
}

rmSync(dir, { recursive: true, force: true });

console.log(JSON.stringify({ ok: true, message: 'D-C2A credential migration flow verify passed' }, null, 2));
