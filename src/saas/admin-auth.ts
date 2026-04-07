/**
 * SaaS Admin control-plane auth (Phase 24 — abstraction + tenant bridge).
 * Webhook / legacy paths stay separate; tenant webhook verification is unchanged.
 */

/** Roles for Admin API; live sources: break-glass `platform_admin`, bridge `tenant_admin`. */
export type SaasAdminAuthRole = 'platform_admin' | 'tenant_admin' | 'tenant_operator_readonly';

/** Credential sources for admin principals. */
export type SaasAdminAuthSource = 'break_glass_env' | 'tenant_bridge_env';

/** Admin principal scope: platform ops vs single-tenant binding (1D+ semantics). */
export type SaasAdminScopeType = 'platform' | 'tenant';

export interface SaasAdminAuthContext {
  role: SaasAdminAuthRole;
  auth_source: SaasAdminAuthSource;
  scope_type: SaasAdminScopeType;
  /** DB tenant UUID when available; not used for URL matching in 1D. */
  tenant_id?: string | null;
  /** When `scope_type === 'tenant'`, slug this principal may access (matches URL `:slug`). */
  tenant_slug?: string;
}

export type ResolvedSaasAdminAuth =
  | { ok: true; context: SaasAdminAuthContext }
  | { ok: false };

/** Env token used for break-glass / CI (unchanged contract). */
export function breakGlassAdminToken(): string | undefined {
  return process.env.CHATFLOW_SAAS_ADMIN_TOKEN?.trim() || undefined;
}

/**
 * JSON map slug → bearer secret for **dev/ops bridge only** (Phase 24 / 1E).
 * Env: `CHATFLOW_SAAS_TENANT_ADMIN_TOKENS='{"acme":"secret1","corp-b":"secret2"}'`
 * Keys normalized to lowercase; values trimmed. Invalid JSON → empty map.
 */
export function parseTenantAdminTokenMap(): Map<string, string> {
  const raw = process.env.CHATFLOW_SAAS_TENANT_ADMIN_TOKENS?.trim();
  if (!raw) return new Map();
  try {
    const o = JSON.parse(raw) as unknown;
    if (typeof o !== 'object' || o === null || Array.isArray(o)) return new Map();
    const m = new Map<string, string>();
    for (const [k, v] of Object.entries(o)) {
      if (typeof v !== 'string') continue;
      const slug = String(k).trim().toLowerCase();
      const tok = v.trim();
      if (slug && tok) m.set(slug, tok);
    }
    return m;
  } catch {
    return new Map();
  }
}

/**
 * Resolve tenant bridge: Bearer body must equal a configured per-slug token.
 * Returns null if unmapped or header missing.
 */
function resolveTenantBridgeContext(authHeader: string | undefined): SaasAdminAuthContext | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const bearerSecret = authHeader.slice('Bearer '.length).trim();
  if (!bearerSecret) return null;
  const map = parseTenantAdminTokenMap();
  for (const [slug, tok] of map) {
    if (tok === bearerSecret) {
      return {
        role: 'tenant_admin',
        auth_source: 'tenant_bridge_env',
        scope_type: 'tenant',
        tenant_slug: slug,
        tenant_id: null,
      };
    }
  }
  return null;
}

/**
 * Resolve Admin Bearer to an auth context.
 * **Priority**: (1) break-glass `CHATFLOW_SAAS_ADMIN_TOKEN` → `platform_admin`;
 * (2) `CHATFLOW_SAAS_TENANT_ADMIN_TOKENS` slug map → `tenant_admin` for matched slug;
 * (3) unauthenticated.
 * If the same secret is both break-glass and in the map, break-glass wins.
 */
export function resolveSaasAdminAuth(authHeader: string | undefined): ResolvedSaasAdminAuth {
  const bg = breakGlassAdminToken();
  if (bg && authHeader === `Bearer ${bg}`) {
    return {
      ok: true,
      context: {
        role: 'platform_admin',
        auth_source: 'break_glass_env',
        scope_type: 'platform',
        tenant_id: null,
      },
    };
  }
  const tenantCtx = resolveTenantBridgeContext(authHeader);
  if (tenantCtx) return { ok: true, context: tenantCtx };
  return { ok: false };
}

/** Gate helper for `/saas/v1/admin/*` (same resolution as `resolveSaasAdminAuth`). */
export function requireSaasAdmin(authHeader: string | undefined): ResolvedSaasAdminAuth {
  return resolveSaasAdminAuth(authHeader);
}
