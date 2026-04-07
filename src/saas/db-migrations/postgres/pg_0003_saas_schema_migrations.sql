-- Phase 24 — `saas_schema_migrations` ledger table (DDL asset only).
-- The app does not auto-apply this file in this phase; operators must run DDL on the target DB when enabling Postgres ledger.
CREATE TABLE IF NOT EXISTS saas_schema_migrations (
  migration_id TEXT PRIMARY KEY,
  driver TEXT NOT NULL,
  checksum_sha256 TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'applied'
);
