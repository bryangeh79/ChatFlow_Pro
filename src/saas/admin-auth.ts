/**
 * SaaS Admin control-plane auth (Phase 24 — abstraction bridge).
 * Webhook / legacy paths stay separate; tenant webhook verification is unchanged.
 */

/** Roles for Admin API; only `platform_admin` is issued in break-glass / 1B. */
export type SaasAdminAuthRole = 'platform_admin' | 'tenant_admin' | 'tenant_operator_readonly';

/** Credential sources; only `break_glass_env` is implemented in 1B. */
export type SaasAdminAuthSource = 'break_glass_env';

export interface SaasAdminAuthContext {
  role: SaasAdminAuthRole;
  auth_source: SaasAdminAuthSource;
  /** For future tenant-scoped roles (RBAC); unset for platform_admin / break-glass. */
  tenant_id?: string;
}

export type ResolvedSaasAdminAuth =
  | { ok: true; context: SaasAdminAuthContext }
  | { ok: false };

/** Env token used for break-glass / CI (unchanged contract). */
export function breakGlassAdminToken(): string | undefined {
  return process.env.CHATFLOW_SAAS_ADMIN_TOKEN?.trim() || undefined;
}

/**
 * Resolve Admin Bearer credentials to an auth context.
 * Today: exact match to `Bearer ${CHATFLOW_SAAS_ADMIN_TOKEN}` → platform_admin / break_glass_env.
 */
export function resolveSaasAdminAuth(authHeader: string | undefined): ResolvedSaasAdminAuth {
  const t = breakGlassAdminToken();
  if (!t) return { ok: false };
  if (authHeader !== `Bearer ${t}`) return { ok: false };
  return {
    ok: true,
    context: {
      role: 'platform_admin',
      auth_source: 'break_glass_env',
    },
  };
}

/** Gate helper for `/saas/v1/admin/*` (same resolution as resolve; name marks enforcement point). */
export function requireSaasAdmin(authHeader: string | undefined): ResolvedSaasAdminAuth {
  return resolveSaasAdminAuth(authHeader);
}
