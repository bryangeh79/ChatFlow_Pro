/**
 * Phase D-C2C1 — e2e: seed sqljs dedupe tables → dry-run counts → apply deletes cold completed only → processing untouched → second apply noop.
 * Run: npm run build && node scripts/verify-d-c2c1-dedupe-retention.mjs
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'cf-d2c1-dedupe-'));
const dbPath = join(dir, 'saas.sqlite');

process.env.CHATFLOW_SAAS_DB_DRIVER = 'sqljs';
process.env.CHATFLOW_SAAS_DB_PATH = dbPath;

const { getSaasDbAdapter } = await import('../dist/src/saas/db-adapter/index.js');
const { runDedupeRetentionCleanup } = await import('../dist/src/saas/dedupe-retention-cleanup.js');

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
`;
for (const stmt of ddl.split(';').map((s) => s.trim()).filter(Boolean)) {
  await adapter.execute(stmt, []);
}
await adapter.persistIfNeeded();

const tenantId = 'd2c1-tenant-1';
await adapter.execute('INSERT OR REPLACE INTO tenants (id, slug, name) VALUES (?, ?, ?)', [
  tenantId,
  'd2c1-slug',
  'D2C1',
]);

const old = new Date(Date.now() - 100 * 86_400_000).toISOString();
const recent = new Date(Date.now() - 2 * 86_400_000).toISOString();

await adapter.execute(
  `INSERT OR REPLACE INTO tenant_inbound_dedupe
   (tenant_id, channel, idempotency_key, provider_message_id, status, first_seen_at, last_seen_at, completed_at)
   VALUES (?, 'website', 'k-old-completed', NULL, 'completed', ?, ?, ?)`,
  [tenantId, old, old, old],
);
await adapter.execute(
  `INSERT OR REPLACE INTO tenant_inbound_dedupe
   (tenant_id, channel, idempotency_key, provider_message_id, status, first_seen_at, last_seen_at, completed_at)
   VALUES (?, 'website', 'k-recent-completed', NULL, 'completed', ?, ?, ?)`,
  [tenantId, recent, recent, recent],
);
await adapter.execute(
  `INSERT OR REPLACE INTO tenant_inbound_dedupe
   (tenant_id, channel, idempotency_key, provider_message_id, status, first_seen_at, last_seen_at, completed_at)
   VALUES (?, 'website', 'k-old-processing', NULL, 'processing', ?, ?, NULL)`,
  [tenantId, old, old],
);

await adapter.execute(
  `INSERT OR REPLACE INTO tenant_outbound_dedupe
   (tenant_id, channel, idempotency_key, session_id, message_trace_id, status, version, first_seen_at, last_seen_at, completed_at)
   VALUES (?, 'line', 'ob-old', 's', 'm', 'completed', 1, ?, ?, ?)`,
  [tenantId, old, old, old],
);
await adapter.execute(
  `INSERT OR REPLACE INTO tenant_outbound_dedupe
   (tenant_id, channel, idempotency_key, session_id, message_trace_id, status, version, first_seen_at, last_seen_at, completed_at)
   VALUES (?, 'line', 'ob-proc', 's', 'm', 'processing', 1, ?, ?, NULL)`,
  [tenantId, old, old],
);

await adapter.execute(
  `INSERT OR REPLACE INTO tenant_notify_dedupe
   (tenant_id, event_type, idempotency_key, status, version, first_seen_at, last_seen_at, completed_at)
   VALUES (?, 'lead', 'nf-old', 'completed', 1, ?, ?, ?)`,
  [tenantId, old, old, old],
);
await adapter.execute(
  `INSERT OR REPLACE INTO tenant_notify_dedupe
   (tenant_id, event_type, idempotency_key, status, version, first_seen_at, last_seen_at, completed_at)
   VALUES (?, 'lead', 'nf-proc', 'processing', 1, ?, ?, NULL)`,
  [tenantId, old, old],
);

await adapter.persistIfNeeded();

const dry = await runDedupeRetentionCleanup({
  dryRun: true,
  maxRows: 10_000,
  retentionDays: 90,
  tenantId,
});
if (!dry.dry_run || dry.inbound.completed_deletion_candidates < 1 || dry.outbound.completed_deletion_candidates < 1) {
  console.error(JSON.stringify({ ok: false, step: 'dry_run_inbound_outbound', dry }, null, 2));
  process.exit(1);
}
if (dry.notify.completed_deletion_candidates < 1) {
  console.error(JSON.stringify({ ok: false, step: 'dry_run_notify', dry }, null, 2));
  process.exit(1);
}
if (
  dry.inbound.processing_stale_count < 1 ||
  dry.outbound.processing_stale_count < 1 ||
  dry.notify.processing_stale_count < 1
) {
  console.error(JSON.stringify({ ok: false, step: 'dry_run_processing_stale', dry }, null, 2));
  process.exit(1);
}

const apply1 = await runDedupeRetentionCleanup({
  dryRun: false,
  maxRows: 500,
  retentionDays: 90,
  tenantId,
});
if (
  apply1.inbound.deleted < 1 ||
  apply1.outbound.deleted < 1 ||
  apply1.notify.deleted < 1
) {
  console.error(JSON.stringify({ ok: false, step: 'apply_deleted', apply1 }, null, 2));
  process.exit(1);
}

const procIn = await adapter.queryOne(
  `SELECT COUNT(*) AS c FROM tenant_inbound_dedupe WHERE tenant_id = ? AND status = 'processing'`,
  [tenantId],
);
if (Number(procIn?.c) !== 1) {
  console.error(JSON.stringify({ ok: false, step: 'processing_inbound_preserved', procIn }, null, 2));
  process.exit(1);
}
const recentIn = await adapter.queryOne(
  `SELECT COUNT(*) AS c FROM tenant_inbound_dedupe WHERE tenant_id = ? AND idempotency_key = 'k-recent-completed'`,
  [tenantId],
);
if (Number(recentIn?.c) !== 1) {
  console.error(JSON.stringify({ ok: false, step: 'recent_completed_preserved', recentIn }, null, 2));
  process.exit(1);
}

const apply2 = await runDedupeRetentionCleanup({
  dryRun: false,
  maxRows: 500,
  retentionDays: 90,
  tenantId,
});
if (
  apply2.inbound.completed_deletion_candidates !== 0 ||
  apply2.outbound.completed_deletion_candidates !== 0 ||
  apply2.notify.completed_deletion_candidates !== 0
) {
  console.error(JSON.stringify({ ok: false, step: 'second_apply_should_have_zero_candidates', apply2 }, null, 2));
  process.exit(1);
}
if (apply2.inbound.deleted !== 0 || apply2.outbound.deleted !== 0 || apply2.notify.deleted !== 0) {
  console.error(JSON.stringify({ ok: false, step: 'second_apply_zero_deleted', apply2 }, null, 2));
  process.exit(1);
}

rmSync(dir, { recursive: true, force: true });

console.log(JSON.stringify({ ok: true, message: 'D-C2C1 dedupe retention verify passed' }, null, 2));
