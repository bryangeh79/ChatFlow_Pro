/**
 * Phase D-C2A — plaintext store when master key unset; after enabling master, old plaintext rows still read;
 * new writes sealed. Run: npm run build && node scripts/verify-d-c2a-credential-legacy-compat.mjs
 */
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const plain = 'LEGACY_PLAIN_VALUE_XYZ';
const masterHex = randomBytes(32).toString('hex');
const sealedProbe = 'SEALED_AFTER_MASTER_ON';

const dir = mkdtempSync(join(tmpdir(), 'cf-d2a-leg-'));
const dbPath = join(dir, 'saas.sqlite');

process.env.CHATFLOW_SAAS_DB_DRIVER = 'sqljs';
process.env.CHATFLOW_SAAS_DB_PATH = dbPath;
delete process.env.CHATFLOW_SAAS_CREDENTIALS_MASTER_KEY;

const { getSaasDbAdapter } = await import('../dist/src/saas/db-adapter/index.js');
const { createTenant, mergeTenantCredentials, getTenantCredentialsForOutbound } = await import(
  '../dist/src/saas/repository.js',
);
const { resetTenantSecretCryptoCacheForTests } = await import('../dist/src/saas/secret-crypto.js');

const tenant = await createTenant(`d2a-leg-${Date.now()}`, 'D2A Legacy');
await mergeTenantCredentials(tenant.id, { TEST_KEY: plain });

const adapter = await getSaasDbAdapter();
let row = await adapter.queryOne(
  'SELECT value FROM tenant_credentials WHERE tenant_id = ? AND key = ?',
  [tenant.id, 'TEST_KEY'],
);
let raw = String(row?.value ?? '');
let map = await getTenantCredentialsForOutbound(tenant.id);

const okPlain = raw === plain && raw.startsWith('cf1:') === false && map.get('TEST_KEY') === plain;

process.env.CHATFLOW_SAAS_CREDENTIALS_MASTER_KEY = masterHex;
resetTenantSecretCryptoCacheForTests();
map = await getTenantCredentialsForOutbound(tenant.id);
const okReadPlainAfterMaster = map.get('TEST_KEY') === plain;

await mergeTenantCredentials(tenant.id, { OTHER_KEY: sealedProbe });
row = await adapter.queryOne(
  'SELECT value FROM tenant_credentials WHERE tenant_id = ? AND key = ?',
  [tenant.id, 'OTHER_KEY'],
);
const rawOther = String(row?.value ?? '');
const okNewSealed = rawOther.startsWith('cf1:') && !rawOther.includes(sealedProbe);
map = await getTenantCredentialsForOutbound(tenant.id);
const okNewRoundTrip = map.get('OTHER_KEY') === sealedProbe;

rmSync(dir, { recursive: true, force: true });

const ok = okPlain && okReadPlainAfterMaster && okNewSealed && okNewRoundTrip;
if (!ok) {
  console.error(
    JSON.stringify(
      { ok: false, okPlain, okReadPlainAfterMaster, okNewSealed, okNewRoundTrip, raw, rawOther },
      null,
      2,
    ),
  );
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, message: 'D-C2A legacy plaintext compat verify passed' }, null, 2));
