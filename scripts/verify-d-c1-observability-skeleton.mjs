/**
 * Phase D-C1 — verify structured log, ops_alert P1/P2/P3, platform_audit append, redaction.
 * Run: npm run build && node scripts/verify-d-c1-observability-skeleton.mjs
 */
import { mkdirSync, readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const auditPath = join(process.cwd(), 'data', 'platform-audit-events.jsonl');
const secretProbe = 'SUPER_SECRET_TOKEN_XYZ';

process.env.CHATFLOW_OPS_ALERT_LOG = '1';
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

const { emitOpsAlert } = await import('../dist/src/observability/ops-alert.js');
const { writeStructuredLog } = await import('../dist/src/observability/structured-log.js');
const { appendPlatformAuditEvent } = await import('../dist/src/observability/platform-audit.js');

emitOpsAlert({
  severity: 'P1',
  code: 'verify_p1',
  message: 'sample P1',
  phase: 'readiness',
  context: { oauth_token: secretProbe },
});
emitOpsAlert({
  severity: 'P2',
  code: 'verify_p2',
  message: 'sample P2',
  phase: 'outbound',
  context: { api_key: secretProbe },
});
emitOpsAlert({
  severity: 'P3',
  code: 'verify_p3',
  message: 'sample P3',
  phase: 'security',
});

writeStructuredLog({
  type: 'verify_runtime',
  phase: 'lifecycle',
  outcome: 'ok',
  nested: { bearer_token: secretProbe },
});

appendPlatformAuditEvent({
  action: 'verify.d_c1_smoke',
  actor_type: 'system',
  resource: 'verify_script',
  detail: { client_secret: secretProbe },
});

console.log = origLog;

const p1 = lines.some((l) => l.includes('"severity":"P1"') && l.includes('verify_p1'));
const p2 = lines.some((l) => l.includes('"severity":"P2"') && l.includes('verify_p2'));
const p3 = lines.some((l) => l.includes('"severity":"P3"') && l.includes('verify_p3'));
const structured = lines.some((l) => l.includes('"type":"verify_runtime"'));

const auditRaw = readFileSync(auditPath, 'utf8');
const auditLines = auditRaw.trim().split('\n').filter(Boolean);
const auditOk = auditLines.some((l) => l.includes('verify.d_c1_smoke'));

const leaked =
  lines.some((l) => l.includes(secretProbe)) || auditRaw.includes(secretProbe);

if (!p1 || !p2 || !p3 || !structured || !auditOk || leaked) {
  console.error(
    JSON.stringify({ ok: false, p1, p2, p3, structured, auditOk, leaked, lineCount: lines.length }, null, 2),
  );
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, message: 'D-C1 observability skeleton verify passed' }, null, 2));
