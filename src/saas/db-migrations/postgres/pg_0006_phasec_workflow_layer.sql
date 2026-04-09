CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  external_contact_id TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  status TEXT NOT NULL CHECK (status IN ('open', 'pending', 'resolved', 'closed')),
  current_owner_principal_id TEXT,
  source_message_id TEXT,
  inquiry_summary TEXT,
  last_message_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (tenant_id, channel, external_contact_id)
);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_last_message
  ON conversations(tenant_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_status
  ON conversations(tenant_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound', 'system')),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'ai', 'agent', 'system')),
  sender_display_name TEXT,
  body TEXT NOT NULL,
  metadata_json TEXT,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON messages(conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS conversation_assignments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  owner_principal_id TEXT,
  assigned_by_principal_id TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('assign', 'handoff')),
  state TEXT NOT NULL CHECK (state IN ('active', 'superseded')),
  reason TEXT,
  note TEXT,
  assigned_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_conversation_assignments_conversation
  ON conversation_assignments(conversation_id, assigned_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_assignments_owner
  ON conversation_assignments(tenant_id, owner_principal_id, assigned_at DESC);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  conversation_id TEXT REFERENCES conversations (id) ON DELETE SET NULL,
  name TEXT,
  phone TEXT,
  email TEXT,
  source_channel TEXT NOT NULL,
  inquiry_summary TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('new', 'contacted', 'qualified', 'closed', 'unqualified')),
  owner_principal_id TEXT,
  latest_note TEXT,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (tenant_id, conversation_id)
);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_status ON leads(tenant_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_owner ON leads(tenant_id, owner_principal_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS lead_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  lead_id TEXT NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_principal_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  from_owner_principal_id TEXT,
  to_owner_principal_id TEXT,
  message TEXT NOT NULL,
  metadata_json TEXT,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lead_events_lead_created ON lead_events(lead_id, created_at DESC);
