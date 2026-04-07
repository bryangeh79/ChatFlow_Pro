/**
 * SaaS Admin authorization scaffold (Phase 24 / 1C).
 * Declares allowed_roles per route; live identities still only break-glass platform_admin.
 */

import type { SaasAdminAuthContext, SaasAdminAuthRole } from './admin-auth';

export type { SaasAdminAuthRole };

/** Policy row: HTTP method + path regex + roles that may call it (OR). */
export interface AdminRoutePolicy {
  id: string;
  method: string;
  pathPattern: RegExp;
  /** Today: all routes are `platform_admin` only. Future: add tenant_admin for scoped writes, tenant_operator_readonly for safe GETs. */
  allowed_roles: readonly SaasAdminAuthRole[];
}

/**
 * Order: more specific path patterns before generic `/tenants/:slug`.
 * Future split (documented here, not enabled in allowed_roles yet):
 * - `PUT .../credentials`, `PUT .../faq`, `PUT .../settings` → later `tenant_admin` when tenant-scoped auth exists.
 * - `GET .../faq`, `GET .../tenants/:slug` → later `tenant_operator_readonly` for read-only ops.
 * - `GET|POST /tenants` (platform list/create) → stay `platform_admin` only.
 */
export const ADMIN_ROUTE_POLICIES: readonly AdminRoutePolicy[] = [
  {
    id: 'admin_tenant_settings_put',
    method: 'PUT',
    pathPattern: /^\/saas\/v1\/admin\/tenants\/[^/]+\/settings$/,
    allowed_roles: ['platform_admin'],
  },
  {
    id: 'admin_tenant_faq_put',
    method: 'PUT',
    pathPattern: /^\/saas\/v1\/admin\/tenants\/[^/]+\/faq$/,
    allowed_roles: ['platform_admin'],
  },
  {
    id: 'admin_tenant_faq_get',
    method: 'GET',
    pathPattern: /^\/saas\/v1\/admin\/tenants\/[^/]+\/faq$/,
    allowed_roles: ['platform_admin'],
  },
  {
    id: 'admin_tenant_credentials_put',
    method: 'PUT',
    pathPattern: /^\/saas\/v1\/admin\/tenants\/[^/]+\/credentials$/,
    allowed_roles: ['platform_admin'],
  },
  {
    id: 'admin_tenant_get',
    method: 'GET',
    pathPattern: /^\/saas\/v1\/admin\/tenants\/[^/]+$/,
    allowed_roles: ['platform_admin'],
  },
  {
    id: 'admin_tenants_list_get',
    method: 'GET',
    pathPattern: /^\/saas\/v1\/admin\/tenants$/,
    allowed_roles: ['platform_admin'],
  },
  {
    id: 'admin_tenants_create_post',
    method: 'POST',
    pathPattern: /^\/saas\/v1\/admin\/tenants$/,
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

/**
 * After authentication succeeds: if this path is a declared admin route, enforce allowed_roles.
 * Unlisted paths under `/saas/v1/admin/` fall through (typically 404) without a 403.
 */
export function authorizeAdminRouteAfterAuth(
  method: string,
  pathname: string,
  context: SaasAdminAuthContext,
): { ok: true } | { ok: false; reason: 'forbidden' } {
  const policy = matchAdminRoutePolicy(method, pathname);
  if (!policy) return { ok: true };
  if (!isRoleAllowedForAdminPolicy(policy, context.role)) return { ok: false, reason: 'forbidden' };
  return { ok: true };
}
