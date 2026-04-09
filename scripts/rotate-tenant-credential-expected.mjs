/**
 * Phase D-C2B1 — rotate one tenant_credentials key if current plaintext matches --expected.
 * Requires: npm run build, SaaS DB env, CHATFLOW_SAAS_CREDENTIALS_MASTER_KEY (recommended for sealed at-rest).
 *
 * Usage:
 *   node scripts/rotate-tenant-credential-expected.mjs --tenant-id=UUID --key=OPENAI_API_KEY --expected=OLD --new=NEW [--actor-source=ops_cli]
 */
import { resetTenantSecretCryptoCacheForTests } from '../dist/src/saas/secret-crypto.js';
import { rotateTenantCredentialIfExpected } from '../dist/src/saas/credential-rotation.js';

function argVal(name) {
  const p = process.argv.find((a) => a.startsWith(`${name}=`));
  return p ? p.slice(name.length + 1) : '';
}

async function main() {
  const tenantId = argVal('--tenant-id');
  const key = argVal('--key');
  const expected = argVal('--expected');
  const newVal = argVal('--new');
  const actorSource = argVal('--actor-source') || 'ops_cli';

  if (!tenantId || !key || !expected || !newVal) {
    console.error(
      JSON.stringify({
        ok: false,
        error: 'missing_args',
        need: ['--tenant-id=', '--key=', '--expected=', '--new='],
      }),
    );
    process.exit(1);
  }

  resetTenantSecretCryptoCacheForTests();

  try {
    const out = await rotateTenantCredentialIfExpected({
      tenantId,
      credentialKey: key,
      expectedPlaintext: expected,
      newPlaintext: newVal,
      actorSource,
    });
    console.log(JSON.stringify({ ok: true, rotation_event_id: out.rotation_event_id }, null, 2));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(JSON.stringify({ ok: false, error: msg }, null, 2));
    process.exit(1);
  }
}

main();
