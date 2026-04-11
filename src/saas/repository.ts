import { randomUUID } from 'node:crypto';
import type { SqlJsDatabase } from './db';
import { getSaaSDatabase, persistSaaSDatabase } from './db';
import { getSaasDbAdapter, getSaaSDbDriver } from './db-adapter';
import type { SaaSDbAdapter } from './db-adapter/types';
import { getTenantSecretCrypto } from './secret-crypto';
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
  status: 'active' | 'suspended';
  suspended_at?: string | null;
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

/**
 * Admin-facing tenant lookup entrypoint.
 * Webhook path should use getTenantBySlugForWebhook() to keep boundary explicit.
 */
export async function getTenantBySlug(slug: string): Promise<TenantRow | null> {
  const adapter = await getSaasDbAdapter();
  const row = await adapter.queryOne(
    'SELECT id, slug, name, status, suspended_at, created_at FROM tenants WHERE slug = ?',
    [slug],
  );
  if (!row) return null;
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    status: String(row.status ?? 'active') as TenantRow['status'],
    suspended_at: row.suspended_at == null ? null : String(row.suspended_at),
    created_at: String(row.created_at),
  };
}

export async function getTenantById(id: string): Promise<TenantRow | null> {
  const adapter = await getSaasDbAdapter();
  const row = await adapter.queryOne(
    'SELECT id, slug, name, status, suspended_at, created_at FROM tenants WHERE id = ?',
    [id],
  );
  if (!row) return null;
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    status: String(row.status ?? 'active') as TenantRow['status'],
    suspended_at: row.suspended_at == null ? null : String(row.suspended_at),
    created_at: String(row.created_at),
  };
}

/** Webhook-only tenant slug lookup entrypoint (decoupled from admin path). */
export async function getTenantBySlugForWebhook(slug: string): Promise<TenantRow | null> {
  const adapter = await getSaasDbAdapter();
  const row = await adapter.queryOne(
    'SELECT id, slug, name, status, suspended_at, created_at FROM tenants WHERE slug = ?',
    [slug],
  );
  if (!row) return null;
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    status: String(row.status ?? 'active') as TenantRow['status'],
    suspended_at: row.suspended_at == null ? null : String(row.suspended_at),
    created_at: String(row.created_at),
  };
}

export async function createTenant(slug: string, name: string): Promise<TenantRow> {
  const adapter = await getSaasDbAdapter();
  const id = randomUUID();
  const now = nowIso();
  await adapter.execute('INSERT INTO tenants (id, slug, name) VALUES (?, ?, ?)', [id, slug, name]);
  // Postgres compatibility: avoid sqlite-specific "INSERT OR REPLACE".
  await adapter.execute('INSERT INTO tenant_settings (tenant_id, settings_json, updated_at) VALUES (?, ?, ?)', [
    id,
    '{}',
    now,
  ]);
  await adapter.persistIfNeeded();
  const row = await getTenantBySlug(slug);
  if (!row) throw new Error('tenant_create_failed');
  return row;
}

export async function listTenants(): Promise<TenantRow[]> {
  const adapter = await getSaasDbAdapter();
  const rows = await adapter.queryAll(
    'SELECT id, slug, name, status, suspended_at, created_at FROM tenants ORDER BY created_at DESC',
    [],
  );
  return rows.map((r) => ({
    id: String(r.id),
    slug: String(r.slug),
    name: String(r.name),
    status: String(r.status ?? 'active') as TenantRow['status'],
    suspended_at: r.suspended_at == null ? null : String(r.suspended_at),
    created_at: String(r.created_at),
  }));
}

export async function setTenantLifecycleStatus(
  tenantId: string,
  status: 'active' | 'suspended',
): Promise<void> {
  const adapter = await getSaasDbAdapter();
  await adapter.execute(
    `UPDATE tenants
     SET status = ?, suspended_at = CASE WHEN ? = 'suspended' THEN datetime('now') ELSE NULL END
     WHERE id = ?`,
    [status, status, tenantId],
  );
  await adapter.persistIfNeeded();
}

export async function getTenantLastActiveIso(tenantId: string): Promise<string | null> {
  const adapter = await getSaasDbAdapter();
  const s = await adapter.queryOne('SELECT updated_at FROM tenant_settings WHERE tenant_id = ?', [tenantId]);
  const c = await adapter.queryOne(
    'SELECT MAX(updated_at) AS m FROM tenant_credentials WHERE tenant_id = ?',
    [tenantId],
  );
  const ts = s?.updated_at != null ? String(s.updated_at) : null;
  const tc = c?.m != null && String(c.m).trim() !== '' ? String(c.m) : null;
  if (!ts && !tc) return null;
  if (!ts) return tc;
  if (!tc) return ts;
  return ts > tc ? ts : tc;
}

/** Last config save time for control-plane forms: max(tenant_settings.updated_at, tenant_credentials.updated_at). */
export async function getTenantLastConfigSavedAtIso(tenantId: string): Promise<string | null> {
  return getTenantLastActiveIso(tenantId);
}

export async function countActiveFaqEntries(tenantId: string): Promise<number> {
  const adapter = await getSaasDbAdapter();
  const row = await adapter.queryOne(
    'SELECT COUNT(*) AS c FROM tenant_faq_entries WHERE tenant_id = ? AND is_active = 1',
    [tenantId],
  );
  return row ? Number(row.c) : 0;
}

/**
 * Compatibility shim: keep for legacy callers.
 * New call sites should use getTenantCredentialsForWebhook/getTenantCredentialsForOutbound explicitly.
 * @deprecated Prefer explicit entrypoints by chain (webhook or outbound).
 */
export async function getTenantCredentials(tenantId: string): Promise<Map<string, string>> {
  return getTenantCredentialsForOutbound(tenantId);
}

async function upsertTenantCredentialValueWithAdapter(
  adapter: SaaSDbAdapter,
  tenantId: string,
  key: string,
  sealedValue: string,
): Promise<void> {
  if (getSaaSDbDriver() === 'postgres') {
    await adapter.execute(
      `INSERT INTO tenant_credentials (tenant_id, key, value, updated_at)
       VALUES (?, ?, ?, NOW())
       ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [tenantId, key, sealedValue],
    );
  } else {
    await adapter.execute(
      `INSERT OR REPLACE INTO tenant_credentials (tenant_id, key, value, updated_at)
       VALUES (?, ?, ?, datetime('now'))`,
      [tenantId, key, sealedValue],
    );
  }
}

/** Sealed blob upsert for D-C2B1 rotation (caller supplies `cf1:` or legacy stored form). */
export async function upsertTenantCredentialSealedWithAdapter(
  adapter: SaaSDbAdapter,
  tenantId: string,
  key: string,
  sealedValue: string,
): Promise<void> {
  await upsertTenantCredentialValueWithAdapter(adapter, tenantId, key, sealedValue);
}

async function loadTenantCredentialsMapDecrypted(tenantId: string): Promise<Map<string, string>> {
  const adapter = await getSaasDbAdapter();
  const crypto = getTenantSecretCrypto();
  const rows = await adapter.queryAll('SELECT key, value FROM tenant_credentials WHERE tenant_id = ?', [
    tenantId,
  ]);
  const m = new Map<string, string>();
  for (const r of rows) {
    const k = String(r.key);
    const stored = String(r.value);
    m.set(k, crypto.openSealed(stored));
  }
  return m;
}

/** Webhook verify/signature credential lookup entrypoint. */
export async function getTenantCredentialsForWebhook(tenantId: string): Promise<Map<string, string>> {
  return loadTenantCredentialsMapDecrypted(tenantId);
}

/** Outbound channel send-config credential lookup entrypoint. */
export async function getTenantCredentialsForOutbound(tenantId: string): Promise<Map<string, string>> {
  return loadTenantCredentialsMapDecrypted(tenantId);
}

export async function mergeTenantCredentials(
  tenantId: string,
  credentials: Record<string, string>,
): Promise<void> {
  const crypto = getTenantSecretCrypto();
  const adapter = await getSaasDbAdapter();
  for (const [key, value] of Object.entries(credentials)) {
    if (!key || typeof value !== 'string') continue;
    const sealed = crypto.sealPlaintext(value);
    await upsertTenantCredentialValueWithAdapter(adapter, tenantId, key.trim(), sealed);
  }
  await adapter.persistIfNeeded();
}

export async function deleteTenantCredentialKeys(tenantId: string, keys: string[]): Promise<void> {
  const uniq = [...new Set(keys.map((k) => String(k).trim()).filter(Boolean))];
  if (uniq.length === 0) return;
  const adapter = await getSaasDbAdapter();
  for (const k of uniq) {
    await adapter.execute('DELETE FROM tenant_credentials WHERE tenant_id = ? AND key = ?', [tenantId, k]);
  }
  await adapter.persistIfNeeded();
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
  const adapter = await getSaasDbAdapter();
  await adapter.execute('DELETE FROM tenant_faq_entries WHERE tenant_id = ?', [tenantId]);
  const now = nowIso();
  for (const e of entries) {
    await adapter.execute(
      `INSERT INTO tenant_faq_entries (id, tenant_id, language, topic, question, answer, source_type, keywords_json, tags_json, is_active, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        e.id,
        tenantId,
        e.language,
        e.topic,
        e.question,
        e.answer,
        'manual',
        JSON.stringify(e.keywords ?? []),
        JSON.stringify(e.tags ?? []),
        e.is_active === false ? 0 : 1,
        now,
      ],
    );
  }
  await adapter.persistIfNeeded();
}

