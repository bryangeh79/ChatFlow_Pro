CREATE TABLE IF NOT EXISTS tenant_processing_state (
  tenant_id TEXT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  processing_stage TEXT NOT NULL,
  state_json TEXT NOT NULL,
  version BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_processing_state_stage
  ON tenant_processing_state (tenant_id, processing_stage, updated_at DESC);
