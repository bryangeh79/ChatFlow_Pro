/**
 * Phase D-C2A — tenant_credentials sealed at-rest when master key set; read decrypts; legacy plaintext compatible.
 * Run: npm run build && node scripts/verify-d-c2a-credential-at-rest.mjs
 */
import { randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const probe = 'VERIFY_D2A_PLAINTEXT_SECRET_NOT_IN_DB_FILE';

const masterHex = randomBytes(32).toString('hex');
const dir = mkdtempSync(join(tmpdir(), 'cf-d2a-'));
const dbPath = join(dir, 'saas.sqlite');

process.env.CHATFLOW_SAAS_DB_DRIVER = 'sqljs';
process.env.CHATFLOW_SAAS_DB_PATH = dbPath;
process.env.CHATFLOW_SAAS_CREDENTIALS_MASTER_KEY = masterHex;

const { getSaasDbAdapter } = await import('../dist/src/saas/db-adapter/index.js');
const {
  createTenant,
  mergeTenantCredentials,
  getTenantCredentialsForOutbound,
} = await import('../dist/src/saas/repository.js');

const tenant = await createTenant(`d2a-${Date.now()}`, 'D2A Verify');
await mergeTenantCredentials(tenant.id, { OPENAI_API_KEY: probe });

const adapter = await getSaasDbAdapter();
const row = await adapter.queryOne(
  'SELECT value FROM tenant_credentials WHERE tenant_id = ? AND key = ?',
  [tenant.id, 'OPENAI_API_KEY'],
);
const rawStored = String(row?.value ?? '');
const encryptedOk = rawStored.startsWith('cf1:') && !rawStored.includes(probe);

const map = await getTenantCredentialsForOutbound(tenant.id);
const roundTrip = map.get('OPENAI_API_KEY') === probe;

const sqliteRaw = readFileSync(dbPath);
const leakedInFile = sqliteRaw.indexOf(Buffer.from(probe, 'utf8')) !== -1;

rmSync(dir, { recursive: true, force: true });

if (!encryptedOk || !roundTrip || leakedInFile) {
  console.error(
    JSON.stringify({ ok: false, encryptedOk, roundTrip, leakedInFile, rawPrefix: rawStored.slice(0, 16) }, null, 2),
  );
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, message: 'D-C2A credential at-rest verify passed' }, null, 2));
