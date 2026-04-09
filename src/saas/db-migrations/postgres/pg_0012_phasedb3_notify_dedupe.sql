CREATE TABLE IF NOT EXISTS tenant_notify_dedupe (
  tenant_id TEXT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed')),
  version BIGINT NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, event_type, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_tenant_notify_dedupe_status
  ON tenant_notify_dedupe (tenant_id, status, last_seen_at DESC);
