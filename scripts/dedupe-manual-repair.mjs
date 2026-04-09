/**
 * Phase D-C3B — single-key dedupe manual repair CLI (JSON stdout).
 *
 * Default: dry-run. Apply requires CHATFLOW_DEDUPE_MANUAL_REPAIR_ENABLED=1 and
 * --confirm-ticket=<same as --ticket-id>.
 *
 * Usage:
 *   node scripts/dedupe-manual-repair.mjs --dry-run --tenant-id=T --lane=inbound --channel=website \\
 *     --idempotency-key=K --action=close_as_completed --operator=U --ticket-id=JIRA-1 --reason="..."
 *
 *   node scripts/dedupe-manual-repair.mjs --apply --confirm-ticket=JIRA-1 ... (same fields + env)
 *
 * release_for_retry additionally requires:
 *   --ack-downstream-not-success --downstream-evidence="min 24 chars ..."
 */
function getArg(name, argv) {
  const p = argv.find((a) => a.startsWith(`${name}=`));
  return p ? p.slice(name.length + 1).trim() : null;
}

function hasFlag(flag, argv) {
  return argv.includes(flag);
}

function parseArgs(argv) {
  const apply = hasFlag('--apply', argv);
  const explicitDry = hasFlag('--dry-run', argv);
  const mode = apply ? 'apply' : 'dry_run';
  const tenant_id = getArg('--tenant-id', argv) || '';
  const lane = getArg('--lane', argv)?.toLowerCase() || '';
  const channel = getArg('--channel', argv) || '';
  const event_type = getArg('--event-type', argv) || '';
  const idempotency_key = getArg('--idempotency-key', argv) || '';
  const expect_fp = getArg('--expect-idempotency-key-fp', argv);
  const action = getArg('--action', argv)?.toLowerCase() || '';
  const operator = getArg('--operator', argv) || '';
  const ticket_id = getArg('--ticket-id', argv) || '';
  const reason = getArg('--reason', argv) || '';
  const apply_confirm_ticket = getArg('--confirm-ticket', argv) || '';
  const ack_downstream_not_success = hasFlag('--ack-downstream-not-success', argv);
  const downstream_evidence = getArg('--downstream-evidence', argv) || '';

  return {
    mode,
    apply,
    explicitDry,
    tenant_id,
    lane,
    channel,
    event_type,
    idempotency_key,
    expect_idempotency_key_fp: expect_fp,
    action,
    operator,
    ticket_id,
    reason,
    apply_confirm_ticket,
    ack_downstream_not_success,
    downstream_evidence,
  };
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    // eslint-disable-next-line no-console
    console.log(
      [
        'dedupe-manual-repair.mjs — D-C3B single-key repair (Postgres only).',
        'Default: --dry-run. Apply: --apply + CHATFLOW_DEDUPE_MANUAL_REPAIR_ENABLED=1 + --confirm-ticket=<same as --ticket-id>',
        'Required: --tenant-id --lane=inbound|outbound|notify --idempotency-key --action=close_as_completed|release_for_retry',
        '          --operator --ticket-id --reason="..." ',
        'inbound/outbound: --channel=  |  notify: --event-type=',
        'Optional: --expect-idempotency-key-fp=',
        'release_for_retry: --ack-downstream-not-success --downstream-evidence="min 24 chars"',
      ].join('\n'),
    );
    return;
  }

  const a = parseArgs(argv);
  if (a.lane !== 'inbound' && a.lane !== 'outbound' && a.lane !== 'notify') {
    console.error(JSON.stringify({ ok: false, error: 'lane must be inbound|outbound|notify' }));
    process.exit(1);
  }
  if (a.action !== 'close_as_completed' && a.action !== 'release_for_retry') {
    console.error(JSON.stringify({ ok: false, error: 'action must be close_as_completed|release_for_retry' }));
    process.exit(1);
  }
  if (a.apply && a.explicitDry) {
    console.error(JSON.stringify({ ok: false, error: 'use either --apply or --dry-run, not both' }));
    process.exit(1);
  }

  const { runDedupeManualRepair } = await import('../dist/src/saas/dedupe-manual-repair.js');

  const result = await runDedupeManualRepair({
    mode: a.mode,
    tenant_id: a.tenant_id,
    lane: a.lane,
    channel: a.channel || null,
    event_type: a.event_type || null,
    idempotency_key: a.idempotency_key,
    expect_idempotency_key_fp: a.expect_idempotency_key_fp,
    action: a.action,
    operator: a.operator,
    ticket_id: a.ticket_id,
    reason: a.reason,
    apply_confirm_ticket: a.apply_confirm_ticket || null,
    ack_downstream_not_success: a.ack_downstream_not_success,
    downstream_evidence: a.downstream_evidence || null,
  });

  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(2);
}

void main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(JSON.stringify({ ok: false, error: msg }));
  process.exit(1);
});
