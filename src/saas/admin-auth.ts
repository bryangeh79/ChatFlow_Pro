/**
 * SaaS Admin control-plane auth (Phase 24 — abstraction + tenant bridges).
 * Webhook / legacy paths stay separate; tenant webhook verification is unchanged.
 */

/** Roles for Admin API; live sources: break-glass, tenant_admin bridge, tenant_operator_readonly bridge. */
export type SaasAdminAuthRole = 'platform_admin' | 'tenant_admin' | 'tenant_operator_readonly';

/** Credential sources for admin principals. */
export type SaasAdminAuthSource =
  | 'break_glass_env'
  | 'tenant_bridge_env'
  | 'tenant_readonly_bridge_env';

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
 * Parse `slug → bearer secret` JSON from an env var (shared shape for admin/readonly bridges).
 * Keys lowercased; values trimmed. Invalid / empty → empty map.
 */
function parseSlugTokenJsonMapFromEnv(envName: string): Map<string, string> {
  const raw = process.env[envName]?.trim();
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
 * Phase 24 / 1E — JSON map slug → secret for **tenant_admin** bridge (dev/ops only).
 * Env: `CHATFLOW_SAAS_TENANT_ADMIN_TOKENS`
 */
export function parseTenantAdminTokenMap(): Map<string, string> {
  return parseSlugTokenJsonMapFromEnv('CHATFLOW_SAAS_TENANT_ADMIN_TOKENS');
}

/**
 * Phase 24 / 1F — JSON map slug → secret for **tenant_operator_readonly** bridge (dev/ops only).
 * Env: `CHATFLOW_SAAS_TENANT_READONLY_TOKENS`
 */
export function parseTenantReadonlyTokenMap(): Map<string, string> {
  return parseSlugTokenJsonMapFromEnv('CHATFLOW_SAAS_TENANT_READONLY_TOKENS');
}

function bearerSecretFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const s = authHeader.slice('Bearer '.length).trim();
  return s || null;
}

function resolveTenantAdminBridgeContext(authHeader: string | undefined): SaasAdminAuthContext | null {
  const bearerSecret = bearerSecretFromHeader(authHeader);
  if (!bearerSecret) return null;
  for (const [slug, tok] of parseTenantAdminTokenMap()) {
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

function resolveTenantReadonlyBridgeContext(authHeader: string | undefined): SaasAdminAuthContext | null {
  const bearerSecret = bearerSecretFromHeader(authHeader);
  if (!bearerSecret) return null;
  for (const [slug, tok] of parseTenantReadonlyTokenMap()) {
    if (tok === bearerSecret) {
      return {
        role: 'tenant_operator_readonly',
        auth_source: 'tenant_readonly_bridge_env',
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
 * **Priority**:
 * 1. break-glass `CHATFLOW_SAAS_ADMIN_TOKEN` → `platform_admin`
 * 2. `CHATFLOW_SAAS_TENANT_ADMIN_TOKENS` → `tenant_admin`
 * 3. `CHATFLOW_SAAS_TENANT_READONLY_TOKENS` → `tenant_operator_readonly`
 * 4. unauthenticated
 *
 * Same secret in multiple maps: earlier step wins (break-glass > admin map > readonly map).
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
  const adminBridge = resolveTenantAdminBridgeContext(authHeader);
  if (adminBridge) return { ok: true, context: adminBridge };
  const roBridge = resolveTenantReadonlyBridgeContext(authHeader);
  if (roBridge) return { ok: true, context: roBridge };
  return { ok: false };
}

/** Gate helper for `/saas/v1/admin/*` (same resolution as `resolveSaasAdminAuth`). */
export function requireSaasAdmin(authHeader: string | undefined): ResolvedSaasAdminAuth {
  return resolveSaasAdminAuth(authHeader);
}
