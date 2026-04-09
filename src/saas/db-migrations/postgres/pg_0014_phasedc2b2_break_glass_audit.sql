-- Phase D-C2B2 — break-glass TTL audit (no secrets).
CREATE TABLE IF NOT EXISTS break_glass_audit_events (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  ts_iso TEXT NOT NULL,
  expires_at_iso TEXT,
  request_id TEXT,
  detail_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_bga_ts ON break_glass_audit_events (ts_iso DESC);
