/**
 * Phase D-C2C1 — delete cold `completed` rows from dedupe tables (never `processing`).
 *
 * Requires: npm run build, SaaS DB env (postgres recommended; sqljs supported if tables exist).
 *
 * Env: CHATFLOW_DEDUPE_RETENTION_DAYS (default 30)
 *
 * Usage (exactly one of --dry-run | --apply):
 *   node scripts/saas-dedupe-retention-cleanup.mjs --dry-run [--retention-days=30] [--tenant-id=UUID]
 *   node scripts/saas-dedupe-retention-cleanup.mjs --apply [--max-rows=50000] [--retention-days=30] [--tenant-id=UUID]
 */
import { runDedupeRetentionCleanup, parseDedupeRetentionDaysFromEnv } from '../dist/src/saas/dedupe-retention-cleanup.js';

function parseArgs() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const apply = argv.includes('--apply');
  let retentionDays = parseDedupeRetentionDaysFromEnv();
  const rd = argv.find((a) => a.startsWith('--retention-days='));
  if (rd) {
    const n = Number(rd.split('=')[1]);
    if (Number.isFinite(n) && n >= 1) retentionDays = Math.min(Math.floor(n), 3650);
  }
  let maxRows = 50_000;
  const mr = argv.find((a) => a.startsWith('--max-rows='));
  if (mr) {
    const n = Number(mr.split('=')[1]);
    if (Number.isFinite(n) && n >= 1) maxRows = Math.min(Math.floor(n), 1_000_000);
  }
  const tidArg = argv.find((a) => a.startsWith('--tenant-id='));
  const tenantId = tidArg ? tidArg.split('=')[1]?.trim() || null : null;
  if (dryRun === apply) {
    console.error(JSON.stringify({ ok: false, error: 'specify_exactly_one_of_dry_run_or_apply' }));
    process.exit(1);
  }
  return { dryRun, apply, retentionDays, maxRows, tenantId };
}

async function main() {
  const { dryRun, retentionDays, maxRows, tenantId } = parseArgs();
  try {
    const result = await runDedupeRetentionCleanup({
      dryRun,
      maxRows,
      retentionDays,
      tenantId,
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(JSON.stringify({ ok: false, error: msg }));
    process.exit(1);
  }
}

main();
