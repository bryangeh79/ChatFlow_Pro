-- Phase D-C2B1 — tenant credential rotation ledger (fingerprints only; no secrets).
CREATE TABLE IF NOT EXISTS tenant_credential_rotation_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  credential_key TEXT NOT NULL,
  actor_source TEXT NOT NULL,
  rotation_reason TEXT NOT NULL DEFAULT 'manual',
  prev_plaintext_fp TEXT NOT NULL,
  new_plaintext_fp TEXT NOT NULL,
  prev_blob_fp TEXT NOT NULL,
  new_blob_fp TEXT NOT NULL,
  outcome TEXT NOT NULL,
  ts_iso TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tcrot_tenant_ts ON tenant_credential_rotation_events (tenant_id, ts_iso DESC);
