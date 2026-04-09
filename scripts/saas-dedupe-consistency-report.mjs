/**
 * Phase D-C3A — read-only dedupe consistency report (JSON to stdout).
 * NO writes. Postgres only (sqljs returns empty + note).
 *
 * Usage:
 *   node scripts/saas-dedupe-consistency-report.mjs [--stale-minutes=15] [--tenant-id=] [--lane=inbound|outbound|notify] [--idempotency-key=] [--max-rows=500]
 */
import {
  listDedupeConsistencyGaps,
  parseDedupeConsistencyStaleMinutesFromEnv,
} from '../dist/src/saas/dedupe-consistency-readonly.js';

function parseArgs() {
  const argv = process.argv.slice(2);
  let staleMinutes = parseDedupeConsistencyStaleMinutesFromEnv();
  const sm = argv.find((a) => a.startsWith('--stale-minutes='));
  if (sm) {
    const n = Number(sm.split('=')[1]);
    if (Number.isFinite(n) && n >= 1) staleMinutes = Math.min(Math.floor(n), 10_080);
  }
  let maxRows = 500;
  const mr = argv.find((a) => a.startsWith('--max-rows='));
  if (mr) {
    const n = Number(mr.split('=')[1]);
    if (Number.isFinite(n) && n >= 1) maxRows = Math.min(Math.floor(n), 10_000);
  }
  const tid = argv.find((a) => a.startsWith('--tenant-id='))?.split('=')[1]?.trim() || null;
  const laneRaw = argv.find((a) => a.startsWith('--lane='))?.split('=')[1]?.trim().toLowerCase();
  const lane =
    laneRaw === 'inbound' || laneRaw === 'outbound' || laneRaw === 'notify' ? laneRaw : null;
  const idk = argv.find((a) => a.startsWith('--idempotency-key='))?.split('=')[1]?.trim() || null;
  return { staleMinutes, maxRows, tenantId: tid, lane, idempotencyKey: idk };
}

async function main() {
  const { staleMinutes, maxRows, tenantId, lane, idempotencyKey } = parseArgs();
  try {
    const report = await listDedupeConsistencyGaps({
      staleMinutes,
      maxRows,
      tenantId,
      lane,
      idempotencyKey,
    });
    console.log(JSON.stringify(report, null, 2));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(JSON.stringify({ ok: false, error: msg }));
    process.exit(1);
  }
}

void main();
