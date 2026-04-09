CREATE TABLE IF NOT EXISTS tenant_delivery_state (
  tenant_id TEXT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  delivery_status TEXT NOT NULL,
  state_json TEXT NOT NULL,
  version BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_delivery_state_status
  ON tenant_delivery_state (tenant_id, delivery_status, updated_at DESC);
