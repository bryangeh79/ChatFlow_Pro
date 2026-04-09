/**
 * Phase D-C2A — fail if any tenant_credentials.value is not cf1: sealed (policy check when encryption is on).
 *
 * Requires: npm run build, CHATFLOW_SAAS_CREDENTIALS_MASTER_KEY set and valid.
 * Run: node scripts/verify-d-c2a-tenant-credentials-zero-plaintext.mjs
 */
import { verifyTenantCredentialsZeroPlaintext } from '../dist/src/saas/tenant-credentials-plain-migration.js';
import { resetTenantSecretCryptoCacheForTests } from '../dist/src/saas/secret-crypto.js';

async function main() {
  resetTenantSecretCryptoCacheForTests();

  try {
    const result = await verifyTenantCredentialsZeroPlaintext();
    if (!result.ok) {
      console.error(JSON.stringify(result, null, 2));
      process.exit(1);
    }
    console.log(
      JSON.stringify(
        { ok: true, message: 'tenant_credentials zero-plaintext verify passed', row_count: result.row_count },
        null,
        2,
      ),
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('CHATFLOW_SAAS_CREDENTIALS_MASTER_KEY_required_for_zero_plaintext_verify')) {
      console.error(
        JSON.stringify({
          ok: false,
          error: 'CHATFLOW_SAAS_CREDENTIALS_MASTER_KEY_required_for_zero_plaintext_verify',
        }),
      );
      process.exit(1);
    }
    if (msg.startsWith('sealed_row_decrypt_failed:')) {
      const count = Number(msg.split(':')[1]) || 0;
      console.error(JSON.stringify({ ok: false, error: 'sealed_row_decrypt_failed', count }, null, 2));
      process.exit(1);
    }
    throw e;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
