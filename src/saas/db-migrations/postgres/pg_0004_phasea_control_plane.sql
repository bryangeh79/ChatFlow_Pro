ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS tenant_test_results (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL,
  scope_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'warning', 'skipped')),
  message TEXT NOT NULL,
  error_code TEXT,
  tested_at TIMESTAMPTZ NOT NULL,
  tested_by TEXT NOT NULL,
  metadata_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_ttr_tenant_scope_ts
  ON tenant_test_results(tenant_id, scope_type, scope_key, tested_at DESC);
CREATE INDEX IF NOT EXISTS idx_ttr_tenant_status_ts
  ON tenant_test_results(tenant_id, status, tested_at DESC);

CREATE TABLE IF NOT EXISTS tenant_runtime_health (
  tenant_id TEXT PRIMARY KEY REFERENCES tenants (id) ON DELETE CASCADE,
  ai_enabled SMALLINT NOT NULL DEFAULT 0 CHECK (ai_enabled IN (0, 1)),
  live_status TEXT NOT NULL DEFAULT 'inactive' CHECK (live_status IN ('inactive', 'degraded', 'live', 'paused')),
  last_inbound_at TIMESTAMPTZ,
  last_webhook_success_at TIMESTAMPTZ,
  last_error_message TEXT,
  last_error_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_go_live_checks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('not_ready', 'partially_ready', 'ready_to_go_live')),
  results_json TEXT NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL,
  checked_by TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tglc_tenant_checked_at
  ON tenant_go_live_checks(tenant_id, checked_at DESC);

CREATE TABLE IF NOT EXISTS tenant_website_domains (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  is_verified SMALLINT NOT NULL DEFAULT 0 CHECK (is_verified IN (0, 1)),
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, domain)
);

CREATE TABLE IF NOT EXISTS tenant_activity_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  actor_id TEXT NOT NULL,
  from_owner_id TEXT,
  to_owner_id TEXT,
  message TEXT NOT NULL,
  metadata_json TEXT,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tae_tenant_created
  ON tenant_activity_events(tenant_id, created_at DESC);
