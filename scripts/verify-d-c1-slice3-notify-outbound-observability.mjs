/**
 * Phase D-C1 slice 3 — notify milestones + Postgres tenant outbound dedupe structured logs.
 *
 * Always (no DB): handoff notify bypass path emits `notify_milestone`.
 * Postgres path: requires CHATFLOW_SAAS_DB_DRIVER=postgres + working CHATFLOW_SAAS_POSTGRES_URL (same as verify:dedupe-d-b3-closeout).
 *
 * Run: npm run build && node scripts/verify-d-c1-slice3-notify-outbound-observability.mjs
 */
import http from 'node:http';
import { getSaasDbAdapter } from '../dist/src/saas/db-adapter/index.js';
import { runWithTenantContext } from '../dist/src/saas/tenant-context.js';
import * as outboundRepo from '../dist/src/saas/outbound-dedupe-repository.js';
import { createChannelSender } from '../dist/src/channels/outbound-sender/index.js';
import * as leadNotify from '../dist/src/channels/lead-capture-hook/notify-outbound.js';
import * as handoffNotify from '../dist/src/channels/handoff-trigger/notify-outbound.js';
const secretProbe = 'SLICE3_SECRET_PROBE_NOT_IN_STRUCTURED_LOGS';

process.env.CHATFLOW_STRUCTURED_RUNTIME_LOG = '1';
process.env.CHATFLOW_OPS_ALERT_LOG = '0';

const lines = [];
const origLog = console.log;
console.log = (...args) => {
  lines.push(args.map(String).join(' '));
  origLog(...args);
};

await handoffNotify.dispatchHandoffNotifyWithDedupe({
  event: 'handoff_pending',
  session_id: 'sess-slice3',
  channel: 'website',
  external_user_id: 'u1',
  external_session_id: 'es1',
  reason: null,
  triggered_at: new Date().toISOString(),
  idempotency_key: `handoff:${secretProbe}:1`,
});

