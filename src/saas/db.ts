import * as fs from 'node:fs';
import * as path from 'node:path';

/** sql.js Database — typed loosely (package ships without .d.ts). */
export type SqlJsDatabase = {
  run: (sql: string, params?: unknown[]) => void;
  exec: (sql: string) => void;
  prepare: (sql: string) => SqlStatement;
  export: () => Uint8Array;
  close: () => void;
};

export type SqlStatement = {
  bind: (values: unknown[]) => void;
  step: () => boolean;
  get: () => unknown[];
  getAsObject: () => Record<string, unknown>;
  free: () => void;
};

type InitSqlJs = (opts?: { locateFile?: (file: string) => string }) => Promise<{
  Database: new (data?: Uint8Array) => SqlJsDatabase;
}>;

let dbInstance: SqlJsDatabase | null = null;
let initPromise: Promise<SqlJsDatabase> | null = null;

function readDriverForSqlJsGate(): 'sqljs' | 'postgres' {
  const raw = process.env.CHATFLOW_SAAS_DB_DRIVER;
  const t = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (t === '' || t === 'postgres') return 'postgres';
  if (t === 'sqljs') return 'sqljs';
  throw new Error(`invalid_chatflow_saas_db_driver:${t}`);
}

function isSqlJsCompatEnabled(): boolean {
  const raw = process.env.CHATFLOW_SAAS_SQLJS_COMPAT?.trim();
  return raw === '1';
}

function dbFilePath(): string {
  const raw = process.env.CHATFLOW_SAAS_DB_PATH?.trim();
  if (raw) return path.resolve(raw);
  return path.join(process.cwd(), 'data', 'chatflow-saas.sqlite');
}