export interface TenantKnowledgeRow {
  id: string;
  language: string;
  category: string;
  question: string;
  answer: string;
  source_type: string;
  is_active: boolean;
  updated_at: string;
  translation_status: 'source' | 'draft' | 'published';
  source_faq_id: string | null;
  reviewed_at: string | null;
}

function mapKnowledgeRow(r: Record<string, unknown>): TenantKnowledgeRow {
  const status = String(r.translation_status ?? 'source');
  return {
    id: String(r.id),
    language: String(r.language),
    category: String(r.topic),
    question: String(r.question),
    answer: String(r.answer),
    source_type: String(r.source_type ?? 'manual'),
    is_active: Number(r.is_active) !== 0,
    updated_at: String(r.updated_at ?? ''),
    translation_status: (status === 'draft' || status === 'published') ? status : 'source',
    source_faq_id: r.source_faq_id != null ? String(r.source_faq_id) : null,
    reviewed_at: r.reviewed_at != null ? String(r.reviewed_at) : null,
  };
}

export async function listTenantKnowledgeEntries(tenantId: string): Promise<TenantKnowledgeRow[]> {
  const adapter = await getSaasDbAdapter();
  const rows = await adapter.queryAll(
    `SELECT id, language, topic, question, answer, source_type, is_active, updated_at,
            translation_status, source_faq_id, reviewed_at
     FROM tenant_faq_entries
     WHERE tenant_id = ? AND (source_faq_id IS NULL)
     ORDER BY updated_at DESC`,
    [tenantId],
  );
  return rows.map((r) => mapKnowledgeRow(r as Record<string, unknown>));
}

/** List only published translations for a given source FAQ entry. */
export async function listFaqTranslations(tenantId: string, sourceFaqId: string): Promise<TenantKnowledgeRow[]> {
  const adapter = await getSaasDbAdapter();
  const rows = await adapter.queryAll(
    `SELECT id, language, topic, question, answer, source_type, is_active, updated_at,
            translation_status, source_faq_id, reviewed_at
     FROM tenant_faq_entries
     WHERE tenant_id = ? AND source_faq_id = ?
     ORDER BY language`,
    [tenantId, sourceFaqId],
  );
  return rows.map((r) => mapKnowledgeRow(r as Record<string, unknown>));
}

/** Upsert a draft or published translation row. */
export async function upsertFaqTranslation(
  tenantId: string,
  sourceFaqId: string,
  language: string,
  question: string,
  answer: string,
  status: 'draft' | 'published',
): Promise<TenantKnowledgeRow> {
  const adapter = await getSaasDbAdapter();
  const now = nowIso();

  // Find existing translation for this lang
  const existing = await adapter.queryOne(
    `SELECT id FROM tenant_faq_entries WHERE tenant_id = ? AND source_faq_id = ? AND language = ?`,
    [tenantId, sourceFaqId, language],
  );

  // Fetch source row for topic
  const sourceRow = await adapter.queryOne(
    `SELECT topic FROM tenant_faq_entries WHERE tenant_id = ? AND id = ?`,
    [tenantId, sourceFaqId],
  );
  const topic = sourceRow ? String(sourceRow.topic) : language;

  const reviewed_at = status === 'published' ? now : null;

  if (existing) {
    const id = String(existing.id);
    await adapter.execute(
      `UPDATE tenant_faq_entries
       SET question = ?, answer = ?, translation_status = ?, reviewed_at = ?, updated_at = ?
       WHERE tenant_id = ? AND id = ?`,
      [question, answer, status, reviewed_at, now, tenantId, id],
    );
    await adapter.persistIfNeeded();
    return {
      id, language, category: topic, question, answer,
      source_type: 'translation', is_active: true,
      updated_at: now, translation_status: status,
      source_faq_id: sourceFaqId, reviewed_at,
    };
  } else {
    const id = randomUUID();
    await adapter.execute(
      `INSERT INTO tenant_faq_entries
       (id, tenant_id, language, topic, question, answer, source_type, keywords_json, tags_json,
        is_active, updated_at, translation_status, source_faq_id, reviewed_at)
       VALUES (?, ?, ?, ?, ?, ?, 'translation', '[]', '[]', 1, ?, ?, ?, ?)`,
      [id, tenantId, language, topic, question, answer, now, status, sourceFaqId, reviewed_at],
    );
    await adapter.persistIfNeeded();
    return {
      id, language, category: topic, question, answer,
      source_type: 'translation', is_active: true,
      updated_at: now, translation_status: status,
      source_faq_id: sourceFaqId, reviewed_at,
    };
  }
}

export async function upsertTenantKnowledgeEntries(
  tenantId: string,
  entries: Array<{
    id?: string;
    language: string;
    category: string;
    question: string;
    answer: string;
    source_type?: string;
    is_active?: boolean;
  }>,
): Promise<{ inserted: number; updated: number }> {
  const adapter = await getSaasDbAdapter();
  let inserted = 0;
  let updated = 0;
  const now = nowIso();
  for (const e of entries) {
    const q = e.question.trim();
    if (!q) continue;
    let id = e.id?.trim() || '';
    let exists = false;
    if (id) {
      const row = await adapter.queryOne(`SELECT id FROM tenant_faq_entries WHERE tenant_id = ? AND id = ?`, [
        tenantId,
        id,
      ]);
      exists = Boolean(row);
    } else {
      const row = await adapter.queryOne(
        `SELECT id FROM tenant_faq_entries WHERE tenant_id = ? AND question = ?`,
        [tenantId, q],
      );
      if (row) {
        exists = true;
        id = String(row.id);
      } else {
        id = randomUUID();
      }
    }
    if (exists) {
      await adapter.execute(
        `UPDATE tenant_faq_entries
         SET language = ?, topic = ?, question = ?, answer = ?, source_type = ?, is_active = ?, updated_at = ?
         WHERE tenant_id = ? AND id = ?`,
        [
          e.language,
          e.category,
          q,
          e.answer,
          e.source_type?.trim() || 'manual',
          e.is_active === false ? 0 : 1,
          now,
          tenantId,
          id,
        ],
      );
      updated += 1;
    } else {
      await adapter.execute(
        `INSERT INTO tenant_faq_entries
         (id, tenant_id, language, topic, question, answer, source_type, keywords_json, tags_json, is_active, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, '[]', '[]', ?, ?)`,
        [
          id,
          tenantId,
          e.language,
          e.category,
          q,
          e.answer,
          e.source_type?.trim() || 'manual',
          e.is_active === false ? 0 : 1,
          now,
        ],
      );
      inserted += 1;
    }
  }
  await adapter.persistIfNeeded();
  return { inserted, updated };
}

