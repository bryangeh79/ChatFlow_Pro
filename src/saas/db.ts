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

CREATE TABLE IF NOT EXISTS tenant_faq_entries (
  id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  language TEXT NOT NULL,
  topic TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords_json TEXT NOT NULL DEFAULT '[]',
  tags_json TEXT NOT NULL DEFAULT '[]',
  is_active INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

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

export async function getSaaSDatabase(): Promise<SqlJsDatabase> {
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
