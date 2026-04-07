-- Phase 24 / 2E — Postgres DDL draft (not executed by the app). Principals + audit; partial unique index on bridge_token_hash.
CREATE TABLE IF NOT EXISTS tenant_admin_principals (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('tenant_admin', 'tenant_operator_readonly')),
  bridge_token TEXT NOT NULL UNIQUE,
  bridge_token_hash TEXT,
  is_enabled SMALLINT NOT NULL DEFAULT 1 CHECK (is_enabled IN (0, 1)),
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tap_bridge_token_hash ON tenant_admin_principals (bridge_token_hash)
WHERE
  bridge_token_hash IS NOT NULL
  AND length(trim(bridge_token_hash)) > 0;

CREATE TABLE IF NOT EXISTS tenant_admin_principal_audit_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  principal_role TEXT NOT NULL CHECK (principal_role IN ('tenant_admin', 'tenant_operator_readonly')),
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'disabled', 'enabled', 'rotated', 'deleted')),
  actor_auth_source TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  actor_scope_type TEXT NOT NULL,
  actor_tenant_slug TEXT,
  target_display_name TEXT,
  target_is_enabled SMALLINT NOT NULL CHECK (target_is_enabled IN (0, 1)),
  token_state TEXT NOT NULL CHECK (token_state IN ('hash_at_rest', 'legacy_plaintext_at_rest')),
  ts_iso TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tap_audit_tenant_ts ON tenant_admin_principal_audit_logs (tenant_id, ts_iso DESC);