export async function setTenantKnowledgeActiveState(
  tenantId: string,
  entryId: string,
  isActive: boolean,
): Promise<void> {
  const adapter = await getSaasDbAdapter();
  await adapter.execute(
    `UPDATE tenant_faq_entries
     SET is_active = ?, updated_at = ?
     WHERE tenant_id = ? AND id = ?`,
    [isActive ? 1 : 0, nowIso(), tenantId, entryId],
  );
  await adapter.persistIfNeeded();
}

export interface TenantProductRow {
  id: string;
  tenant_id: string;
  name: string;
  created_at: string;
}

export async function listTenantProducts(tenantId: string): Promise<TenantProductRow[]> {
  const adapter = await getSaasDbAdapter();
  const rows = await adapter.queryAll(
    'SELECT id, tenant_id, name, created_at FROM tenant_products WHERE tenant_id = ? ORDER BY created_at DESC',
    [tenantId],
  );
  return rows.map((r) => ({
    id: String(r.id),
    tenant_id: String(r.tenant_id),
    name: String(r.name),
    created_at: String(r.created_at),
  }));
}

export async function createTenantProduct(tenantId: string, name: string): Promise<TenantProductRow> {
  const adapter = await getSaasDbAdapter();
  const id = randomUUID();
  const now = nowIso();
  await adapter.execute(
    'INSERT INTO tenant_products (id, tenant_id, name, created_at) VALUES (?, ?, ?, ?)',
    [id, tenantId, name.trim(), now],
  );
  await adapter.persistIfNeeded();
  return { id, tenant_id: tenantId, name: name.trim(), created_at: now };
}

export async function deleteTenantProduct(tenantId: string, productId: string): Promise<void> {
  const adapter = await getSaasDbAdapter();
  await adapter.execute(
    'DELETE FROM tenant_products WHERE tenant_id = ? AND id = ?',
    [tenantId, productId],
  );
  await adapter.persistIfNeeded();
}

