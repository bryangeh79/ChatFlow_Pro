CREATE TABLE IF NOT EXISTS tenant_session_state (
  tenant_id TEXT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  external_user_id TEXT NOT NULL,
  external_session_id TEXT NOT NULL,
  state_json TEXT NOT NULL,
  version BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_session_state_expires_at
  ON tenant_session_state (expires_at);