const driver = process.env.CHATFLOW_SAAS_DB_DRIVER?.trim().toLowerCase();
if (driver !== 'postgres') {
  console.log = origLog;
  const notifyOk = lines.some((l) => l.includes('"type":"notify_milestone"'));
  const leaked = lines.some((l) => l.includes(secretProbe));
  if (!notifyOk || leaked) {
    console.error(JSON.stringify({ ok: false, notifyOk, leaked, postgres: 'skipped' }, null, 2));
    process.exit(1);
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        postgres: 'skipped',
        message: 'notify_milestone only; set CHATFLOW_SAAS_DB_DRIVER=postgres for full outbound path',
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const tenantId = 't_d_c1_slice3_obs';
const ctx = { tenantId, tenantSlug: 't-d-c1-slice3-obs' };

const adapter = await getSaasDbAdapter();
await adapter.execute(
  `INSERT INTO tenants (id, slug, name, created_at) VALUES (?, ?, ?, now())
   ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name`,
  [tenantId, 't-d-c1-slice3-obs', 'T D C1 Slice3 Obs'],
);

const trace = 'mt-slice3-obs';
const resp = {
  channel: 'line',
  session_id: 'sess-obs-line',
  reply_text: 'x',
  should_send: false,
  debug_metadata: { message_trace_id: trace },
};
const obKey = outboundRepo.buildOutboundIdempotencyKey(resp);
await adapter.execute(
  'DELETE FROM tenant_outbound_dedupe WHERE tenant_id = ? AND channel = ? AND idempotency_key = ?',
  [tenantId, 'line', obKey],
);

const obConc = await runWithTenantContext(ctx, () =>
  Promise.all([outboundRepo.beginOutboundDedupe(resp), outboundRepo.beginOutboundDedupe(resp)]),
);
const obConcHasProcessing = obConc.some((x) => x.decision === 'duplicate_processing');
const obConcHasAccepted = obConc.some((x) => x.decision === 'accepted');

await adapter.execute(
  'DELETE FROM tenant_outbound_dedupe WHERE tenant_id = ? AND channel = ? AND idempotency_key = ?',
  [tenantId, 'line', obKey],
);

const os = createChannelSender('line');
const pair = await runWithTenantContext(ctx, () => Promise.all([os.send(resp), os.send(resp)]));
const third = await runWithTenantContext(ctx, () => os.send(resp));

let nh = 0;
const srv = http.createServer((q, r) => {
  nh += 1;
  r.statusCode = 200;
  r.end();
});
await new Promise((r) => srv.listen(3322, r));
process.env.CHATFLOW_LEAD_NOTIFY_URL = 'http://127.0.0.1:3322/n';

const nkey = `lead_captured:slice3:${secretProbe}`;
await adapter.execute(
  'DELETE FROM tenant_notify_dedupe WHERE tenant_id = ? AND event_type = ? AND idempotency_key = ?',
  [tenantId, 'lead_captured', nkey],
);

const rec = {
  event_type: 'lead_captured',
  session_id: 'lead-slice3',
  channel: 'website',
  collected_fields: {},
  completed_at: new Date().toISOString(),
  captured_at: new Date().toISOString(),
  idempotency_key: nkey,
};
const n1 = await runWithTenantContext(ctx, () => leadNotify.dispatchLeadCaptureNotifyWithDedupe(rec));
const n2 = await runWithTenantContext(ctx, () => leadNotify.dispatchLeadCaptureNotifyWithDedupe(rec));

await adapter.execute(
  'DELETE FROM tenant_notify_dedupe WHERE tenant_id = ? AND event_type = ? AND idempotency_key = ?',
  [tenantId, 'lead_captured', `lead_captured:slice3:cas:${secretProbe}`],
);
const casSrv = http.createServer(async (q, r) => {
  await adapter.execute(
    'UPDATE tenant_notify_dedupe SET version = version + 1 WHERE tenant_id = ? AND event_type = ? AND idempotency_key = ?',
    [tenantId, 'lead_captured', `lead_captured:slice3:cas:${secretProbe}`],
  );
  r.statusCode = 200;
  r.end();
});
await new Promise((r) => casSrv.listen(3323, r));
process.env.CHATFLOW_LEAD_NOTIFY_URL = 'http://127.0.0.1:3323/n';
const n409 = await runWithTenantContext(ctx, () =>
  leadNotify.dispatchLeadCaptureNotifyWithDedupe({
    ...rec,
    idempotency_key: `lead_captured:slice3:cas:${secretProbe}`,
    session_id: 'lead-slice3-cas',
  }),
);

casSrv.close();
srv.close();

console.log = origLog;

const notifyMilestone = lines.filter((l) => l.includes('"type":"notify_milestone"'));
const outboundDedupeDecision = lines.some(
  (l) => l.includes('"type":"outbound_dedupe_decision"') && l.includes('"outcome":"duplicate_completed"'),
);
const outboundDedupeProcessingLine = lines.some(
  (l) => l.includes('"type":"outbound_dedupe_decision"') && l.includes('"outcome":"duplicate_processing"'),
);
const outboundDedupeProcessing = obConcHasProcessing && outboundDedupeProcessingLine;
const outboundMilestone = lines.some(
  (l) => l.includes('"type":"outbound_milestone"') && l.includes('"outcome":"dedupe_marked_completed"'),
);
const notifyCas = lines.some((l) => l.includes('"type":"notify_dedupe_cas_conflict"'));
const leaked = lines.some((l) => l.includes(secretProbe));

const pairHasAccepted = pair.some((p) => !p.duplicate);

const ok =
  notifyMilestone.length >= 2 &&
  outboundDedupeDecision &&
  outboundDedupeProcessing &&
  obConcHasAccepted &&
  outboundMilestone &&
  pairHasAccepted &&
  Boolean(third.duplicate) &&
  third.http_status === 200 &&
  n1.sent &&
  Boolean(n2.duplicate) &&
  nh === 1 &&
  n409.http_status === 409 &&
  notifyCas &&
  !leaked;

if (!ok) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        notifyMilestoneCount: notifyMilestone.length,
        outboundDedupeDecision,
        outboundDedupeProcessing,
        outboundMilestone,
        notifyCas,
        obConcHasProcessing,
        obConcHasAccepted,
        pairHasAccepted,
        third_dup: Boolean(third.duplicate),
        n1_sent: n1.sent,
        n2_dup: Boolean(n2.duplicate),
        nh,
        n409_status: n409.http_status,
        leaked,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, message: 'D-C1 slice3 notify + outbound observability verify passed' }, null, 2));
