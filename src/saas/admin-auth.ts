/**
 * SaaS Admin control-plane auth (Phase 24 — abstraction + tenant bridges).
 * Webhook / legacy paths stay separate; tenant webhook verification is unchanged.
 *
 * Auth source cutline / deprecation metadata: `admin-auth-sources.ts` (1J).
 */

import type { SaasAdminAuthSource } from './admin-auth-sources';
import {
  BRIDGE_SAAS_ADMIN_AUTH_SOURCE_IDS,
  SAAS_ADMIN_AUTH_SOURCE_IDS,
  SAAS_ADMIN_AUTH_SOURCE_REGISTRY,
} from './admin-auth-sources';
import { findEnabledPrincipalByBridgeToken, countAllTenantAdminPrincipals } from './repository';
import { isBreakGlassTtlModeActive, parseBreakGlassExpiresAtIso } from './break-glass-policy';
import { insertBreakGlassAuditEvent, maybeAuditBreakGlassTtlEnabled } from './break-glass-audit';

export type { AuthSourceStability, SaasAdminAuthSource } from './admin-auth-sources';
export {
  BRIDGE_SAAS_ADMIN_AUTH_SOURCE_IDS,
  SAAS_ADMIN_AUTH_SOURCE_IDS,
  SAAS_ADMIN_AUTH_SOURCE_REGISTRY,
} from './admin-auth-sources';

/** Roles for Admin API; live sources: break-glass, tenant_admin bridge, tenant_operator_readonly bridge. */
export type SaasAdminAuthRole = 'platform_admin' | 'tenant_admin' | 'tenant_operator_readonly';

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
  | { ok: false }
  | { ok: false; error: 'break_glass_ttl_expired' | 'break_glass_ttl_misconfigured' };

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
 * Resolve Admin Bearer to an auth context (async — Phase 24 / 1G DB principal lookup).
 * **Priority**:
 * 1. break-glass `CHATFLOW_SAAS_ADMIN_TOKEN` → `platform_admin`
 * 2. DB `tenant_admin_principals` (enabled row by `bridge_token`) → `tenant_admin` | `tenant_operator_readonly` (`tenant_bridge_db`, slug/id from DB)
 * 3. `CHATFLOW_SAAS_TENANT_ADMIN_TOKENS` → `tenant_admin`
 * 4. `CHATFLOW_SAAS_TENANT_READONLY_TOKENS` → `tenant_operator_readonly`
 * 5. unauthenticated
 */
export async function resolveSaasAdminAuth(
  authHeader: string | undefined,
  opts?: { httpRequestId?: string | null },
): Promise<ResolvedSaasAdminAuth> {
  const bg = breakGlassAdminToken();
  if (bg && authHeader === `Bearer ${bg}`) {
    if (!isBreakGlassTtlModeActive()) {
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
    const reqId = opts?.httpRequestId ?? null;
    const expIso = parseBreakGlassExpiresAtIso();
    if (!expIso) {
      await insertBreakGlassAuditEvent({
        action: 'break_glass_ttl_denied_misconfigured',
        request_id: reqId,
        detail: { reason: 'expires_at_missing_or_invalid' },
      });
      return { ok: false, error: 'break_glass_ttl_misconfigured' };
    }
    if (Date.now() > Date.parse(expIso)) {
      await insertBreakGlassAuditEvent({
        action: 'break_glass_ttl_denied_expired',
        expires_at_iso: expIso,
        request_id: reqId,
        detail: { gate: 'ttl_expired' },
      });
      return { ok: false, error: 'break_glass_ttl_expired' };
    }
    await maybeAuditBreakGlassTtlEnabled({ expires_at_iso: expIso, request_id: reqId });
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
  const bearerSecret = bearerSecretFromHeader(authHeader);
  if (bearerSecret) {
    const dbRow = await findEnabledPrincipalByBridgeToken(bearerSecret);
    if (dbRow) {
      return {
        ok: true,
        context: {
          role: dbRow.role,
          auth_source: 'tenant_bridge_db',
          scope_type: 'tenant',
          tenant_id: dbRow.tenant_id,
          tenant_slug: dbRow.tenant_slug,
        },
      };
    }
  }
  const adminBridge = resolveTenantAdminBridgeContext(authHeader);
  if (adminBridge) return { ok: true, context: adminBridge };
  const roBridge = resolveTenantReadonlyBridgeContext(authHeader);
  if (roBridge) return { ok: true, context: roBridge };
  return { ok: false };
}

/** Gate helper for `/saas/v1/admin/*` (same resolution as `resolveSaasAdminAuth`). */
export async function requireSaasAdmin(
  authHeader: string | undefined,
  opts?: { httpRequestId?: string | null },
): Promise<ResolvedSaasAdminAuth> {
  return resolveSaasAdminAuth(authHeader, opts);
}

/** Phase 24 / 1J — read-only summary for platform_admin introspection (no secrets). */
export async function getSaasAdminAuthSummaryPayload(): Promise<{
  break_glass_present: boolean;
  env_tenant_admin_bridge_configured: boolean;
  env_tenant_readonly_bridge_configured: boolean;
  db_principal_source_active: boolean;
  bridge_source_ids: readonly string[];
  auth_sources: Array<{
    id: SaasAdminAuthSource;
    stability: (typeof SAAS_ADMIN_AUTH_SOURCE_REGISTRY)[SaasAdminAuthSource]['stability'];
    intended_scope: string;
    deprecation_candidate: boolean;
    configured: boolean;
  }>;
}> {
  const break_glass_present = Boolean(breakGlassAdminToken());
  const env_tenant_admin_bridge_configured = parseTenantAdminTokenMap().size > 0;
  const env_tenant_readonly_bridge_configured = parseTenantReadonlyTokenMap().size > 0;
  const dbCount = await countAllTenantAdminPrincipals();
  const db_principal_source_active = dbCount > 0;

  const auth_sources = SAAS_ADMIN_AUTH_SOURCE_IDS.map((id) => {
    const meta = SAAS_ADMIN_AUTH_SOURCE_REGISTRY[id];
    const configured =
      id === 'break_glass_env'
        ? break_glass_present
        : id === 'tenant_bridge_env'
          ? env_tenant_admin_bridge_configured
          : id === 'tenant_readonly_bridge_env'
            ? env_tenant_readonly_bridge_configured
            : id === 'tenant_bridge_db'
              ? db_principal_source_active
              : false;
    return {
      id,
      stability: meta.stability,
      intended_scope: meta.intended_scope,
      deprecation_candidate: meta.deprecation_candidate,
      configured,
    };
  });

  return {
    break_glass_present,
    env_tenant_admin_bridge_configured,
    env_tenant_readonly_bridge_configured,
    db_principal_source_active,
    bridge_source_ids: [...BRIDGE_SAAS_ADMIN_AUTH_SOURCE_IDS],
    auth_sources,
  };
}
