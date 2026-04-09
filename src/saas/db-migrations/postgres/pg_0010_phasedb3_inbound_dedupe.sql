CREATE TABLE IF NOT EXISTS tenant_inbound_dedupe (
  tenant_id TEXT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  provider_message_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed')),
  first_seen_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, channel, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_tenant_inbound_dedupe_status
  ON tenant_inbound_dedupe (tenant_id, status, last_seen_at DESC);
