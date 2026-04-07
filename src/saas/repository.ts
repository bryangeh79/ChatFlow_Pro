import { randomUUID } from 'node:crypto';
import type { SqlJsDatabase } from './db';
import { getSaaSDatabase, persistSaaSDatabase } from './db';
import { hashBridgeToken } from './bridge-token';
import type { UnifiedFaqSeedEntry } from '../channels/unified-inbound-pipeline/faq-seed';

export interface TenantRow {
  id: string;
  slug: string;
  name: string;
  created_at: string;
}

function stmtAll(db: SqlJsDatabase, sql: string, params: unknown[] = []): Record<string, unknown>[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: Record<string, unknown>[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function stmtGet(
  db: SqlJsDatabase,
  sql: string,
  params: unknown[] = [],
): Record<string, unknown> | null {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (!stmt.step()) {
    stmt.free();
    return null;
  }
  const row = stmt.getAsObject();
  stmt.free();
  return row;
}

export async function getTenantBySlug(slug: string): Promise<TenantRow | null> {
  const db = await getSaaSDatabase();
  const row = stmtGet(db, 'SELECT id, slug, name, created_at FROM tenants WHERE slug = ?', [slug]);
  if (!row) return null;
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    created_at: String(row.created_at),
  };
}

export async function createTenant(slug: string, name: string): Promise<TenantRow> {
  const db = await getSaaSDatabase();
  const id = randomUUID();
  db.run('INSERT INTO tenants (id, slug, name) VALUES (?, ?, ?)', [id, slug, name]);
  db.run(
    'INSERT OR REPLACE INTO tenant_settings (tenant_id, settings_json, updated_at) VALUES (?, ?, datetime(\'now\'))',
    [id, '{}'],
  );
  persistSaaSDatabase();
  const row = await getTenantBySlug(slug);
  if (!row) throw new Error('tenant_create_failed');
  return row;
}

export async function listTenants(): Promise<TenantRow[]> {
  const db = await getSaaSDatabase();
  const rows = stmtAll(db, 'SELECT id, slug, name, created_at FROM tenants ORDER BY created_at DESC');
  return rows.map((r) => ({
    id: String(r.id),
    slug: String(r.slug),
    name: String(r.name),
    created_at: String(r.created_at),
  }));
}

/** Returns credential map (keys are env-style names, e.g. TELEGRAM_BOT_TOKEN). */
export async function getTenantCredentials(tenantId: string): Promise<Map<string, string>> {
  const db = await getSaaSDatabase();
  const rows = stmtAll(db, 'SELECT key, value FROM tenant_credentials WHERE tenant_id = ?', [
    tenantId,
  ]);
  const m = new Map<string, string>();
  for (const r of rows) {
    m.set(String(r.key), String(r.value));
  }
  return m;
}

export async function mergeTenantCredentials(
  tenantId: string,
  credentials: Record<string, string>,
): Promise<void> {
  const db = await getSaaSDatabase();
  for (const [key, value] of Object.entries(credentials)) {
    if (!key || typeof value !== 'string') continue;
    db.run(
      `INSERT OR REPLACE INTO tenant_credentials (tenant_id, key, value, updated_at)
       VALUES (?, ?, ?, datetime('now'))`,
      [tenantId, key.trim(), value],
    );
  }
  persistSaaSDatabase();
}

export async function loadTenantFaqEntries(tenantId: string): Promise<UnifiedFaqSeedEntry[]> {
  const db = await getSaaSDatabase();
  const rows = stmtAll(
    db,
    `SELECT id, language, topic, question, answer, keywords_json, tags_json, is_active
     FROM tenant_faq_entries WHERE tenant_id = ? AND is_active = 1`,
    [tenantId],
  );
  const out: UnifiedFaqSeedEntry[] = [];
  for (const r of rows) {
    let keywords: string[] = [];
    try {
      const parsed = JSON.parse(String(r.keywords_json ?? '[]'));
      if (Array.isArray(parsed)) keywords = parsed.map(String);
    } catch {
      keywords = [];
    }
    out.push({
      id: String(r.id),
      topic: String(r.topic),
      question: String(r.question),
      answer: String(r.answer),
      language: String(r.language),
      keywords,
    });
  }
  return out;
}

export async function replaceTenantFaqEntries(
  tenantId: string,
  entries: Array<{
    id: string;
    language: string;
    topic: string;
    question: string;
    answer: string;
    keywords?: string[];
    tags?: string[];
    is_active?: boolean;
  }>,
): Promise<void> {
  const db = await getSaaSDatabase();
  db.run('DELETE FROM tenant_faq_entries WHERE tenant_id = ?', [tenantId]);
  for (const e of entries) {
    db.run(
      `INSERT INTO tenant_faq_entries (id, tenant_id, language, topic, question, answer, keywords_json, tags_json, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        e.id,
        tenantId,
        e.language,
        e.topic,
        e.question,
        e.answer,
        JSON.stringify(e.keywords ?? []),
        JSON.stringify(e.tags ?? []),
        e.is_active === false ? 0 : 1,
      ],
    );
  }
  persistSaaSDatabase();
}

export async function getTenantSettingsJson(tenantId: string): Promise<Record<string, unknown>> {
  const db = await getSaaSDatabase();
  const row = stmtGet(db, 'SELECT settings_json FROM tenant_settings WHERE tenant_id = ?', [
    tenantId,
  ]);
  if (!row) return {};
  try {
    const parsed = JSON.parse(String(row.settings_json ?? '{}'));
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/** Phase 24 / 1G+1H — DB-backed tenant admin / readonly bridge principals. */
export type TenantPrincipalRole = 'tenant_admin' | 'tenant_operator_readonly';

/** 1H — API / list shape: never includes raw bearer material. */
export type TenantPrincipalTokenState = 'hash_at_rest' | 'legacy_plaintext_at_rest';

export interface TenantPrincipalListRow {
  id: string;
  tenant_id: string;
  role: TenantPrincipalRole;
  is_enabled: boolean;
  display_name: string | null;
  created_at: string;
  updated_at: string;
  has_token: boolean;
  token_state: TenantPrincipalTokenState;
}

function principalRowFromDb(r: Record<string, unknown>): TenantPrincipalListRow {
  const hashRaw = r.bridge_token_hash;
  const hashStr =
    hashRaw == null || String(hashRaw).trim() === '' ? '' : String(hashRaw).trim().toLowerCase();
  const token_state: TenantPrincipalTokenState =
    hashStr.length > 0 ? 'hash_at_rest' : 'legacy_plaintext_at_rest';
  return {
    id: String(r.id),
    tenant_id: String(r.tenant_id),
    role: String(r.role) as TenantPrincipalRole,
    is_enabled: Number(r.is_enabled) !== 0,
    display_name: r.display_name == null ? null : String(r.display_name),
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
    has_token: true,
    token_state,
  };
}

export async function findEnabledPrincipalByBridgeToken(
  token: string,
): Promise<{ tenant_id: string; tenant_slug: string; role: TenantPrincipalRole } | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;
  const h = hashBridgeToken(trimmed);
  if (!h) return null;
  const db = await getSaaSDatabase();

  let row = stmtGet(
    db,
    `SELECT p.tenant_id, p.role, t.slug AS tenant_slug
     FROM tenant_admin_principals p
     INNER JOIN tenants t ON t.id = p.tenant_id
     WHERE p.bridge_token_hash = ? AND p.is_enabled = 1`,
    [h],
  );
  if (row) {
    const role = String(row.role);
    if (role !== 'tenant_admin' && role !== 'tenant_operator_readonly') return null;
    return {
      tenant_id: String(row.tenant_id),
      tenant_slug: String(row.tenant_slug).trim().toLowerCase(),
      role,
    };
  }

  row = stmtGet(
    db,
    `SELECT p.id, p.tenant_id, p.role, t.slug AS tenant_slug
     FROM tenant_admin_principals p
     INNER JOIN tenants t ON t.id = p.tenant_id
     WHERE (p.bridge_token_hash IS NULL OR p.bridge_token_hash = '')
       AND p.bridge_token = ? AND p.is_enabled = 1`,
    [trimmed],
  );
  if (!row) return null;
  const role = String(row.role);
  if (role !== 'tenant_admin' && role !== 'tenant_operator_readonly') return null;
  const id = String(row.id);
  db.run(
    `UPDATE tenant_admin_principals
     SET bridge_token_hash = ?, bridge_token = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [h, id, id],
  );
  persistSaaSDatabase();
  return {
    tenant_id: String(row.tenant_id),
    tenant_slug: String(row.tenant_slug).trim().toLowerCase(),
    role,
  };
}

export async function listTenantAdminPrincipals(tenantId: string): Promise<TenantPrincipalListRow[]> {
  const db = await getSaaSDatabase();
  const rows = stmtAll(
    db,
    `SELECT id, tenant_id, role, bridge_token, bridge_token_hash, is_enabled, display_name, created_at, updated_at
     FROM tenant_admin_principals WHERE tenant_id = ? ORDER BY created_at ASC`,
    [tenantId],
  );
  return rows.map((r) => principalRowFromDb(r));
}

export async function replaceTenantAdminPrincipals(
  tenantId: string,
  items: Array<{
    role: TenantPrincipalRole;
    bridge_token: string;
    is_enabled: boolean;
    display_name?: string;
  }>,
): Promise<void> {
  const db = await getSaaSDatabase();
  db.run('DELETE FROM tenant_admin_principals WHERE tenant_id = ?', [tenantId]);
  for (const it of items) {
    const id = randomUUID();
    const secret = it.bridge_token.trim();
    const h = hashBridgeToken(secret);
    if (!h) continue;
    db.run(
      `INSERT INTO tenant_admin_principals (id, tenant_id, role, bridge_token, bridge_token_hash, is_enabled, display_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [id, tenantId, it.role, id, h, it.is_enabled ? 1 : 0, it.display_name?.trim() || null],
    );
  }
  persistSaaSDatabase();
}

export async function mergeTenantSettings(
  tenantId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const current = await getTenantSettingsJson(tenantId);
  const next = { ...current, ...patch };
  const db = await getSaaSDatabase();
  db.run(
    `INSERT OR REPLACE INTO tenant_settings (tenant_id, settings_json, updated_at)
     VALUES (?, ?, datetime('now'))`,
    [tenantId, JSON.stringify(next)],
  );
  persistSaaSDatabase();
}
