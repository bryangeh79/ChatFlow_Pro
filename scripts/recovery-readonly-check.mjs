/**
 * Phase D-C4A — post-restore read-only recovery check (JSON stdout).
 * NO writes. Postgres full sequence; sqljs returns postgres_only skip.
 *
 * Usage:
 *   node scripts/recovery-readonly-check.mjs [--stale-minutes=15] [--tenant-id=] [--max-dedupe-rows=500] [--no-jsonl]
 */
import { runRecoveryReadonlyCheck } from '../dist/src/saas/recovery-readonly-check.js';

function parseArgs(argv) {
  let staleMinutes;
  const sm = argv.find((a) => a.startsWith('--stale-minutes='));
  if (sm) {
    const n = Number(sm.split('=')[1]);
    if (Number.isFinite(n) && n >= 1) staleMinutes = Math.min(Math.floor(n), 10_080);
  }
  let maxDedupeRows;
  const mr = argv.find((a) => a.startsWith('--max-dedupe-rows='));
  if (mr) {
    const n = Number(mr.split('=')[1]);
    if (Number.isFinite(n) && n >= 1) maxDedupeRows = Math.min(Math.floor(n), 10_000);
  }
  const tid = argv.find((a) => a.startsWith('--tenant-id='))?.split('=')[1]?.trim() || null;
  const includeJsonl = !argv.includes('--no-jsonl');
  return { staleMinutes, maxDedupeRows, tenantId: tid, includeJsonl };
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  try {
    const rep = await runRecoveryReadonlyCheck({
      staleMinutes: a.staleMinutes,
      maxDedupeRows: a.maxDedupeRows,
      tenantId: a.tenantId,
      includeJsonl: a.includeJsonl,
    });
    console.log(JSON.stringify(rep, null, 2));
    if (rep.overall_tier === 'freeze_no_go') process.exit(2);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(JSON.stringify({ ok: false, error: msg }));
    process.exit(1);
  }
}

void main();
