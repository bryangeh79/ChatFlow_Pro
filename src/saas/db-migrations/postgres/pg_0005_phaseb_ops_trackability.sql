ALTER TABLE tenant_faq_entries
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_faq_tenant_question
  ON tenant_faq_entries(tenant_id, question);

CREATE TABLE IF NOT EXISTS platform_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error')),
  source TEXT NOT NULL CHECK (source IN ('webhook', 'test', 'runtime_health', 'go_live', 'lifecycle', 'settings')),
  message TEXT NOT NULL,
  metadata_json TEXT,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_platform_logs_created ON platform_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_logs_tenant ON platform_logs(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT NOT NULL
);
