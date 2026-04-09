/**
 * Phase D-C2A — migrate legacy plaintext tenant_credentials.value to cf1: sealed (offline/ops script).
 *
 * Requires: npm run build, valid CHATFLOW_SAAS_CREDENTIALS_MASTER_KEY, working SaaS DB env (sqljs path or postgres).
 *
 * Usage:
 *   node scripts/migrate-tenant-credentials-plain-to-cf1.mjs --dry-run
 *   node scripts/migrate-tenant-credentials-plain-to-cf1.mjs --apply
 * Optional: --max-rows=N (apply only; cap updates per run)
 */
import { migratePlaintextTenantCredentialsToCf1 } from '../dist/src/saas/tenant-credentials-plain-migration.js';
import { resetTenantSecretCryptoCacheForTests } from '../dist/src/saas/secret-crypto.js';

function parseArgs() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const apply = argv.includes('--apply');
  let maxRows = Infinity;
  const maxArg = argv.find((a) => a.startsWith('--max-rows='));
  if (maxArg) {
    const n = Number(maxArg.split('=')[1]);
    if (Number.isFinite(n) && n >= 0) maxRows = n;
  }
  if (dryRun === apply) {
    console.error('Specify exactly one of --dry-run or --apply');
    process.exit(1);
  }
  return { dryRun, apply, maxRows };
}

async function main() {
  const { dryRun, apply, maxRows } = parseArgs();
  resetTenantSecretCryptoCacheForTests();

  try {
    const result = await migratePlaintextTenantCredentialsToCf1({
      dryRun,
      maxRows: apply ? maxRows : undefined,
    });

    if (dryRun) {
      console.log(
        JSON.stringify(
          {
            ok: true,
            mode: 'dry_run',
            total_rows: result.total_rows,
            pending_plaintext_count: result.pending_plaintext_count,
            sample_keys: result.sample_keys,
          },
          null,
          2,
        ),
      );
      return;
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          mode: 'apply',
          pending_plaintext_count_before: result.pending_plaintext_count,
          rows_updated: result.rows_updated,
          max_rows: Number.isFinite(maxRows) ? maxRows : null,
        },
        null,
        2,
      ),
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('CHATFLOW_SAAS_CREDENTIALS_MASTER_KEY_required_for_migration')) {
      console.error(
        JSON.stringify({
          ok: false,
          error: 'CHATFLOW_SAAS_CREDENTIALS_MASTER_KEY_required_for_migration',
        }),
      );
      process.exit(1);
    }
    throw e;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
