-- Phase E: tenant_products — product category dimension for FAQ knowledge entries.
CREATE TABLE IF NOT EXISTS tenant_products (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tp_tenant_created
  ON tenant_products(tenant_id, created_at DESC);
