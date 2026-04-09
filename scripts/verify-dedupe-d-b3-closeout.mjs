/**
 * Phase D-B3 closeout: unified inbound + outbound + notify dedupe checks (Postgres + tenant context).
 * Run: node scripts/verify-dedupe-d-b3-closeout.mjs
 */
import http from 'node:http';
import { getSaasDbAdapter } from '../dist/src/saas/db-adapter/index.js';
import { runWithTenantContext } from '../dist/src/saas/tenant-context.js';
import * as inbound from '../dist/src/saas/inbound-dedupe-repository.js';
import * as outboundRepo from '../dist/src/saas/outbound-dedupe-repository.js';
import { createChannelSender } from '../dist/src/channels/outbound-sender/index.js';
import * as leadNotify from '../dist/src/channels/lead-capture-hook/notify-outbound.js';
import * as notifyRepo from '../dist/src/saas/notify-dedupe-repository.js';
import * as guard from '../dist/src/webhooks/inbound-dedupe.js';

const tenantId = 't_d_b3_unified';
const ctx = { tenantId, tenantSlug: 't-d-b3-unified' };

async function main() {
  const adapter = await getSaasDbAdapter();
  await adapter.execute(
    `INSERT INTO tenants (id, slug, name, created_at) VALUES (?, ?, ?, now())
     ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name`,
    [tenantId, 't-d-b3-unified', 'T D B3 Unified'],
  );

  const out = {};

  const trace = 'mt-final-u';
  const resp = {
    channel: 'line',
    session_id: 'sess-final-u',
    reply_text: 'x',
    should_send: false,
    debug_metadata: { message_trace_id: trace },
  };
  const obKey = outboundRepo.buildOutboundIdempotencyKey(resp);
  await adapter.execute(
    'DELETE FROM tenant_outbound_dedupe WHERE tenant_id = ? AND channel = ? AND idempotency_key = ?',
    [tenantId, 'line', obKey],
  );
  const os = createChannelSender('line');
  const pair = await runWithTenantContext(ctx, () => Promise.all([os.send(resp), os.send(resp)]));
  const third = await runWithTenantContext(ctx, () => os.send(resp));
  out.outbound_concurrent_pair = pair.map((p) => ({
    duplicate: Boolean(p.duplicate),
    http_status: p.http_status,
    status: p.result.status,
    step0: p.result.debug_steps?.[0],
  }));
  out.outbound_third = { duplicate: Boolean(third.duplicate), http_status: third.http_status };
  const row = await adapter.queryOne(
    'SELECT status, version FROM tenant_outbound_dedupe WHERE tenant_id = ? AND channel = ? AND idempotency_key = ?',
    [tenantId, 'line', obKey],
  );
  out.outbound_row = row;
  out.outbound_cas_stale = await outboundRepo.completeOutboundDedupeWithCas({
    tenant_id: tenantId,
    channel: 'line',
    idempotency_key: obKey,
    expected_version: 1,
  });

  await adapter.execute(
    'DELETE FROM tenant_outbound_dedupe WHERE tenant_id = ? AND channel = ? AND idempotency_key = ?',
    [tenantId, 'line', obKey],
  );
  const obBeginConc = await runWithTenantContext(ctx, () =>
    Promise.all([outboundRepo.beginOutboundDedupe(resp), outboundRepo.beginOutboundDedupe(resp)]),
  );
  out.outbound_begin_conc = obBeginConc.map((x) => x.decision);

  const msg = {
    channel: 'website',
    message_id: 'pmid-final-u',
    external_user_id: 'u',
    external_session_id: 's',
    timestamp: new Date().toISOString(),
    message_type: 'text',
    text: 'x',
  };
  await adapter.execute(
    'DELETE FROM tenant_inbound_dedupe WHERE tenant_id = ? AND channel = ? AND idempotency_key = ?',
    [tenantId, 'website', 'pmid:pmid-final-u'],
  );
  out.inbound_linear = [
    (await runWithTenantContext(ctx, () => inbound.beginInboundDedupe(msg))).decision,
    (await runWithTenantContext(ctx, () => inbound.beginInboundDedupe(msg))).decision,
  ];
  await runWithTenantContext(ctx, () =>
    inbound.markInboundDedupeCompleted({
      tenant_id: tenantId,
      channel: 'website',
      idempotency_key: 'pmid:pmid-final-u',
    }),
  );
  out.inbound_after_complete = (await runWithTenantContext(ctx, () => inbound.beginInboundDedupe(msg))).decision;
  out.inbound_guard = (await runWithTenantContext(ctx, () => guard.guardInboundDedupe(msg))).duplicateResponse;
  await adapter.execute(
    'DELETE FROM tenant_inbound_dedupe WHERE tenant_id = ? AND channel = ? AND idempotency_key = ?',
    [tenantId, 'website', 'pmid:pmid-final-u'],
  );
  const ibc = await runWithTenantContext(ctx, () =>
    Promise.all([inbound.beginInboundDedupe(msg), inbound.beginInboundDedupe(msg)]),
  );
  out.inbound_begin_conc = ibc.map((x) => x.decision);

  let nh = 0;
  const srv = http.createServer((q, r) => {
    nh += 1;
    r.statusCode = 200;
    r.end();
  });
  await new Promise((r) => srv.listen(3222, r));
  process.env.CHATFLOW_LEAD_NOTIFY_URL = 'http://127.0.0.1:3222/n';
  const nkey = 'lead_captured:nfinal:1';
  await adapter.execute(
    'DELETE FROM tenant_notify_dedupe WHERE tenant_id = ? AND event_type = ? AND idempotency_key = ?',
    [tenantId, 'lead_captured', nkey],
  );
  const rec = {
    event_type: 'lead_captured',
    session_id: 'nfinal',
    channel: 'website',
    collected_fields: {},
    completed_at: new Date().toISOString(),
    captured_at: new Date().toISOString(),
    idempotency_key: nkey,
  };
  const n1 = await runWithTenantContext(ctx, () => leadNotify.dispatchLeadCaptureNotifyWithDedupe(rec));
  const n2 = await runWithTenantContext(ctx, () => leadNotify.dispatchLeadCaptureNotifyWithDedupe(rec));
  out.notify = { n1, n2, nh };

  await adapter.execute(
    'DELETE FROM tenant_notify_dedupe WHERE tenant_id = ? AND event_type = ? AND idempotency_key = ?',
    [tenantId, 'lead_captured', 'lead_captured:nfinal:2'],
  );
  const nc = await runWithTenantContext(ctx, () =>
    Promise.all([
      notifyRepo.beginNotifyDedupe({ event_type: 'lead_captured', idempotency_key: 'lead_captured:nfinal:2' }),
      notifyRepo.beginNotifyDedupe({ event_type: 'lead_captured', idempotency_key: 'lead_captured:nfinal:2' }),
    ]),
  );
  out.notify_begin_conc = nc.map((x) => x.decision);

  const casSrv = http.createServer(async (q, r) => {
    await adapter.execute(
      'UPDATE tenant_notify_dedupe SET version = version + 1 WHERE tenant_id = ? AND event_type = ? AND idempotency_key = ?',
      [tenantId, 'lead_captured', 'lead_captured:nfinal:3'],
    );
    r.statusCode = 200;
    r.end();
  });
  await new Promise((r) => casSrv.listen(3223, r));
  process.env.CHATFLOW_LEAD_NOTIFY_URL = 'http://127.0.0.1:3223/n';
  await adapter.execute(
    'DELETE FROM tenant_notify_dedupe WHERE tenant_id = ? AND event_type = ? AND idempotency_key = ?',
    [tenantId, 'lead_captured', 'lead_captured:nfinal:3'],
  );
  const n409 = await runWithTenantContext(ctx, () =>
    leadNotify.dispatchLeadCaptureNotifyWithDedupe({
      ...rec,
      idempotency_key: 'lead_captured:nfinal:3',
      session_id: 'n409',
    }),
  );
  casSrv.close();
  srv.close();
  out.notify_cas_http = n409.http_status;

  const t1 = await adapter.queryOne('SELECT 1 AS ok FROM tenant_inbound_dedupe LIMIT 1');
  const t2 = await adapter.queryOne('SELECT 1 AS ok FROM tenant_outbound_dedupe LIMIT 1');
  const t3 = await adapter.queryOne('SELECT 1 AS ok FROM tenant_notify_dedupe LIMIT 1');
  out.three_tables_readable = { inbound: Boolean(t1), outbound: Boolean(t2), notify: Boolean(t3) };

  const ok =
    row &&
    String(row.status) === 'completed' &&
    out.outbound_concurrent_pair.filter((x) => x.duplicate).length >= 1 &&
    out.outbound_third.duplicate &&
    out.outbound_third.http_status === 200 &&
    out.outbound_cas_stale &&
    out.outbound_cas_stale.ok === false &&
    out.outbound_begin_conc.includes('accepted') &&
    out.outbound_begin_conc.includes('duplicate_processing') &&
    out.inbound_linear[0] === 'accepted' &&
    out.inbound_linear[1] === 'duplicate_processing' &&
    out.inbound_after_complete === 'duplicate_completed' &&
    out.inbound_guard &&
    out.inbound_guard.http_status === 200 &&
    out.inbound_begin_conc.includes('accepted') &&
    out.inbound_begin_conc.includes('duplicate_processing') &&
    n1.sent &&
    n2.duplicate &&
    n2.http_status === 200 &&
    nh === 1 &&
    out.notify_begin_conc.includes('accepted') &&
    out.notify_begin_conc.includes('duplicate_processing') &&
    out.notify_cas_http === 409 &&
    out.three_tables_readable.inbound &&
    out.three_tables_readable.outbound &&
    out.three_tables_readable.notify;

  console.log(JSON.stringify({ ok, summary: out }, null, 2));
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
