CREATE TABLE IF NOT EXISTS tenant_outbound_dedupe (
  tenant_id TEXT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  session_id TEXT NOT NULL,
  message_trace_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed')),
  version BIGINT NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, channel, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_tenant_outbound_dedupe_status
  ON tenant_outbound_dedupe (tenant_id, status, last_seen_at DESC);