export async function getTenantSettingsJson(tenantId: string): Promise<Record<string, unknown>> {
  const adapter = await getSaasDbAdapter();
  const row = await adapter.queryOne('SELECT settings_json FROM tenant_settings WHERE tenant_id = ?', [
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
  const ts = nowIso();
  await adapter.execute(
    `UPDATE tenant_admin_principals
     SET bridge_token_hash = ?, bridge_token = ?, updated_at = ?
     WHERE id = ?`,
    [h, id, ts, id],
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
    const ts = nowIso();
    await adapter.execute(
      `INSERT INTO tenant_admin_principals (id, tenant_id, role, bridge_token, bridge_token_hash, is_enabled, display_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, tenantId, it.role, id, h, it.is_enabled ? 1 : 0, it.display_name?.trim() || null, ts, ts],
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

export async function listRecentPrincipalAuditLogsGlobal(limit: number): Promise<PrincipalAuditLogRow[]> {
  const adapter = await getSaasDbAdapter();
  const cap = Math.min(Math.max(1, limit), 100);
  const rows = await adapter.queryAll(
    `SELECT id, tenant_id, principal_role, action, actor_auth_source, actor_role, actor_scope_type,
            actor_tenant_slug, target_display_name, target_is_enabled, token_state, ts_iso
     FROM tenant_admin_principal_audit_logs
     ORDER BY ts_iso DESC
     LIMIT ?`,
    [cap],
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
  const adapter = await getSaasDbAdapter();
  const now = nowIso();
  if (getSaaSDbDriver() === 'postgres') {
    await adapter.execute(
      `INSERT INTO tenant_settings (tenant_id, settings_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT (tenant_id) DO UPDATE SET settings_json = EXCLUDED.settings_json, updated_at = EXCLUDED.updated_at`,
      [tenantId, JSON.stringify(next), now],
    );
  } else {
    await adapter.execute(
      `INSERT OR REPLACE INTO tenant_settings (tenant_id, settings_json, updated_at)
       VALUES (?, ?, ?)`,
      [tenantId, JSON.stringify(next), now],
    );
  }
  await adapter.persistIfNeeded();
}

export type TenantTestResultStatus = 'passed' | 'failed' | 'warning' | 'skipped';
export type TenantTestScopeType = 'channel' | 'ai' | 'website' | 'go_live' | 'knowledge';

export interface TenantTestResultRow {
  id: string;
  tenant_id: string;
  scope_type: TenantTestScopeType;
  scope_key: string;
  status: TenantTestResultStatus;
  message: string;
  error_code: string | null;
  tested_at: string;
  tested_by: string;
  metadata_json: string | null;
}

export async function insertTenantTestResult(args: {
  tenant_id: string;
  scope_type: TenantTestScopeType;
  scope_key: string;
  status: TenantTestResultStatus;
  message: string;
  error_code?: string | null;
  tested_by: string;
  metadata_json?: string | null;
}): Promise<TenantTestResultRow> {
  const id = randomUUID();
  const tested_at = new Date().toISOString();
  const adapter = await getSaasDbAdapter();
  await adapter.execute(
    `INSERT INTO tenant_test_results
     (id, tenant_id, scope_type, scope_key, status, message, error_code, tested_at, tested_by, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      args.tenant_id,
      args.scope_type,
      args.scope_key,
      args.status,
      args.message,
      args.error_code ?? null,
      tested_at,
      args.tested_by,
      args.metadata_json ?? null,
    ],
  );
  await adapter.persistIfNeeded();
  return {
    id,
    tenant_id: args.tenant_id,
    scope_type: args.scope_type,
    scope_key: args.scope_key,
    status: args.status,
    message: args.message,
    error_code: args.error_code ?? null,
    tested_at,
    tested_by: args.tested_by,
    metadata_json: args.metadata_json ?? null,
  };
}

export async function getLatestTenantTestResult(
  tenantId: string,
  scopeType: TenantTestScopeType,
  scopeKey: string,
): Promise<TenantTestResultRow | null> {
  const adapter = await getSaasDbAdapter();
  const row = await adapter.queryOne(
    `SELECT id, tenant_id, scope_type, scope_key, status, message, error_code, tested_at, tested_by, metadata_json
     FROM tenant_test_results
     WHERE tenant_id = ? AND scope_type = ? AND scope_key = ?
     ORDER BY tested_at DESC LIMIT 1`,
    [tenantId, scopeType, scopeKey],
  );
  if (!row) return null;
  return {
    id: String(row.id),
    tenant_id: String(row.tenant_id),
    scope_type: String(row.scope_type) as TenantTestScopeType,
    scope_key: String(row.scope_key),
    status: String(row.status) as TenantTestResultStatus,
    message: String(row.message),
    error_code: row.error_code == null ? null : String(row.error_code),
    tested_at: String(row.tested_at),
    tested_by: String(row.tested_by),
    metadata_json: row.metadata_json == null ? null : String(row.metadata_json),
  };
}

export interface TenantRuntimeHealthRow {
  tenant_id: string;
  ai_enabled: boolean;
  live_status: 'inactive' | 'degraded' | 'live' | 'paused';
  last_inbound_at: string | null;
  last_webhook_success_at: string | null;
  last_error_message: string | null;
  last_error_at: string | null;
  updated_at: string;
}

export async function getTenantRuntimeHealth(tenantId: string): Promise<TenantRuntimeHealthRow | null> {
  const adapter = await getSaasDbAdapter();
  const row = await adapter.queryOne(
    `SELECT tenant_id, ai_enabled, live_status, last_inbound_at, last_webhook_success_at,
            last_error_message, last_error_at, updated_at
     FROM tenant_runtime_health WHERE tenant_id = ?`,
    [tenantId],
  );
  if (!row) return null;
  return {
    tenant_id: String(row.tenant_id),
    ai_enabled: Number(row.ai_enabled) !== 0,
    live_status: String(row.live_status) as TenantRuntimeHealthRow['live_status'],
    last_inbound_at: row.last_inbound_at == null ? null : String(row.last_inbound_at),
    last_webhook_success_at:
      row.last_webhook_success_at == null ? null : String(row.last_webhook_success_at),
    last_error_message: row.last_error_message == null ? null : String(row.last_error_message),
    last_error_at: row.last_error_at == null ? null : String(row.last_error_at),
    updated_at: String(row.updated_at),
  };
}

export async function upsertTenantRuntimeHealth(args: {
  tenant_id: string;
  ai_enabled: boolean;
  live_status: 'inactive' | 'degraded' | 'live' | 'paused';
  last_inbound_at?: string | null;
  last_webhook_success_at?: string | null;
  last_error_message?: string | null;
  last_error_at?: string | null;
}): Promise<void> {
  const adapter = await getSaasDbAdapter();
  const now = nowIso();
  if (getSaaSDbDriver() === 'postgres') {
    await adapter.execute(
      `INSERT INTO tenant_runtime_health
       (tenant_id, ai_enabled, live_status, last_inbound_at, last_webhook_success_at, last_error_message, last_error_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (tenant_id) DO UPDATE SET
         ai_enabled = EXCLUDED.ai_enabled,
         live_status = EXCLUDED.live_status,
         last_inbound_at = EXCLUDED.last_inbound_at,
         last_webhook_success_at = EXCLUDED.last_webhook_success_at,
         last_error_message = EXCLUDED.last_error_message,
         last_error_at = EXCLUDED.last_error_at,
         updated_at = EXCLUDED.updated_at`,
      [
        args.tenant_id,
        args.ai_enabled ? 1 : 0,
        args.live_status,
        args.last_inbound_at ?? null,
        args.last_webhook_success_at ?? null,
        args.last_error_message ?? null,
        args.last_error_at ?? null,
        now,
      ],
    );
  } else {
    await adapter.execute(
      `INSERT OR REPLACE INTO tenant_runtime_health
       (tenant_id, ai_enabled, live_status, last_inbound_at, last_webhook_success_at, last_error_message, last_error_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        args.tenant_id,
        args.ai_enabled ? 1 : 0,
        args.live_status,
        args.last_inbound_at ?? null,
        args.last_webhook_success_at ?? null,
        args.last_error_message ?? null,
        args.last_error_at ?? null,
        now,
      ],
    );
  }
  await adapter.persistIfNeeded();
}

export interface TenantGoLiveCheckRow {
  id: string;
  tenant_id: string;
  status: 'not_ready' | 'partially_ready' | 'ready_to_go_live';
  results_json: string;
  checked_at: string;
  checked_by: string;
}

export async function insertTenantGoLiveCheck(args: {
  tenant_id: string;
  status: TenantGoLiveCheckRow['status'];
  results_json: string;
  checked_by: string;
}): Promise<TenantGoLiveCheckRow> {
  const id = randomUUID();
  const checked_at = new Date().toISOString();
  const adapter = await getSaasDbAdapter();
  await adapter.execute(
    `INSERT INTO tenant_go_live_checks (id, tenant_id, status, results_json, checked_at, checked_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, args.tenant_id, args.status, args.results_json, checked_at, args.checked_by],
  );
  await adapter.persistIfNeeded();
  return { id, tenant_id: args.tenant_id, status: args.status, results_json: args.results_json, checked_at, checked_by: args.checked_by };
}

export async function getLatestTenantGoLiveCheck(tenantId: string): Promise<TenantGoLiveCheckRow | null> {
  const adapter = await getSaasDbAdapter();
  const row = await adapter.queryOne(
    `SELECT id, tenant_id, status, results_json, checked_at, checked_by
     FROM tenant_go_live_checks WHERE tenant_id = ? ORDER BY checked_at DESC LIMIT 1`,
    [tenantId],
  );
  if (!row) return null;
  return {
    id: String(row.id),
    tenant_id: String(row.tenant_id),
    status: String(row.status) as TenantGoLiveCheckRow['status'],
    results_json: String(row.results_json),
    checked_at: String(row.checked_at),
    checked_by: String(row.checked_by),
  };
}

export async function upsertTenantWebsiteDomain(args: {
  tenant_id: string;
  domain: string;
  is_verified: boolean;
  last_verified_at?: string | null;
}): Promise<void> {
  const adapter = await getSaasDbAdapter();
  const now = nowIso();
  if (getSaaSDbDriver() === 'postgres') {
    await adapter.execute(
      `INSERT INTO tenant_website_domains
       (id, tenant_id, domain, is_verified, last_verified_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (tenant_id, domain) DO UPDATE SET
         is_verified = EXCLUDED.is_verified,
         last_verified_at = EXCLUDED.last_verified_at,
         updated_at = EXCLUDED.updated_at`,
      [randomUUID(), args.tenant_id, args.domain, args.is_verified ? 1 : 0, args.last_verified_at ?? null, now, now],
    );
  } else {
    await adapter.execute(
      `INSERT OR REPLACE INTO tenant_website_domains
       (id, tenant_id, domain, is_verified, last_verified_at, created_at, updated_at)
       VALUES (
         COALESCE((SELECT id FROM tenant_website_domains WHERE tenant_id = ? AND domain = ?), ?),
         ?, ?, ?, ?, ?, ?
       )`,
      [
        args.tenant_id,
        args.domain,
        randomUUID(),
        args.tenant_id,
        args.domain,
        args.is_verified ? 1 : 0,
        args.last_verified_at ?? null,
        now,
        now,
      ],
    );
  }
  await adapter.persistIfNeeded();
}

export async function listTenantWebsiteDomains(tenantId: string): Promise<Array<{ domain: string; is_verified: boolean; last_verified_at: string | null }>> {
  const adapter = await getSaasDbAdapter();
  const rows = await adapter.queryAll(
    `SELECT domain, is_verified, last_verified_at
     FROM tenant_website_domains WHERE tenant_id = ? ORDER BY domain ASC`,
    [tenantId],
  );
  return rows.map((r) => ({
    domain: String(r.domain),
    is_verified: Number(r.is_verified) !== 0,
    last_verified_at: r.last_verified_at == null ? null : String(r.last_verified_at),
  }));
}

export async function insertTenantActivityEvent(args: {
  tenant_id: string;
  event_type: string;
  entity_type: string;
  entity_id?: string | null;
  actor_id: string;
  from_owner_id?: string | null;
  to_owner_id?: string | null;
  message: string;
  metadata_json?: string | null;
}): Promise<void> {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const adapter = await getSaasDbAdapter();
  await adapter.execute(
    `INSERT INTO tenant_activity_events
     (id, tenant_id, event_type, entity_type, entity_id, actor_id, from_owner_id, to_owner_id, message, metadata_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      args.tenant_id,
      args.event_type,
      args.entity_type,
      args.entity_id ?? null,
      args.actor_id,
      args.from_owner_id ?? null,
      args.to_owner_id ?? null,
      args.message,
      args.metadata_json ?? null,
      createdAt,
    ],
  );
  await adapter.persistIfNeeded();
}

export interface TenantActivityEventRow {
  id: string;
  tenant_id: string;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  actor_id: string;
  message: string;
  metadata_json: string | null;
  created_at: string;
}

export async function listTenantActivityEvents(
  tenantId: string,
  limit: number,
  offset: number,
): Promise<TenantActivityEventRow[]> {
  const adapter = await getSaasDbAdapter();
  const cap = Math.min(Math.max(limit, 1), 200);
  const skip = Math.max(offset, 0);
  const rows = await adapter.queryAll(
    `SELECT id, tenant_id, event_type, entity_type, entity_id, actor_id, message, metadata_json, created_at
     FROM tenant_activity_events
     WHERE tenant_id = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [tenantId, cap, skip],
  );
  return rows.map((r) => ({
    id: String(r.id),
    tenant_id: String(r.tenant_id),
    event_type: String(r.event_type),
    entity_type: String(r.entity_type),
    entity_id: r.entity_id == null ? null : String(r.entity_id),
    actor_id: String(r.actor_id),
    message: String(r.message),
    metadata_json: r.metadata_json == null ? null : String(r.metadata_json),
    created_at: String(r.created_at),
  }));
}

export type PlatformLogSeverity = 'info' | 'warning' | 'error';
export type PlatformLogSource = 'webhook' | 'test' | 'runtime_health' | 'go_live' | 'lifecycle' | 'settings';

export interface PlatformLogRow {
  id: string;
  tenant_id: string | null;
  severity: PlatformLogSeverity;
  source: PlatformLogSource;
  message: string;
  metadata_json: string | null;
  created_at: string;
}

export async function insertPlatformLog(args: {
  tenant_id?: string | null;
  severity: PlatformLogSeverity;
  source: PlatformLogSource;
  message: string;
  metadata_json?: string | null;
}): Promise<void> {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const adapter = await getSaasDbAdapter();
  await adapter.execute(
    `INSERT INTO platform_logs (id, tenant_id, severity, source, message, metadata_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, args.tenant_id ?? null, args.severity, args.source, args.message, args.metadata_json ?? null, createdAt],
  );
  await adapter.persistIfNeeded();
}

export async function listPlatformLogs(args: {
  severity?: PlatformLogSeverity;
  tenant_id?: string;
  limit: number;
  offset: number;
}): Promise<PlatformLogRow[]> {
  const adapter = await getSaasDbAdapter();
  const cap = Math.min(Math.max(args.limit, 1), 200);
  const skip = Math.max(args.offset, 0);
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (args.severity) {
    clauses.push('severity = ?');
    params.push(args.severity);
  }
  if (args.tenant_id) {
    clauses.push('tenant_id = ?');
    params.push(args.tenant_id);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await adapter.queryAll(
    `SELECT id, tenant_id, severity, source, message, metadata_json, created_at
     FROM platform_logs
     ${where}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, cap, skip],
  );
  return rows.map((r) => ({
    id: String(r.id),
    tenant_id: r.tenant_id == null ? null : String(r.tenant_id),
    severity: String(r.severity) as PlatformLogSeverity,
    source: String(r.source) as PlatformLogSource,
    message: String(r.message),
    metadata_json: r.metadata_json == null ? null : String(r.metadata_json),
    created_at: String(r.created_at),
  }));
}

export async function getPlatformSettings(): Promise<Record<string, string>> {
  const adapter = await getSaasDbAdapter();
  const rows = await adapter.queryAll('SELECT key, value FROM platform_settings ORDER BY key ASC', []);
  const out: Record<string, string> = {};
  for (const r of rows) {
    out[String(r.key)] = String(r.value);
  }
  if (!('knowledge_ready_threshold' in out)) out.knowledge_ready_threshold = '1';
  if (!('latest_test_freshness_days' in out)) out.latest_test_freshness_days = '7';
  if (!('go_live_warning_error_window_hours' in out)) out.go_live_warning_error_window_hours = '24';
  return out;
}

export async function upsertPlatformSettings(
  patch: Record<string, string>,
  updatedBy: string,
): Promise<void> {
  const adapter = await getSaasDbAdapter();
  const now = nowIso();
  for (const [k, v] of Object.entries(patch)) {
    if (!k.trim()) continue;
    if (getSaaSDbDriver() === 'postgres') {
      await adapter.execute(
        `INSERT INTO platform_settings (key, value, updated_at, updated_by)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at, updated_by = EXCLUDED.updated_by`,
        [k.trim(), String(v), now, updatedBy],
      );
    } else {
      await adapter.execute(
        `INSERT OR REPLACE INTO platform_settings (key, value, updated_at, updated_by)
         VALUES (?, ?, ?, ?)`,
        [k.trim(), String(v), now, updatedBy],
      );
    }
  }
  await adapter.persistIfNeeded();
}

export type ConversationStatus = 'open' | 'pending' | 'resolved';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'closed' | 'unqualified';

function normalizeConversationStatus(raw: unknown): ConversationStatus {
  const s = String(raw ?? '').trim().toLowerCase();
  if (s === 'open' || s === 'pending' || s === 'resolved') return s;
  if (s === 'closed') return 'resolved';
  return 'open';
}

function nowIso(): string {
  return new Date().toISOString();
}

export interface ConversationRow {
  id: string;
  tenant_id: string;
  channel: string;
  external_contact_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  status: ConversationStatus;
  current_owner_principal_id: string | null;
  inquiry_summary: string | null;
  last_message_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  tenant_id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound' | 'system';
  sender_type: 'customer' | 'ai' | 'agent' | 'system';
  sender_display_name: string | null;
  body: string;
  metadata_json: string | null;
  created_at: string;
}

export async function upsertInboundConversationAndMessage(args: {
  tenant_id: string;
  channel: string;
  external_user_id: string;
  external_session_id: string;
  message_id: string;
  body: string;
  metadata_json?: string | null;
}): Promise<{ conversation_id: string; conversation_created: boolean; message_inserted: boolean }> {
  const adapter = await getSaasDbAdapter();
  const now = nowIso();
  const externalContactId = `${args.channel}:${args.external_user_id}:${args.external_session_id}`;
  const existingConversation = await adapter.queryOne(
    `SELECT id FROM conversations
     WHERE tenant_id = ? AND channel = ? AND external_contact_id = ?
     ORDER BY created_at DESC LIMIT 1`,
    [args.tenant_id, args.channel, externalContactId],
  );
  const conversationId = existingConversation ? String(existingConversation.id) : randomUUID();
  if (!existingConversation) {
    const inquirySummary = args.body.trim().slice(0, 240);
    await adapter.execute(
      `INSERT INTO conversations
       (id, tenant_id, channel, external_contact_id, customer_name, customer_phone, customer_email,
        status, current_owner_principal_id, source_message_id, inquiry_summary, last_message_at, resolved_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, NULL, NULL, 'open', NULL, ?, ?, ?, NULL, ?, ?)`,
      [conversationId, args.tenant_id, args.channel, externalContactId, args.message_id, inquirySummary, now, now, now],
    );
  }
  const existingMessage = await adapter.queryOne('SELECT id FROM messages WHERE tenant_id = ? AND id = ?', [
    args.tenant_id,
    args.message_id,
  ]);
  let messageInserted = false;
  if (!existingMessage) {
    await adapter.execute(
      `INSERT INTO messages
       (id, tenant_id, conversation_id, direction, sender_type, sender_display_name, body, metadata_json, created_at)
       VALUES (?, ?, ?, 'inbound', 'customer', 'Website visitor', ?, ?, ?)`,
      [args.message_id, args.tenant_id, conversationId, args.body, args.metadata_json ?? null, now],
    );
    messageInserted = true;
  }
  await adapter.execute('UPDATE conversations SET last_message_at = ?, updated_at = ? WHERE tenant_id = ? AND id = ?', [
    now,
    now,
    args.tenant_id,
    conversationId,
  ]);
  await adapter.persistIfNeeded();
  return {
    conversation_id: conversationId,
    conversation_created: !existingConversation,
    message_inserted: messageInserted,
  };
}

export async function listTenantConversations(args: {
  tenant_id: string;
  limit: number;
  offset: number;
  status?: ConversationStatus;
  channel?: string;
  owner?: string;
}): Promise<{ total: number; rows: ConversationRow[] }> {
  const adapter = await getSaasDbAdapter();
  const cap = Math.min(Math.max(args.limit, 1), 200);
  const skip = Math.max(args.offset, 0);
  const clauses: string[] = ['tenant_id = ?'];
  const params: unknown[] = [args.tenant_id];
  if (args.status) {
    clauses.push(`(status = ? OR (status = 'closed' AND ? = 'resolved'))`);
    params.push(args.status, args.status);
  }
  if (args.channel) {
    clauses.push('channel = ?');
    params.push(args.channel);
  }
  if (args.owner === 'unassigned') {
    clauses.push('(current_owner_principal_id IS NULL OR current_owner_principal_id = \'\')');
  } else if (args.owner && args.owner !== 'all') {
    clauses.push('current_owner_principal_id = ?');
    params.push(args.owner);
  }
  const where = clauses.join(' AND ');
  const totalRow = await adapter.queryOne(`SELECT COUNT(*) AS c FROM conversations WHERE ${where}`, params);
  const rows = await adapter.queryAll(
    `SELECT id, tenant_id, channel, external_contact_id, customer_name, customer_phone, customer_email,
            status, current_owner_principal_id, inquiry_summary, last_message_at, resolved_at, created_at, updated_at
     FROM conversations
     WHERE ${where}
     ORDER BY COALESCE(last_message_at, updated_at) DESC
     LIMIT ? OFFSET ?`,
    [...params, cap, skip],
  );
  return {
    total: totalRow ? Number(totalRow.c) : 0,
    rows: rows.map((r) => ({
      id: String(r.id),
      tenant_id: String(r.tenant_id),
      channel: String(r.channel),
      external_contact_id: String(r.external_contact_id),
      customer_name: r.customer_name == null ? null : String(r.customer_name),
      customer_phone: r.customer_phone == null ? null : String(r.customer_phone),
      customer_email: r.customer_email == null ? null : String(r.customer_email),
      status: normalizeConversationStatus(r.status),
      current_owner_principal_id:
        r.current_owner_principal_id == null ? null : String(r.current_owner_principal_id),
      inquiry_summary: r.inquiry_summary == null ? null : String(r.inquiry_summary),
      last_message_at: r.last_message_at == null ? null : String(r.last_message_at),
      resolved_at: r.resolved_at == null ? null : String(r.resolved_at),
      created_at: String(r.created_at),
      updated_at: String(r.updated_at),
    })),
  };
}

export async function getConversationById(
  tenantId: string,
  conversationId: string,
): Promise<ConversationRow | null> {
  const adapter = await getSaasDbAdapter();
  const r = await adapter.queryOne(
    `SELECT id, tenant_id, channel, external_contact_id, customer_name, customer_phone, customer_email,
            status, current_owner_principal_id, inquiry_summary, last_message_at, resolved_at, created_at, updated_at
     FROM conversations WHERE tenant_id = ? AND id = ?`,
    [tenantId, conversationId],
  );
  if (!r) return null;
  return {
    id: String(r.id),
    tenant_id: String(r.tenant_id),
    channel: String(r.channel),
    external_contact_id: String(r.external_contact_id),
    customer_name: r.customer_name == null ? null : String(r.customer_name),
    customer_phone: r.customer_phone == null ? null : String(r.customer_phone),
    customer_email: r.customer_email == null ? null : String(r.customer_email),
    status: normalizeConversationStatus(r.status),
    current_owner_principal_id: r.current_owner_principal_id == null ? null : String(r.current_owner_principal_id),
    inquiry_summary: r.inquiry_summary == null ? null : String(r.inquiry_summary),
    last_message_at: r.last_message_at == null ? null : String(r.last_message_at),
    resolved_at: r.resolved_at == null ? null : String(r.resolved_at),
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  };
}

export async function listConversationMessages(args: {
  tenant_id: string;
  conversation_id: string;
  limit: number;
  before?: string;
}): Promise<MessageRow[]> {
  const adapter = await getSaasDbAdapter();
  const cap = Math.min(Math.max(args.limit, 1), 200);
  const clauses = ['tenant_id = ?', 'conversation_id = ?'];
  const params: unknown[] = [args.tenant_id, args.conversation_id];
  if (args.before) {
    clauses.push('created_at < ?');
    params.push(args.before);
  }
  const rows = await adapter.queryAll(
    `SELECT id, tenant_id, conversation_id, direction, sender_type, sender_display_name, body, metadata_json, created_at
     FROM messages WHERE ${clauses.join(' AND ')}
     ORDER BY created_at DESC LIMIT ?`,
    [...params, cap],
  );
  return rows.map((r) => ({
    id: String(r.id),
    tenant_id: String(r.tenant_id),
    conversation_id: String(r.conversation_id),
    direction: String(r.direction) as MessageRow['direction'],
    sender_type: String(r.sender_type) as MessageRow['sender_type'],
    sender_display_name: r.sender_display_name == null ? null : String(r.sender_display_name),
    body: String(r.body),
    metadata_json: r.metadata_json == null ? null : String(r.metadata_json),
    created_at: String(r.created_at),
  }));
}

export async function upsertConversationOwner(args: {
  tenant_id: string;
  conversation_id: string;
  owner_principal_id: string | null;
  assigned_by_principal_id: string;
  action_type: 'assign' | 'handoff';
  reason?: string;
  note?: string;
}): Promise<void> {
  const adapter = await getSaasDbAdapter();
  await adapter.execute(
    `UPDATE conversation_assignments SET state = 'superseded'
     WHERE tenant_id = ? AND conversation_id = ? AND state = 'active'`,
    [args.tenant_id, args.conversation_id],
  );
  const assignmentId = randomUUID();
  const assignedAt = nowIso();
  await adapter.execute(
    `INSERT INTO conversation_assignments
     (id, tenant_id, conversation_id, owner_principal_id, assigned_by_principal_id, action_type, state, reason, note, assigned_at)
     VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
    [
      assignmentId,
      args.tenant_id,
      args.conversation_id,
      args.owner_principal_id,
      args.assigned_by_principal_id,
      args.action_type,
      args.reason ?? null,
      args.note ?? null,
      assignedAt,
    ],
  );
  await adapter.execute(
    `UPDATE conversations
     SET current_owner_principal_id = ?, updated_at = ?
     WHERE tenant_id = ? AND id = ?`,
    [args.owner_principal_id, assignedAt, args.tenant_id, args.conversation_id],
  );
  await adapter.persistIfNeeded();
}

export async function updateConversationStatus(args: {
  tenant_id: string;
  conversation_id: string;
  status: ConversationStatus;
}): Promise<void> {
  const adapter = await getSaasDbAdapter();
  const now = nowIso();
  if (getSaaSDbDriver() === 'postgres') {
    await adapter.execute(
      `UPDATE conversations
       SET status = ?,
           resolved_at = CASE WHEN ? = 'resolved' THEN CAST(? AS timestamptz) ELSE NULL END,
           updated_at = CAST(? AS timestamptz)
       WHERE tenant_id = ? AND id = ?`,
      [args.status, args.status, now, now, args.tenant_id, args.conversation_id],
    );
  } else {
    await adapter.execute(
      `UPDATE conversations
       SET status = ?, resolved_at = CASE WHEN ? = 'resolved' THEN ? ELSE NULL END, updated_at = ?
       WHERE tenant_id = ? AND id = ?`,
      [args.status, args.status, now, now, args.tenant_id, args.conversation_id],
    );
  }
  await adapter.persistIfNeeded();
}

export interface LeadRow {
  id: string;
  tenant_id: string;
  conversation_id: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  source_channel: string;
  inquiry_summary: string;
  status: LeadStatus;
  owner_principal_id: string | null;
  latest_note: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadEventRow {
  id: string;
  tenant_id: string;
  lead_id: string;
  event_type: string;
  actor_principal_id: string;
  from_status: string | null;
  to_status: string | null;
  from_owner_principal_id: string | null;
  to_owner_principal_id: string | null;
  message: string;
  metadata_json: string | null;
  created_at: string;
}

export async function getLeadByConversationId(tenantId: string, conversationId: string): Promise<LeadRow | null> {
  const adapter = await getSaasDbAdapter();
  const r = await adapter.queryOne(
    `SELECT id, tenant_id, conversation_id, name, phone, email, source_channel, inquiry_summary,
            status, owner_principal_id, latest_note, converted_at, created_at, updated_at
     FROM leads WHERE tenant_id = ? AND conversation_id = ? LIMIT 1`,
    [tenantId, conversationId],
  );
  if (!r) return null;
  return {
    id: String(r.id),
    tenant_id: String(r.tenant_id),
    conversation_id: r.conversation_id == null ? null : String(r.conversation_id),
    name: r.name == null ? null : String(r.name),
    phone: r.phone == null ? null : String(r.phone),
    email: r.email == null ? null : String(r.email),
    source_channel: String(r.source_channel),
    inquiry_summary: String(r.inquiry_summary ?? ''),
    status: String(r.status) as LeadStatus,
    owner_principal_id: r.owner_principal_id == null ? null : String(r.owner_principal_id),
    latest_note: r.latest_note == null ? null : String(r.latest_note),
    converted_at: r.converted_at == null ? null : String(r.converted_at),
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  };
}

export async function createLeadFromConversation(args: {
  tenant_id: string;
  conversation: ConversationRow;
}): Promise<{ lead: LeadRow; created: boolean }> {
  const existing = await getLeadByConversationId(args.tenant_id, args.conversation.id);
  if (existing) return { lead: existing, created: false };
  const id = randomUUID();
  const now = nowIso();
  const adapter = await getSaasDbAdapter();
  await adapter.execute(
    `INSERT INTO leads
     (id, tenant_id, conversation_id, name, phone, email, source_channel, inquiry_summary, status, owner_principal_id, latest_note, converted_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, NULL, ?, ?, ?)`,
    [
      id,
      args.tenant_id,
      args.conversation.id,
      args.conversation.customer_name,
      args.conversation.customer_phone,
      args.conversation.customer_email,
      args.conversation.channel,
      args.conversation.inquiry_summary ?? '',
      args.conversation.current_owner_principal_id,
      now,
      now,
      now,
    ],
  );
  await adapter.persistIfNeeded();
  const lead = await getLeadByConversationId(args.tenant_id, args.conversation.id);
  if (!lead) throw new Error('lead_create_failed');
  return { lead, created: true };
}

export async function upsertLeaveMessageLead(args: {
  tenant_id: string;
  session_id: string;
  channel: string;
  leave_message_text: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
}): Promise<{ lead: LeadRow; created: boolean }> {
  const adapter = await getSaasDbAdapter();
  const dedupeMarker = `[leave_msg:${args.session_id}]`;
  const inquirySummary = `[留言] ${args.leave_message_text.trim()}`;

  // Check for existing lead with this session dedup marker
  const existing = await adapter.queryOne(
    `SELECT id, tenant_id, conversation_id, name, phone, email, source_channel,
            inquiry_summary, status, owner_principal_id, latest_note,
            converted_at, created_at, updated_at
     FROM leads
     WHERE tenant_id = ? AND latest_note = ? LIMIT 1`,
    [args.tenant_id, dedupeMarker],
  );

  if (existing) {
    return {
      lead: {
        id: String(existing.id),
        tenant_id: String(existing.tenant_id),
        conversation_id: existing.conversation_id == null ? null : String(existing.conversation_id),
        name: existing.name == null ? null : String(existing.name),
        phone: existing.phone == null ? null : String(existing.phone),
        email: existing.email == null ? null : String(existing.email),
        source_channel: String(existing.source_channel),
        inquiry_summary: String(existing.inquiry_summary),
        status: String(existing.status) as LeadStatus,
        owner_principal_id: existing.owner_principal_id == null ? null : String(existing.owner_principal_id),
        latest_note: existing.latest_note == null ? null : String(existing.latest_note),
        converted_at: existing.converted_at == null ? null : String(existing.converted_at),
        created_at: String(existing.created_at),
        updated_at: String(existing.updated_at),
      },
      created: false,
    };
  }

  const id = randomUUID();
  const now = nowIso();
  await adapter.execute(
    `INSERT INTO leads
     (id, tenant_id, conversation_id, name, phone, email, source_channel, inquiry_summary, status, owner_principal_id, latest_note, converted_at, created_at, updated_at)
     VALUES (?, ?, NULL, ?, ?, ?, ?, ?, 'new', NULL, ?, NULL, ?, ?)`,
    [
      id,
      args.tenant_id,
      args.name?.trim() || null,
      args.phone?.trim() || null,
      args.email?.trim() || null,
      args.channel,
      inquirySummary,
      dedupeMarker,
      now,
      now,
    ],
  );
  await adapter.persistIfNeeded();

  const created: LeadRow = {
    id,
    tenant_id: args.tenant_id,
    conversation_id: null,
    name: args.name?.trim() || null,
    phone: args.phone?.trim() || null,
    email: args.email?.trim() || null,
    source_channel: args.channel,
    inquiry_summary: inquirySummary,
    status: 'new',
    owner_principal_id: null,
    latest_note: dedupeMarker,
    converted_at: null,
    created_at: now,
    updated_at: now,
  };
  return { lead: created, created: true };
}

export async function insertLeadEvent(args: {
  tenant_id: string;
  lead_id: string;
  event_type: string;
  actor_principal_id: string;
  from_status?: string | null;
  to_status?: string | null;
  from_owner_principal_id?: string | null;
  to_owner_principal_id?: string | null;
  message: string;
  metadata_json?: string | null;
}): Promise<void> {
  const adapter = await getSaasDbAdapter();
  await adapter.execute(
    `INSERT INTO lead_events
     (id, tenant_id, lead_id, event_type, actor_principal_id, from_status, to_status, from_owner_principal_id, to_owner_principal_id, message, metadata_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      randomUUID(),
      args.tenant_id,
      args.lead_id,
      args.event_type,
      args.actor_principal_id,
      args.from_status ?? null,
      args.to_status ?? null,
      args.from_owner_principal_id ?? null,
      args.to_owner_principal_id ?? null,
      args.message,
      args.metadata_json ?? null,
      nowIso(),
    ],
  );
  await adapter.persistIfNeeded();
}

export async function listTenantLeads(args: {
  tenant_id: string;
  limit: number;
  offset: number;
  status?: LeadStatus;
  owner?: string;
  channel?: string;
}): Promise<{ total: number; rows: LeadRow[] }> {
  const adapter = await getSaasDbAdapter();
  const cap = Math.min(Math.max(args.limit, 1), 200);
  const skip = Math.max(args.offset, 0);
  const clauses = ['tenant_id = ?'];
  const params: unknown[] = [args.tenant_id];
  if (args.status) {
    clauses.push('status = ?');
    params.push(args.status);
  }
  if (args.owner === 'unassigned') {
    clauses.push('(owner_principal_id IS NULL OR owner_principal_id = \'\')');
  } else if (args.owner && args.owner !== 'all') {
    clauses.push('owner_principal_id = ?');
    params.push(args.owner);
  }
  if (args.channel) {
    clauses.push('source_channel = ?');
    params.push(args.channel);
  }
  const where = clauses.join(' AND ');
  const totalRow = await adapter.queryOne(`SELECT COUNT(*) AS c FROM leads WHERE ${where}`, params);
  const rows = await adapter.queryAll(
    `SELECT id, tenant_id, conversation_id, name, phone, email, source_channel, inquiry_summary,
            status, owner_principal_id, latest_note, converted_at, created_at, updated_at
     FROM leads WHERE ${where}
     ORDER BY updated_at DESC
     LIMIT ? OFFSET ?`,
    [...params, cap, skip],
  );
  return {
    total: totalRow ? Number(totalRow.c) : 0,
    rows: rows.map((r) => ({
      id: String(r.id),
      tenant_id: String(r.tenant_id),
      conversation_id: r.conversation_id == null ? null : String(r.conversation_id),
      name: r.name == null ? null : String(r.name),
      phone: r.phone == null ? null : String(r.phone),
      email: r.email == null ? null : String(r.email),
      source_channel: String(r.source_channel),
      inquiry_summary: String(r.inquiry_summary ?? ''),
      status: String(r.status) as LeadStatus,
      owner_principal_id: r.owner_principal_id == null ? null : String(r.owner_principal_id),
      latest_note: r.latest_note == null ? null : String(r.latest_note),
      converted_at: r.converted_at == null ? null : String(r.converted_at),
      created_at: String(r.created_at),
      updated_at: String(r.updated_at),
    })),
  };
}

export async function getLeadById(tenantId: string, leadId: string): Promise<LeadRow | null> {
  const adapter = await getSaasDbAdapter();
  const r = await adapter.queryOne(
    `SELECT id, tenant_id, conversation_id, name, phone, email, source_channel, inquiry_summary,
            status, owner_principal_id, latest_note, converted_at, created_at, updated_at
     FROM leads WHERE tenant_id = ? AND id = ?`,
    [tenantId, leadId],
  );
  if (!r) return null;
  return {
    id: String(r.id),
    tenant_id: String(r.tenant_id),
    conversation_id: r.conversation_id == null ? null : String(r.conversation_id),
    name: r.name == null ? null : String(r.name),
    phone: r.phone == null ? null : String(r.phone),
    email: r.email == null ? null : String(r.email),
    source_channel: String(r.source_channel),
    inquiry_summary: String(r.inquiry_summary ?? ''),
    status: String(r.status) as LeadStatus,
    owner_principal_id: r.owner_principal_id == null ? null : String(r.owner_principal_id),
    latest_note: r.latest_note == null ? null : String(r.latest_note),
    converted_at: r.converted_at == null ? null : String(r.converted_at),
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  };
}

export async function listLeadEvents(tenantId: string, leadId: string, limit: number): Promise<LeadEventRow[]> {
  const adapter = await getSaasDbAdapter();
  const cap = Math.min(Math.max(limit, 1), 200);
  const rows = await adapter.queryAll(
    `SELECT id, tenant_id, lead_id, event_type, actor_principal_id, from_status, to_status,
            from_owner_principal_id, to_owner_principal_id, message, metadata_json, created_at
     FROM lead_events
     WHERE tenant_id = ? AND lead_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [tenantId, leadId, cap],
  );
  return rows.map((r) => ({
    id: String(r.id),
    tenant_id: String(r.tenant_id),
    lead_id: String(r.lead_id),
    event_type: String(r.event_type),
    actor_principal_id: String(r.actor_principal_id),
    from_status: r.from_status == null ? null : String(r.from_status),
    to_status: r.to_status == null ? null : String(r.to_status),
    from_owner_principal_id: r.from_owner_principal_id == null ? null : String(r.from_owner_principal_id),
    to_owner_principal_id: r.to_owner_principal_id == null ? null : String(r.to_owner_principal_id),
    message: String(r.message),
    metadata_json: r.metadata_json == null ? null : String(r.metadata_json),
    created_at: String(r.created_at),
  }));
}

export async function updateLeadOwner(args: {
  tenant_id: string;
  lead_id: string;
  owner_principal_id: string | null;
}): Promise<void> {
  const adapter = await getSaasDbAdapter();
  await adapter.execute(
    `UPDATE leads SET owner_principal_id = ?, updated_at = ? WHERE tenant_id = ? AND id = ?`,
    [args.owner_principal_id, nowIso(), args.tenant_id, args.lead_id],
  );
  await adapter.persistIfNeeded();
}

const LEAD_STATUS_NEXT: Record<LeadStatus, LeadStatus[]> = {
  new: ['contacted', 'unqualified'],
  contacted: ['qualified', 'closed', 'unqualified'],
  qualified: ['closed', 'unqualified'],
  closed: [],
  unqualified: [],
};

export function canTransitLeadStatus(from: LeadStatus, to: LeadStatus): boolean {
  return LEAD_STATUS_NEXT[from].includes(to);
}

export async function updateLeadStatus(args: {
  tenant_id: string;
  lead_id: string;
  status: LeadStatus;
}): Promise<void> {
  const adapter = await getSaasDbAdapter();
  await adapter.execute(`UPDATE leads SET status = ?, updated_at = ? WHERE tenant_id = ? AND id = ?`, [
    args.status,
    nowIso(),
    args.tenant_id,
    args.lead_id,
  ]);
  await adapter.persistIfNeeded();
}

export async function getTenantReportSummary(args: {
  tenant_id: string;
  range: 'today' | 'last7d' | 'all_time';
}): Promise<{
  range: 'today' | 'last7d' | 'all_time';
  cards: Record<string, number>;
  channel_breakdown: Array<{ channel: string; conversations: number }>;
  owner_breakdown: Array<{ owner_principal_id: string | null; conversations: number }>;
}> {
  const adapter = await getSaasDbAdapter();
  const now = new Date();
  let sinceIso: string | null = null;
  if (args.range === 'today') {
    const s = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    sinceIso = s.toISOString();
  } else if (args.range === 'last7d') {
    sinceIso = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
  }
  const whereBy = (field: string): { clause: string; params: unknown[] } => {
    if (!sinceIso) return { clause: 'tenant_id = ?', params: [args.tenant_id] };
    return { clause: `tenant_id = ? AND ${field} >= ?`, params: [args.tenant_id, sinceIso] };
  };
  const totalConversationsW = whereBy('created_at');
  const openConversationsW = whereBy('updated_at');
  const resolvedConversationsW = whereBy('resolved_at');
  const totalLeadsW = whereBy('created_at');
  const newLeadsW = whereBy('created_at');
  const qualifiedLeadsW = whereBy('created_at');
  const handoffW = whereBy('assigned_at');

  const qCount = async (sql: string, params: unknown[]) => {
    const r = await adapter.queryOne(sql, params);
    return r ? Number(r.c) : 0;
  };

  const total_conversations = await qCount(
    `SELECT COUNT(*) AS c FROM conversations WHERE ${totalConversationsW.clause}`,
    totalConversationsW.params,
  );
  const open_conversations = await qCount(
    `SELECT COUNT(*) AS c FROM conversations WHERE ${openConversationsW.clause} AND (status = 'open' OR status = 'pending')`,
    openConversationsW.params,
  );
  const resolved_conversations = await qCount(
    `SELECT COUNT(*) AS c FROM conversations WHERE ${resolvedConversationsW.clause} AND (status = 'resolved' OR status = 'closed')`,
    resolvedConversationsW.params,
  );
  const total_leads = await qCount(
    `SELECT COUNT(*) AS c FROM leads WHERE ${totalLeadsW.clause}`,
    totalLeadsW.params,
  );
  const new_leads = await qCount(
    `SELECT COUNT(*) AS c FROM leads WHERE ${newLeadsW.clause} AND status = 'new'`,
    newLeadsW.params,
  );
  const qualified_leads = await qCount(
    `SELECT COUNT(*) AS c FROM leads WHERE ${qualifiedLeadsW.clause} AND status = 'qualified'`,
    qualifiedLeadsW.params,
  );
  const handoff_count = await qCount(
    `SELECT COUNT(*) AS c FROM conversation_assignments WHERE ${handoffW.clause} AND action_type = 'handoff'`,
    handoffW.params,
  );

  const channelRows = await adapter.queryAll(
    `SELECT channel, COUNT(*) AS c
     FROM conversations
     WHERE ${totalConversationsW.clause}
     GROUP BY channel
     ORDER BY c DESC`,
    totalConversationsW.params,
  );
  const ownerRows = await adapter.queryAll(
    `SELECT current_owner_principal_id, COUNT(*) AS c
     FROM conversations
     WHERE ${openConversationsW.clause}
     GROUP BY current_owner_principal_id
     ORDER BY c DESC`,
    openConversationsW.params,
  );

  return {
    range: args.range,
    cards: {
      total_conversations,
      open_conversations,
      resolved_conversations,
      total_leads,
      new_leads,
      qualified_leads,
      handoff_count,
    },
    channel_breakdown: channelRows.map((r) => ({ channel: String(r.channel), conversations: Number(r.c) })),
    owner_breakdown: ownerRows.map((r) => ({
      owner_principal_id: r.current_owner_principal_id == null ? null : String(r.current_owner_principal_id),
      conversations: Number(r.c),
    })),
  };
}
