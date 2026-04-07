import { randomUUID } from 'node:crypto';
import type { SqlJsDatabase } from './db';
import { getSaaSDatabase, persistSaaSDatabase } from './db';
import { getSaasDbAdapter } from './db-adapter';
import { hashBridgeToken } from './bridge-token';
import {
  insertPrincipalAuditLog,
  type PrincipalAuditLogRow,
  type PrincipalReplaceActorFields,
} from './principal-audit';
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
  const adapter = await getSaasDbAdapter();

  let row = await adapter.queryOne(
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

  row = await adapter.queryOne(
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
  await adapter.execute(
    `UPDATE tenant_admin_principals
     SET bridge_token_hash = ?, bridge_token = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [h, id, id],
  );
  await adapter.persistIfNeeded();
  return {
    tenant_id: String(row.tenant_id),
    tenant_slug: String(row.tenant_slug).trim().toLowerCase(),
    role,
  };
}

interface OldPrincipalSnap {
  id: string;
  role: TenantPrincipalRole;
  hashNorm: string;
  legacyPlain: string | null;
  display_name: string | null;
  is_enabled: boolean;
  token_state: TenantPrincipalTokenState;
  created_at: string;
}

function normPrincipalDisplay(s: string | null | undefined): string {
  if (s == null) return '';
  return String(s).trim();
}

function oldPrincipalSnapFromRow(r: Record<string, unknown>): OldPrincipalSnap {
  const hashRaw = r.bridge_token_hash;
  const hashNorm =
    hashRaw == null || String(hashRaw).trim() === '' ? '' : String(hashRaw).trim().toLowerCase();
  const token_state: TenantPrincipalTokenState =
    hashNorm.length > 0 ? 'hash_at_rest' : 'legacy_plaintext_at_rest';
  const legacyPlain = hashNorm === '' ? String(r.bridge_token) : null;
  return {
    id: String(r.id),
    role: String(r.role) as TenantPrincipalRole,
    hashNorm,
    legacyPlain,
    display_name: r.display_name == null ? null : String(r.display_name),
    is_enabled: Number(r.is_enabled) !== 0,
    token_state,
    created_at: String(r.created_at),
  };
}

function oldMatchesNewToken(o: OldPrincipalSnap, secret: string): boolean {
  const s = secret.trim();
  const h = hashBridgeToken(s);
  if (o.hashNorm && o.hashNorm === h) return true;
  if (!o.hashNorm && o.legacyPlain !== null && o.legacyPlain === s) return true;
  return false;
}

export async function listTenantAdminPrincipals(tenantId: string): Promise<TenantPrincipalListRow[]> {
  const adapter = await getSaasDbAdapter();
  const rows = await adapter.queryAll(
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
  actor: PrincipalReplaceActorFields,
): Promise<void> {
  const adapter = await getSaasDbAdapter();
  const tsIso = new Date().toISOString();

  const rawOld = await adapter.queryAll(
    `SELECT id, role, bridge_token, bridge_token_hash, is_enabled, display_name, created_at
     FROM tenant_admin_principals WHERE tenant_id = ? ORDER BY created_at ASC`,
    [tenantId],
  );
  const olds = rawOld.map((r) => oldPrincipalSnapFromRow(r));
  const matchedOld = new Set<string>();

  for (const newItem of items) {
    const secret = newItem.bridge_token.trim();
    const h = hashBridgeToken(secret);
    if (!h) continue;

    const newDisplayNorm = normPrincipalDisplay(newItem.display_name);
    const newDisplayNull = newDisplayNorm === '' ? null : newDisplayNorm;
    const newTokenState: TenantPrincipalTokenState = 'hash_at_rest';

    const oldMatch = olds.find((o) => !matchedOld.has(o.id) && oldMatchesNewToken(o, secret));

    if (oldMatch) {
      matchedOld.add(oldMatch.id);
      if (oldMatch.is_enabled !== newItem.is_enabled) {
        await insertPrincipalAuditLog(adapter, {
          tenant_id: tenantId,
          principal_role: newItem.role,
          action: newItem.is_enabled ? 'enabled' : 'disabled',
          actor,
          target_display_name: newDisplayNull,
          target_is_enabled: newItem.is_enabled,
          token_state: newTokenState,
          ts_iso: tsIso,
        });
      }
      if (normPrincipalDisplay(oldMatch.display_name) !== newDisplayNorm) {
        await insertPrincipalAuditLog(adapter, {
          tenant_id: tenantId,
          principal_role: newItem.role,
          action: 'updated',
          actor,
          target_display_name: newDisplayNull,
          target_is_enabled: newItem.is_enabled,
          token_state: newTokenState,
          ts_iso: tsIso,
        });
      }
    } else {
      const sameRole = olds.filter((o) => !matchedOld.has(o.id) && o.role === newItem.role);
      sameRole.sort((a, b) => a.created_at.localeCompare(b.created_at));
      const pair = sameRole[0];
      if (pair) {
        matchedOld.add(pair.id);
        await insertPrincipalAuditLog(adapter, {
          tenant_id: tenantId,
          principal_role: newItem.role,
          action: 'rotated',
          actor,
          target_display_name: newDisplayNull,
          target_is_enabled: newItem.is_enabled,
          token_state: newTokenState,
          ts_iso: tsIso,
        });
      } else {
        await insertPrincipalAuditLog(adapter, {
          tenant_id: tenantId,
          principal_role: newItem.role,
          action: 'created',
          actor,
          target_display_name: newDisplayNull,
          target_is_enabled: newItem.is_enabled,
          token_state: newTokenState,
          ts_iso: tsIso,
        });
      }
    }
  }

  for (const o of olds) {
    if (!matchedOld.has(o.id)) {
      await insertPrincipalAuditLog(adapter, {
        tenant_id: tenantId,
        principal_role: o.role,
        action: 'deleted',
        actor,
        target_display_name: o.display_name,
        target_is_enabled: o.is_enabled,
        token_state: o.token_state,
        ts_iso: tsIso,
      });
    }
  }

  await adapter.execute('DELETE FROM tenant_admin_principals WHERE tenant_id = ?', [tenantId]);
  for (const it of items) {
    const id = randomUUID();
    const secret = it.bridge_token.trim();
    const h = hashBridgeToken(secret);
    if (!h) continue;
    await adapter.execute(
      `INSERT INTO tenant_admin_principals (id, tenant_id, role, bridge_token, bridge_token_hash, is_enabled, display_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [id, tenantId, it.role, id, h, it.is_enabled ? 1 : 0, it.display_name?.trim() || null],
    );
  }
  await adapter.persistIfNeeded();
}

export async function countAllTenantAdminPrincipals(): Promise<number> {
  const adapter = await getSaasDbAdapter();
  const row = await adapter.queryOne('SELECT COUNT(*) AS c FROM tenant_admin_principals', []);
  return row ? Number(row.c) : 0;
}

export async function listTenantPrincipalAuditLogs(
  tenantId: string,
  limit: number,
): Promise<PrincipalAuditLogRow[]> {
  const adapter = await getSaasDbAdapter();
  const cap = Math.min(Math.max(1, limit), 200);
  const rows = await adapter.queryAll(
    `SELECT id, tenant_id, principal_role, action, actor_auth_source, actor_role, actor_scope_type,
            actor_tenant_slug, target_display_name, target_is_enabled, token_state, ts_iso
     FROM tenant_admin_principal_audit_logs
     WHERE tenant_id = ?
     ORDER BY ts_iso DESC
     LIMIT ?`,
    [tenantId, cap],
  );
  return rows.map((r) => ({
    id: String(r.id),
    tenant_id: String(r.tenant_id),
    principal_role: String(r.principal_role),
    action: String(r.action) as PrincipalAuditLogRow['action'],
    actor_auth_source: String(r.actor_auth_source),
    actor_role: String(r.actor_role),
    actor_scope_type: String(r.actor_scope_type),
    actor_tenant_slug: r.actor_tenant_slug == null ? null : String(r.actor_tenant_slug),
    target_display_name: r.target_display_name == null ? null : String(r.target_display_name),
    target_is_enabled: Number(r.target_is_enabled) !== 0,
    token_state: String(r.token_state) as PrincipalAuditLogRow['token_state'],
    ts_iso: String(r.ts_iso),
  }));
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
