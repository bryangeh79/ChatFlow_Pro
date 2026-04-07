/**
 * SaaS Admin authorization (Phase 24 / 1C scaffold + 1D tenant-scoped RBAC semantics).
 * Policy table encodes future roles; live source still only break-glass `platform_admin`.
 */

import type { SaasAdminAuthContext, SaasAdminAuthRole } from './admin-auth';

export type { SaasAdminAuthRole };

/** Platform-wide admin surface vs per-tenant resource paths. */
export type AdminResourceScope = 'platform' | 'tenant_targeted';

/** Policy row: method + path regex + allowed roles + scope for tenant matching rules. */
export interface AdminRoutePolicy {
  id: string;
  method: string;
  pathPattern: RegExp;
  resource_scope: AdminResourceScope;
  /**
   * OR semantics. Live break-glass is only `platform_admin`.
   * `tenant_admin` / `tenant_operator_readonly` are Phase 24 RBAC semantics until a real tenant principal exists.
   */
  allowed_roles: readonly SaasAdminAuthRole[];
}

/**
 * Order: more specific path patterns before generic `/tenants/:slug`.
 * Live principal: break-glass env token → `platform_admin` / `scope_type: platform` only.
 */
export const ADMIN_ROUTE_POLICIES: readonly AdminRoutePolicy[] = [
  {
    id: 'admin_tenant_principals_audit_get',
    method: 'GET',
    pathPattern: /^\/saas\/v1\/admin\/tenants\/[^/]+\/principals\/audit$/,
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin'],
  },
  {
    id: 'admin_tenant_principals_put',
    method: 'PUT',
    pathPattern: /^\/saas\/v1\/admin\/tenants\/[^/]+\/principals$/,
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin'],
  },
  {
    id: 'admin_tenant_principals_get',
    method: 'GET',
    pathPattern: /^\/saas\/v1\/admin\/tenants\/[^/]+\/principals$/,
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin'],
  },
  {
    id: 'admin_tenant_settings_put',
    method: 'PUT',
    pathPattern: /^\/saas\/v1\/admin\/tenants\/[^/]+\/settings$/,
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin'],
  },
  {
    id: 'admin_tenant_faq_put',
    method: 'PUT',
    pathPattern: /^\/saas\/v1\/admin\/tenants\/[^/]+\/faq$/,
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin'],
  },
  {
    id: 'admin_tenant_faq_get',
    method: 'GET',
    pathPattern: /^\/saas\/v1\/admin\/tenants\/[^/]+\/faq$/,
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin', 'tenant_operator_readonly'],
  },
  {
    id: 'admin_tenant_credentials_put',
    method: 'PUT',
    pathPattern: /^\/saas\/v1\/admin\/tenants\/[^/]+\/credentials$/,
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin'],
  },
  {
    id: 'admin_tenant_get',
    method: 'GET',
    pathPattern: /^\/saas\/v1\/admin\/tenants\/[^/]+$/,
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin', 'tenant_operator_readonly'],
  },
  {
    id: 'admin_tenants_list_get',
    method: 'GET',
    pathPattern: /^\/saas\/v1\/admin\/tenants$/,
    resource_scope: 'platform',
    allowed_roles: ['platform_admin'],
  },
  {
    id: 'admin_tenants_create_post',
    method: 'POST',
    pathPattern: /^\/saas\/v1\/admin\/tenants$/,
    resource_scope: 'platform',
    allowed_roles: ['platform_admin'],
  },
] as const;

export function matchAdminRoutePolicy(method: string, pathname: string): AdminRoutePolicy | null {
  const m = method.toUpperCase();
  for (const p of ADMIN_ROUTE_POLICIES) {
    if (p.method !== m) continue;
    if (p.pathPattern.test(pathname)) return p;
  }
  return null;
}

export function isRoleAllowedForAdminPolicy(
  policy: AdminRoutePolicy,
  role: SaasAdminAuthRole,
): boolean {
  return (policy.allowed_roles as readonly SaasAdminAuthRole[]).includes(role);
}

export function isAdminRouteTenantScoped(policy: AdminRoutePolicy): boolean {
  return policy.resource_scope === 'tenant_targeted';
}

/** Slug segment for tenant-targeted admin paths; `null` for platform routes or non-matching paths. */
export function resolveAdminRouteTargetTenantSlug(pathname: string): string | null {
  const m = pathname.match(
    /^\/saas\/v1\/admin\/tenants\/([^/]+)(?:\/(credentials|faq|settings|principals\/audit|principals))?$/,
  );
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]).trim().toLowerCase();
  } catch {
    return m[1].trim().toLowerCase();
  }
}

/** Whether a tenant-bound principal's slug matches the route target (platform_admin always matches when role already allowed). */
export function doesAdminScopeMatchRouteTarget(
  context: SaasAdminAuthContext,
  targetSlug: string,
): boolean {
  if (context.role === 'platform_admin') return true;
  if (context.scope_type !== 'tenant' || context.tenant_slug == null || context.tenant_slug === '') {
    return false;
  }
  return context.tenant_slug === targetSlug.trim().toLowerCase();
}

/**
 * After authentication: enforce allowed_roles + tenant scope for tenant_targeted routes.
 * Unlisted paths under `/saas/v1/admin/` fall through without 403 here.
 */
export function authorizeAdminRouteAfterAuth(
  method: string,
  pathname: string,
  context: SaasAdminAuthContext,
): { ok: true } | { ok: false; reason: 'forbidden' } {
  const policy = matchAdminRoutePolicy(method, pathname);
  if (!policy) return { ok: true };

  if (!isRoleAllowedForAdminPolicy(policy, context.role)) {
    return { ok: false, reason: 'forbidden' };
  }

  if (policy.resource_scope === 'platform') {
    return { ok: true };
  }

  const targetSlug = resolveAdminRouteTargetTenantSlug(pathname);
  if (!targetSlug) return { ok: false, reason: 'forbidden' };

  if (!doesAdminScopeMatchRouteTarget(context, targetSlug)) {
    return { ok: false, reason: 'forbidden' };
  }

  return { ok: true };
}
