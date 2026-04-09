CREATE TABLE IF NOT EXISTS dedupe_manual_repair_audit_events (
  id TEXT PRIMARY KEY,
  ts_iso TIMESTAMPTZ NOT NULL,
  mode TEXT NOT NULL CHECK (mode = 'apply'),
  result TEXT NOT NULL CHECK (result IN ('ok', 'denied', 'error')),
  tenant_id TEXT NOT NULL,
  lane TEXT NOT NULL CHECK (lane IN ('inbound', 'outbound', 'notify')),
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

CREATE INDEX IF NOT EXISTS idx_dedupe_manual_repair_audit_ts
  ON dedupe_manual_repair_audit_events (ts_iso DESC);

CREATE INDEX IF NOT EXISTS idx_dedupe_manual_repair_audit_tenant
  ON dedupe_manual_repair_audit_events (tenant_id, ts_iso DESC);
