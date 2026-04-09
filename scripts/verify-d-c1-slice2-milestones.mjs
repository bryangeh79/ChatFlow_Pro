/**
 * Phase D-C1 slice 2 — pipeline milestone, inbound dedupe, state CAS, admin sensitive_read audit; no secret leak.
 * Run: npm run build && node scripts/verify-d-c1-slice2-milestones.mjs
 */
import { mkdirSync, readFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const auditPath = join(process.cwd(), 'data', 'platform-audit-events.jsonl');
const secretProbe = 'SLICE2_SECRET_PROBE_NOT_IN_LOGS';

process.env.CHATFLOW_PLATFORM_AUDIT_LOG = '1';
process.env.CHATFLOW_STRUCTURED_RUNTIME_LOG = '1';

mkdirSync(join(process.cwd(), 'data'), { recursive: true });
if (existsSync(auditPath)) unlinkSync(auditPath);

const lines = [];
const origLog = console.log;
console.log = (...args) => {
  lines.push(args.map(String).join(' '));
  origLog(...args);
};

const { runUnifiedInboundPipeline } = await import('../dist/src/channels/unified-inbound-pipeline/index.js');
const { guardInboundDedupe } = await import('../dist/src/webhooks/inbound-dedupe.js');
const { logStateCasConflict } = await import('../dist/src/observability/state-cas-log.js');
const { auditAdminSensitiveRead } = await import('../dist/src/observability/admin-sensitive-audit.js');
const { appendPlatformAuditEvent } = await import('../dist/src/observability/platform-audit.js');

const minimalMessage = {
  channel: 'website',
  external_user_id: 'u1',
  external_session_id: 's1',
  message_id: 'm1',
  message_type: 'text',
  timestamp: new Date().toISOString(),
  text: 'hello',
  raw_payload: { probe: secretProbe },
};

await runUnifiedInboundPipeline(minimalMessage, undefined, {
  traceContext: { request_id: 'req-verify', message_trace_id: 'mt-verify' },
});

await guardInboundDedupe(minimalMessage);

logStateCasConflict({
  layer: 'session_state',
  tenant_id: 'tenant-verify',
  session_id: 'session-raw-id',
  channel: 'website',
});

auditAdminSensitiveRead({
  route_key: 'verify.admin.sensitive_read',
  tenant_id: 'tenant-verify',
  request_id: 'req-verify',
  principal_role: 'platform_admin',
});
appendPlatformAuditEvent({
  action: 'verify.redaction_probe',
  actor_type: 'system',
  resource: 'verify_script',
  detail: { client_secret: secretProbe },
});

console.log = origLog;

const pipelineOk = lines.some(
  (l) => l.includes('"type":"pipeline_milestone"') && l.includes('"outcome":"dispatch_resolved"'),
);
const dedupeOk = lines.some((l) => l.includes('"type":"inbound_dedupe_decision"'));
const casOk = lines.some((l) => l.includes('"type":"state_cas_conflict"') && l.includes('"outcome":"cas_conflict"'));

const auditRaw = readFileSync(auditPath, 'utf8');
const auditSensitive = auditRaw.includes('"action":"admin.sensitive_read"');
const auditRoute = auditRaw.includes('verify.admin.sensitive_read');

const leaked =
  lines.some((l) => l.includes(secretProbe)) || auditRaw.includes(secretProbe);

if (!pipelineOk || !dedupeOk || !casOk || !auditSensitive || !auditRoute || leaked) {
  console.error(
    JSON.stringify(
      { ok: false, pipelineOk, dedupeOk, casOk, auditSensitive, auditRoute, leaked, lineCount: lines.length },
      null,
      2,
    ),
  );
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, message: 'D-C1 slice2 milestones verify passed' }, null, 2));
