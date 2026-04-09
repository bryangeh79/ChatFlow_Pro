/**
 * Phase D-C3B — verify manual repair: source guards, sqljs public API denied, adapter e2e (no live Postgres).
 * Run: npm run build && node scripts/verify-d-c3b-manual-repair.mjs
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');
const srcPath = join(root, 'src', 'saas', 'dedupe-manual-repair.ts');
const src = readFileSync(srcPath, 'utf8');
if (!src.includes("mode === 'dry_run'") || !src.includes('write_policy:')) {
  console.error(JSON.stringify({ ok: false, step: 'source_shape' }));
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), 'cf-d3b-verify-'));
const dbPath = join(dir, 'saas.sqlite');
process.env.CHATFLOW_SAAS_DB_DRIVER = 'sqljs';
process.env.CHATFLOW_SAAS_DB_PATH = dbPath;

const { getSaasDbAdapter } = await import('../dist/src/saas/db-adapter/index.js');
const {
  executeDedupeManualRepairOnAdapter,
  runDedupeManualRepair,
} = await import('../dist/src/saas/dedupe-manual-repair.js');

const pub = await runDedupeManualRepair({
  mode: 'dry_run',
  tenant_id: 't1',
  lane: 'inbound',
  channel: 'web',
  idempotency_key: 'k1',
  action: 'close_as_completed',
  operator: 'op',
  ticket_id: 'TK1',
  reason: 'dry run public api',
});
if (pub.ok === true || pub.postgres_only !== true) {
  console.error(JSON.stringify({ ok: false, step: 'public_api_sqljs_denied', pub }));
  process.exit(1);
}

const adapter = await getSaasDbAdapter();
const ddl = `
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS tenant_inbound_dedupe (
  tenant_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  provider_message_id TEXT,
  status TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  completed_at TEXT,
  PRIMARY KEY (tenant_id, channel, idempotency_key)
);
CREATE TABLE IF NOT EXISTS tenant_outbound_dedupe (
  tenant_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  session_id TEXT NOT NULL,
  message_trace_id TEXT NOT NULL,
  status TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  completed_at TEXT,
  PRIMARY KEY (tenant_id, channel, idempotency_key)
);
CREATE TABLE IF NOT EXISTS tenant_notify_dedupe (
  tenant_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  completed_at TEXT,
  PRIMARY KEY (tenant_id, event_type, idempotency_key)
);
CREATE TABLE IF NOT EXISTS dedupe_manual_repair_audit_events (
  id TEXT PRIMARY KEY,
  ts_iso TEXT NOT NULL,
  mode TEXT NOT NULL,
  result TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  lane TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL DEFAULT '',
  idempotency_key_fp TEXT NOT NULL,
  action TEXT NOT NULL,
  operator TEXT NOT NULL,
  ticket_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  detail_json TEXT
);
`;
for (const stmt of ddl.split(';').map((s) => s.trim()).filter(Boolean)) {
  await adapter.execute(stmt, []);
}

const tenantId = 'd3b-tenant-1';
await adapter.execute('INSERT OR REPLACE INTO tenants (id, slug, name) VALUES (?, ?, ?)', [
  tenantId,
  'd3b-slug',
  'D3B',
]);
const ts = new Date().toISOString();
await adapter.execute(
  `INSERT OR REPLACE INTO tenant_inbound_dedupe
   (tenant_id, channel, idempotency_key, provider_message_id, status, first_seen_at, last_seen_at, completed_at)
   VALUES (?, 'website', 'k-close', 'pm1', 'processing', ?, ?, NULL)`,
  [tenantId, ts, ts],
);

const audit0 = await adapter.queryOne(`SELECT COUNT(*) AS c FROM dedupe_manual_repair_audit_events`, []);
const n0 = Number(audit0?.c ?? 0);

const dry = await executeDedupeManualRepairOnAdapter(adapter, {
  mode: 'dry_run',
  tenant_id: tenantId,
  lane: 'inbound',
  channel: 'website',
  idempotency_key: 'k-close',
  action: 'close_as_completed',
  operator: 'verify',
  ticket_id: 'TK-DR',
  reason: 'verify dry run path long enough',
});
if (!dry.ok || dry.write_policy !== 'dry_run_no_writes') {
  console.error(JSON.stringify({ ok: false, step: 'dry_run', dry }));
  process.exit(1);
}
const auditDry = await adapter.queryOne(`SELECT COUNT(*) AS c FROM dedupe_manual_repair_audit_events`, []);
if (Number(auditDry?.c) !== n0) {
  console.error(JSON.stringify({ ok: false, step: 'dry_run_must_not_write_audit', before: n0, after: auditDry }));
  process.exit(1);
}

const denied = await executeDedupeManualRepairOnAdapter(adapter, {
  mode: 'apply',
  tenant_id: tenantId,
  lane: 'inbound',
  channel: 'website',
  idempotency_key: 'k-close',
  action: 'close_as_completed',
  operator: 'verify',
  ticket_id: 'TK1',
  reason: 'apply without env gate',
  apply_confirm_ticket: 'TK1',
});
if (denied.ok || denied.denied_code !== 'repair_apply_disabled') {
  console.error(JSON.stringify({ ok: false, step: 'apply_disabled', denied }));
  process.exit(1);
}

process.env.CHATFLOW_DEDUPE_MANUAL_REPAIR_ENABLED = '1';

const badConfirm = await executeDedupeManualRepairOnAdapter(adapter, {
  mode: 'apply',
  tenant_id: tenantId,
  lane: 'inbound',
  channel: 'website',
  idempotency_key: 'k-close',
  action: 'close_as_completed',
  operator: 'verify',
  ticket_id: 'TK1',
  reason: 'confirm mismatch test xx',
  apply_confirm_ticket: 'TK2',
});
if (badConfirm.ok || badConfirm.denied_code !== 'apply_confirm_mismatch') {
  console.error(JSON.stringify({ ok: false, step: 'confirm_mismatch', badConfirm }));
  process.exit(1);
}

const relDeny = await executeDedupeManualRepairOnAdapter(adapter, {
  mode: 'apply',
  tenant_id: tenantId,
  lane: 'inbound',
  channel: 'website',
  idempotency_key: 'k-rel',
  action: 'release_for_retry',
  operator: 'verify',
  ticket_id: 'TK1',
  reason: 'release without ack evidence xx',
  apply_confirm_ticket: 'TK1',
  ack_downstream_not_success: false,
});
if (relDeny.ok || relDeny.denied_code !== 'release_requires_ack') {
  console.error(JSON.stringify({ ok: false, step: 'release_ack', relDeny }));
  process.exit(1);
}

await adapter.execute(
  `INSERT OR REPLACE INTO tenant_inbound_dedupe
   (tenant_id, channel, idempotency_key, provider_message_id, status, first_seen_at, last_seen_at, completed_at)
   VALUES (?, 'website', 'k-rel', NULL, 'processing', ?, ?, NULL)`,
  [tenantId, ts, ts],
);

const applied = await executeDedupeManualRepairOnAdapter(adapter, {
  mode: 'apply',
  tenant_id: tenantId,
  lane: 'inbound',
  channel: 'website',
  idempotency_key: 'k-close',
  action: 'close_as_completed',
  operator: 'verify',
  ticket_id: 'TK1',
  reason: 'apply close inbound processing',
  apply_confirm_ticket: 'TK1',
});
if (!applied.ok || applied.write_policy !== 'apply_committed') {
  console.error(JSON.stringify({ ok: false, step: 'apply_close', applied }));
  process.exit(1);
}
if (!applied.audit_event_id) {
  console.error(JSON.stringify({ ok: false, step: 'audit_id', applied }));
  process.exit(1);
}

const rowAfter = await adapter.queryOne(
  `SELECT status FROM tenant_inbound_dedupe WHERE tenant_id = ? AND idempotency_key = 'k-close'`,
  [tenantId],
);
if (String(rowAfter?.status) !== 'completed') {
  console.error(JSON.stringify({ ok: false, step: 'inbound_completed', rowAfter }));
  process.exit(1);
}

const auditRows = await adapter.queryAll(`SELECT id, result FROM dedupe_manual_repair_audit_events`, []);
if (auditRows.length < 1) {
  console.error(JSON.stringify({ ok: false, step: 'audit_count', auditRows }));
  process.exit(1);
}

const relOk = await executeDedupeManualRepairOnAdapter(adapter, {
  mode: 'apply',
  tenant_id: tenantId,
  lane: 'inbound',
  channel: 'website',
  idempotency_key: 'k-rel',
  action: 'release_for_retry',
  operator: 'verify',
  ticket_id: 'TK-REL',
  reason: 'release with evidence and ack present',
  apply_confirm_ticket: 'TK-REL',
  ack_downstream_not_success: true,
  downstream_evidence: 'logs show pipeline failed before outbound 123456789012345678901234',
});
if (!relOk.ok) {
  console.error(JSON.stringify({ ok: false, step: 'release_apply', relOk }));
  process.exit(1);
}
const gone = await adapter.queryOne(
  `SELECT tenant_id FROM tenant_inbound_dedupe WHERE tenant_id = ? AND idempotency_key = 'k-rel'`,
  [tenantId],
);
if (gone) {
  console.error(JSON.stringify({ ok: false, step: 'release_should_delete', gone }));
  process.exit(1);
}

rmSync(dir, { recursive: true, force: true });

console.log(JSON.stringify({ ok: true, message: 'D-C3B manual repair verify passed' }, null, 2));