function ensureDataDir(file: string): void {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  suspended_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tenant_credentials (
  tenant_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (tenant_id, key),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tenant_credential_rotation_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  credential_key TEXT NOT NULL,
  actor_source TEXT NOT NULL,
  rotation_reason TEXT NOT NULL DEFAULT 'manual',
  prev_plaintext_fp TEXT NOT NULL,
  new_plaintext_fp TEXT NOT NULL,
  prev_blob_fp TEXT NOT NULL,
  new_blob_fp TEXT NOT NULL,
  outcome TEXT NOT NULL,
  ts_iso TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_tcrot_tenant_ts ON tenant_credential_rotation_events(tenant_id, ts_iso DESC);

CREATE TABLE IF NOT EXISTS break_glass_audit_events (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  ts_iso TEXT NOT NULL,
  expires_at_iso TEXT,
  request_id TEXT,
  detail_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_bga_ts ON break_glass_audit_events(ts_iso DESC);

CREATE TABLE IF NOT EXISTS tenant_faq_entries (
  id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  language TEXT NOT NULL,
  topic TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'manual',
  keywords_json TEXT NOT NULL DEFAULT '[]',
  tags_json TEXT NOT NULL DEFAULT '[]',
  is_active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_faq_tenant_question
  ON tenant_faq_entries(tenant_id, question);

CREATE TABLE IF NOT EXISTS tenant_settings (
  tenant_id TEXT PRIMARY KEY,
  settings_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tenant_admin_principals (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('tenant_admin', 'tenant_operator_readonly')),
  bridge_token TEXT NOT NULL UNIQUE,
  bridge_token_hash TEXT,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  display_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tenant_admin_principal_audit_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  principal_role TEXT NOT NULL CHECK (principal_role IN ('tenant_admin', 'tenant_operator_readonly')),
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'disabled', 'enabled', 'rotated', 'deleted')),
  actor_auth_source TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  actor_scope_type TEXT NOT NULL,
  actor_tenant_slug TEXT,
  target_display_name TEXT,
  target_is_enabled INTEGER NOT NULL,
  token_state TEXT NOT NULL CHECK (token_state IN ('hash_at_rest', 'legacy_plaintext_at_rest')),
  ts_iso TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_tap_audit_tenant_ts ON tenant_admin_principal_audit_logs(tenant_id, ts_iso DESC);

CREATE TABLE IF NOT EXISTS tenant_test_results (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  scope_type TEXT NOT NULL,
  scope_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'warning', 'skipped')),
  message TEXT NOT NULL,
  error_code TEXT,
  tested_at TEXT NOT NULL,
  tested_by TEXT NOT NULL,
  metadata_json TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_ttr_tenant_scope_ts
  ON tenant_test_results(tenant_id, scope_type, scope_key, tested_at DESC);
CREATE INDEX IF NOT EXISTS idx_ttr_tenant_status_ts
  ON tenant_test_results(tenant_id, status, tested_at DESC);

CREATE TABLE IF NOT EXISTS tenant_runtime_health (
  tenant_id TEXT PRIMARY KEY,
  ai_enabled INTEGER NOT NULL DEFAULT 0,
  live_status TEXT NOT NULL DEFAULT 'inactive' CHECK (live_status IN ('inactive', 'degraded', 'live', 'paused')),
  last_inbound_at TEXT,
  last_webhook_success_at TEXT,
  last_error_message TEXT,
  last_error_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tenant_go_live_checks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('not_ready', 'partially_ready', 'ready_to_go_live')),
  results_json TEXT NOT NULL,
  checked_at TEXT NOT NULL,
  checked_by TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_tglc_tenant_checked_at
  ON tenant_go_live_checks(tenant_id, checked_at DESC);

CREATE TABLE IF NOT EXISTS tenant_website_domains (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  is_verified INTEGER NOT NULL DEFAULT 0,
  last_verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (tenant_id, domain),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tenant_activity_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  actor_id TEXT NOT NULL,
  from_owner_id TEXT,
  to_owner_id TEXT,
  message TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_tae_tenant_created
  ON tenant_activity_events(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS tenant_products (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_tp_tenant_created ON tenant_products(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  external_contact_id TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  status TEXT NOT NULL CHECK (status IN ('open', 'pending', 'resolved', 'closed')),
  current_owner_principal_id TEXT,
  source_message_id TEXT,
  inquiry_summary TEXT,
  last_message_at TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (tenant_id, channel, external_contact_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_last_message
  ON conversations(tenant_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_status
  ON conversations(tenant_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound', 'system')),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'ai', 'agent', 'system')),
  sender_display_name TEXT,
  body TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON messages(conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS conversation_assignments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  owner_principal_id TEXT,
  assigned_by_principal_id TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('assign', 'handoff')),
  state TEXT NOT NULL CHECK (state IN ('active', 'superseded')),
  reason TEXT,
  note TEXT,
  assigned_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_conversation_assignments_conversation
  ON conversation_assignments(conversation_id, assigned_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_assignments_owner
  ON conversation_assignments(tenant_id, owner_principal_id, assigned_at DESC);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  conversation_id TEXT,
  name TEXT,
  phone TEXT,
  email TEXT,
  source_channel TEXT NOT NULL,
  inquiry_summary TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('new', 'contacted', 'qualified', 'closed', 'unqualified')),
  owner_principal_id TEXT,
  latest_note TEXT,
  converted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (tenant_id, conversation_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_status ON leads(tenant_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_owner ON leads(tenant_id, owner_principal_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS lead_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  lead_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_principal_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  from_owner_principal_id TEXT,
  to_owner_principal_id TEXT,
  message TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_lead_events_lead_created ON lead_events(lead_id, created_at DESC);

CREATE TABLE IF NOT EXISTS platform_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error')),
  source TEXT NOT NULL CHECK (source IN ('webhook', 'test', 'runtime_health', 'go_live', 'lifecycle', 'settings')),
  message TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_platform_logs_created ON platform_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_logs_tenant ON platform_logs(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT NOT NULL
);
`;

function applyTenantPrincipalHashColumnMigration(db: SqlJsDatabase): void {
  const stmt = db.prepare('PRAGMA table_info(tenant_admin_principals)');
  const names = new Set<string>();
  while (stmt.step()) {
    const o = stmt.getAsObject() as Record<string, unknown>;
    names.add(String(o.name));
  }
  stmt.free();
  if (!names.has('bridge_token_hash')) {
    db.run('ALTER TABLE tenant_admin_principals ADD COLUMN bridge_token_hash TEXT');
  }
  db.run(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_tap_bridge_token_hash
     ON tenant_admin_principals(bridge_token_hash)
     WHERE bridge_token_hash IS NOT NULL AND length(bridge_token_hash) > 0`,
  );
}

function hasTableColumn(db: SqlJsDatabase, table: string, col: string): boolean {
  const stmt = db.prepare(`PRAGMA table_info(${table})`);
  const names = new Set<string>();
  while (stmt.step()) {
    const o = stmt.getAsObject() as Record<string, unknown>;
    names.add(String(o.name));
  }
  stmt.free();
  return names.has(col);
}

function applyTenantStatusColumnMigration(db: SqlJsDatabase): void {
  if (!hasTableColumn(db, 'tenants', 'status')) {
    db.run("ALTER TABLE tenants ADD COLUMN status TEXT NOT NULL DEFAULT 'active'");
  }
  if (!hasTableColumn(db, 'tenants', 'suspended_at')) {
    db.run('ALTER TABLE tenants ADD COLUMN suspended_at TEXT');
  }
}

function applyPhaseBFaqAndPlatformMigrations(db: SqlJsDatabase): void {
  if (!hasTableColumn(db, 'tenant_faq_entries', 'source_type')) {
    db.run("ALTER TABLE tenant_faq_entries ADD COLUMN source_type TEXT NOT NULL DEFAULT 'manual'");
  }
  if (!hasTableColumn(db, 'tenant_faq_entries', 'updated_at')) {
    db.run('ALTER TABLE tenant_faq_entries ADD COLUMN updated_at TEXT');
    db.run("UPDATE tenant_faq_entries SET updated_at = datetime('now') WHERE updated_at IS NULL OR updated_at = ''");
  }
  db.run(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_faq_tenant_question
     ON tenant_faq_entries(tenant_id, question)`,
  );
}

function applyFaqTranslationColumnMigrations(db: SqlJsDatabase): void {
  if (!hasTableColumn(db, 'tenant_faq_entries', 'translation_status')) {
    db.run("ALTER TABLE tenant_faq_entries ADD COLUMN translation_status TEXT NOT NULL DEFAULT 'source'");
    db.run("UPDATE tenant_faq_entries SET translation_status = 'source' WHERE translation_status IS NULL OR translation_status = ''");
  }
  if (!hasTableColumn(db, 'tenant_faq_entries', 'source_faq_id')) {
    db.run('ALTER TABLE tenant_faq_entries ADD COLUMN source_faq_id TEXT');
  }
  if (!hasTableColumn(db, 'tenant_faq_entries', 'reviewed_at')) {
    db.run('ALTER TABLE tenant_faq_entries ADD COLUMN reviewed_at TEXT');
  }
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_faq_source_translations
     ON tenant_faq_entries (tenant_id, source_faq_id, language, translation_status)`,
  );
}

function applyPhaseCWorkflowMigrations(db: SqlJsDatabase): void {
  if (!hasTableColumn(db, 'messages', 'sender_display_name')) {
    db.run('ALTER TABLE messages ADD COLUMN sender_display_name TEXT');
  }
  db.run(
    `UPDATE conversations
     SET status = 'resolved'
     WHERE status = 'closed'`,
  );
}

export async function getSaaSDatabase(): Promise<SqlJsDatabase> {
  const driver = readDriverForSqlJsGate();
  if (driver !== 'sqljs' && !isSqlJsCompatEnabled()) {
    throw new Error(
      'sqljs_disabled_for_default_live_chain:set_CHATFLOW_SAAS_DB_DRIVER=sqljs_and_CHATFLOW_SAAS_SQLJS_COMPAT=1_for_dev_or_compat_only',
    );
  }
  if (dbInstance) return dbInstance;
  if (!initPromise) {
    initPromise = (async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('sql.js') as { default?: InitSqlJs } & InitSqlJs;
      const initSqlJs = (typeof mod.default === 'function' ? mod.default : mod) as InitSqlJs;
      const sqlPkgRoot = path.dirname(require.resolve('sql.js/package.json'));
      const SQL = await initSqlJs({
        locateFile: (f: string) => path.join(sqlPkgRoot, 'dist', path.basename(f)),
      });
      const file = dbFilePath();
      ensureDataDir(file);
      let data: Uint8Array | undefined;
      if (fs.existsSync(file)) {
        data = new Uint8Array(fs.readFileSync(file));
      }
      const db = new SQL.Database(data);
      db.exec(SCHEMA);
      applyTenantPrincipalHashColumnMigration(db);
      applyTenantStatusColumnMigration(db);
      applyPhaseBFaqAndPlatformMigrations(db);
      applyPhaseCWorkflowMigrations(db);
      applyFaqTranslationColumnMigrations(db);
      db.run(
        `CREATE TABLE IF NOT EXISTS tenant_products (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          name TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
        )`
      );
      db.run(
        `CREATE INDEX IF NOT EXISTS idx_tp_tenant_created ON tenant_products(tenant_id, created_at DESC)`
      );
      dbInstance = db;
      return db;
    })();
  }
  return initPromise;
}

export function persistSaaSDatabase(): void {
  if (!dbInstance) return;
  const file = dbFilePath();
  ensureDataDir(file);
  const out = Buffer.from(dbInstance.export());
  fs.writeFileSync(file, out);
}

export function getSaaSDbPathForDisplay(): string {
  return dbFilePath();
}
