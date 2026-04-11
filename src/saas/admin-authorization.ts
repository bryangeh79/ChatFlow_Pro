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

/** Lowercase UUID v4-style segment for `/platform/tenants/:tenantId` admin paths. */
export const ADMIN_TENANT_ID_SEGMENT = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

function tenantIdPath(suffix: string): RegExp {
  return new RegExp(
    `^/saas/v1/admin/(?:platform/tenants|tenant-ids)/${ADMIN_TENANT_ID_SEGMENT}${suffix}$`,
    'i',
  );
}

/**
 * Order: more specific path patterns before generic `/tenants/:slug`.
 * Live principal: break-glass env token → `platform_admin` / `scope_type: platform` only.
 */
export const ADMIN_ROUTE_POLICIES: readonly AdminRoutePolicy[] = [
  {
    id: 'admin_auth_summary_get',
    method: 'GET',
    pathPattern: /^\/saas\/v1\/admin\/auth\/summary$/,
    resource_scope: 'platform',
    allowed_roles: ['platform_admin'],
  },
  {
    id: 'admin_platform_tenants_index_get',
    method: 'GET',
    pathPattern: /^\/saas\/v1\/admin\/platform\/tenants-index$/,
    resource_scope: 'platform',
    allowed_roles: ['platform_admin'],
  },
  {
    id: 'admin_platform_dashboard_get',
    method: 'GET',
    pathPattern: /^\/saas\/v1\/admin\/platform\/dashboard$/,
    resource_scope: 'platform',
    allowed_roles: ['platform_admin'],
  },
  {
    id: 'admin_platform_settings_get',
    method: 'GET',
    pathPattern: /^\/saas\/v1\/admin\/platform\/settings$/,
    resource_scope: 'platform',
    allowed_roles: ['platform_admin'],
  },
  {
    id: 'admin_platform_settings_put',
    method: 'PUT',
    pathPattern: /^\/saas\/v1\/admin\/platform\/settings$/,
    resource_scope: 'platform',
    allowed_roles: ['platform_admin'],
  },
  {
    id: 'admin_platform_logs_get',
    method: 'GET',
    pathPattern: /^\/saas\/v1\/admin\/platform\/logs$/,
    resource_scope: 'platform',
    allowed_roles: ['platform_admin'],
  },
  {
    id: 'admin_platform_deployment_info_get',
    method: 'GET',
    pathPattern: /^\/saas\/v1\/admin\/platform\/deployment-info$/,
    resource_scope: 'platform',
    allowed_roles: ['platform_admin'],
  },
  {
    id: 'admin_tenant_id_principals_audit_get',
    method: 'GET',
    pathPattern: tenantIdPath('/principals/audit'),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin'],
  },
  {
    id: 'admin_tenant_id_principals_put',
    method: 'PUT',
    pathPattern: tenantIdPath('/principals'),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin'],
  },
  {
    id: 'admin_tenant_id_principals_get',
    method: 'GET',
    pathPattern: tenantIdPath('/principals'),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin'],
  },
  {
    id: 'admin_tenant_id_settings_get',
    method: 'GET',
    pathPattern: tenantIdPath('/settings'),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin', 'tenant_operator_readonly'],
  },
  {
    id: 'admin_tenant_id_settings_put',
    method: 'PUT',
    pathPattern: tenantIdPath('/settings'),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin'],
  },
  {
    id: 'admin_tenant_id_faq_put',
    method: 'PUT',
    pathPattern: tenantIdPath('/faq'),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin'],
  },
  {
    id: 'admin_tenant_id_faq_get',
    method: 'GET',
    pathPattern: tenantIdPath('/faq'),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin', 'tenant_operator_readonly'],
  },
  {
    id: 'admin_tenant_id_credentials_put',
    method: 'PUT',
    pathPattern: tenantIdPath('/credentials'),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin'],
  },
  {
    id: 'admin_tenant_id_channels_inspect_get',
    method: 'GET',
    pathPattern: new RegExp(
      `^/saas/v1/admin/(?:platform/tenants|tenant-ids)/${ADMIN_TENANT_ID_SEGMENT}/channels(?:-inspect)?$`,
      'i',
    ),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin', 'tenant_operator_readonly'],
  },
  {
    id: 'admin_tenant_id_website_config_get',
    method: 'GET',
    pathPattern: tenantIdPath('/channels/website/config'),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin', 'tenant_operator_readonly'],
  },
  {
    id: 'admin_tenant_id_website_config_put',
    method: 'PUT',
    pathPattern: tenantIdPath('/channels/website/config'),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin'],
  },
  {
    id: 'admin_tenant_id_website_test_post',
    method: 'POST',
    pathPattern: tenantIdPath('/channels/website/test-widget'),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin'],
  },
  {
    id: 'admin_tenant_id_ai_get',
    method: 'GET',
    pathPattern: tenantIdPath('/ai'),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin', 'tenant_operator_readonly'],
  },
  {
    id: 'admin_tenant_id_ai_put',
    method: 'PUT',
    pathPattern: tenantIdPath('/ai'),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin'],
  },
  {
    id: 'admin_tenant_id_ai_test_post',
    method: 'POST',
    pathPattern: tenantIdPath('/ai/test-connection'),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin'],
  },
  {
    id: 'admin_tenant_id_go_live_run_post',
    method: 'POST',
    pathPattern: tenantIdPath('/go-live-check/run'),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin'],
  },
  {
    id: 'admin_tenant_id_go_live_latest_get',
    method: 'GET',
    pathPattern: tenantIdPath('/go-live-check/latest'),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin', 'tenant_operator_readonly'],
  },
  {
    id: 'admin_tenant_id_overview_get',
    method: 'GET',
    pathPattern: tenantIdPath('/overview'),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin', 'tenant_operator_readonly'],
  },
  {
    id: 'admin_tenant_id_activity_get',
    method: 'GET',
    pathPattern: tenantIdPath('/activity'),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin', 'tenant_operator_readonly'],
  },
  {
    id: 'admin_tenant_id_conversations_get',
    method: 'GET',
    pathPattern: tenantIdPath('/conversations'),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin', 'tenant_operator_readonly'],
  },
  {
    id: 'admin_tenant_id_conversation_get',
    method: 'GET',
    pathPattern: new RegExp(
      `^/saas/v1/admin/(?:platform/tenants|tenant-ids)/${ADMIN_TENANT_ID_SEGMENT}/conversations/[^/]+$`,
      'i',
    ),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin', 'tenant_operator_readonly'],
  },
  {
    id: 'admin_tenant_id_conversation_messages_get',
    method: 'GET',
    pathPattern: new RegExp(
      `^/saas/v1/admin/(?:platform/tenants|tenant-ids)/${ADMIN_TENANT_ID_SEGMENT}/conversations/[^/]+/messages$`,
      'i',
    ),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin', 'tenant_operator_readonly'],
  },
  {
    id: 'admin_tenant_id_conversation_assign_post',
    method: 'POST',
    pathPattern: new RegExp(
      `^/saas/v1/admin/(?:platform/tenants|tenant-ids)/${ADMIN_TENANT_ID_SEGMENT}/conversations/[^/]+/assign$`,
      'i',
    ),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin'],
  },
  {
    id: 'admin_tenant_id_conversation_handoff_post',
    method: 'POST',
    pathPattern: new RegExp(
      `^/saas/v1/admin/(?:platform/tenants|tenant-ids)/${ADMIN_TENANT_ID_SEGMENT}/conversations/[^/]+/handoff$`,
      'i',
    ),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin'],
  },
  {
    id: 'admin_tenant_id_conversation_resolve_post',
    method: 'POST',
    pathPattern: new RegExp(
      `^/saas/v1/admin/(?:platform/tenants|tenant-ids)/${ADMIN_TENANT_ID_SEGMENT}/conversations/[^/]+/resolve$`,
      'i',
    ),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin'],
  },
  {
    id: 'admin_tenant_id_conversation_reopen_post',
    method: 'POST',
    pathPattern: new RegExp(
      `^/saas/v1/admin/(?:platform/tenants|tenant-ids)/${ADMIN_TENANT_ID_SEGMENT}/conversations/[^/]+/reopen$`,
      'i',
    ),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin'],
  },
  {
    id: 'admin_tenant_id_conversation_convert_post',
    method: 'POST',
    pathPattern: new RegExp(
      `^/saas/v1/admin/(?:platform/tenants|tenant-ids)/${ADMIN_TENANT_ID_SEGMENT}/conversations/[^/]+/convert-to-lead$`,
      'i',
    ),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin'],
  },
  {
    id: 'admin_tenant_id_leads_get',
    method: 'GET',
    pathPattern: tenantIdPath('/leads'),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin', 'tenant_operator_readonly'],
  },
  {
    id: 'admin_tenant_id_lead_get',
    method: 'GET',
    pathPattern: new RegExp(
      `^/saas/v1/admin/(?:platform/tenants|tenant-ids)/${ADMIN_TENANT_ID_SEGMENT}/leads/[^/]+$`,
      'i',
    ),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin', 'tenant_operator_readonly'],
  },
  {
    id: 'admin_tenant_id_lead_assign_post',
    method: 'POST',
    pathPattern: new RegExp(
      `^/saas/v1/admin/(?:platform/tenants|tenant-ids)/${ADMIN_TENANT_ID_SEGMENT}/leads/[^/]+/assign$`,
      'i',
    ),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin'],
  },
  {
    id: 'admin_tenant_id_lead_status_post',
    method: 'POST',
    pathPattern: new RegExp(
      `^/saas/v1/admin/(?:platform/tenants|tenant-ids)/${ADMIN_TENANT_ID_SEGMENT}/leads/[^/]+/status$`,
      'i',
    ),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin'],
  },
  {
    id: 'admin_tenant_id_reports_summary_get',
    method: 'GET',
    pathPattern: tenantIdPath('/reports/summary'),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin', 'tenant_operator_readonly'],
  },
  {
    id: 'admin_tenant_id_suspend_post',
    method: 'POST',
    pathPattern: tenantIdPath('/suspend'),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin'],
  },
  {
    id: 'admin_tenant_id_activate_post',
    method: 'POST',
    pathPattern: tenantIdPath('/activate'),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin'],
  },
  {
    id: 'admin_tenant_id_knowledge_get',
    method: 'GET',
    pathPattern: tenantIdPath('/knowledge'),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin', 'tenant_operator_readonly'],
  },
  {
    id: 'admin_tenant_id_knowledge_post',
    method: 'POST',
    pathPattern: tenantIdPath('/knowledge'),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin'],
  },
  {
    id: 'admin_tenant_id_knowledge_import_post',
    method: 'POST',
    pathPattern: tenantIdPath('/knowledge/import'),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin'],
  },
  {
    id: 'admin_tenant_id_knowledge_entry_put',
    method: 'PUT',
    pathPattern: new RegExp(
      `^/saas/v1/admin/(?:platform/tenants|tenant-ids)/${ADMIN_TENANT_ID_SEGMENT}/knowledge/[^/]+$`,
      'i',
    ),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin', 'tenant_operator_readonly'],
  },
  {
    id: 'admin_tenant_id_knowledge_enable_post',
    method: 'POST',
    pathPattern: new RegExp(
      `^/saas/v1/admin/(?:platform/tenants|tenant-ids)/${ADMIN_TENANT_ID_SEGMENT}/knowledge/[^/]+/enable$`,
      'i',
    ),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin', 'tenant_operator_readonly'],
  },
  {
    id: 'admin_tenant_id_knowledge_disable_post',
    method: 'POST',
    pathPattern: new RegExp(
      `^/saas/v1/admin/(?:platform/tenants|tenant-ids)/${ADMIN_TENANT_ID_SEGMENT}/knowledge/[^/]+/disable$`,
      'i',
    ),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin', 'tenant_operator_readonly'],
  },
  {
    id: 'admin_tenant_id_channel_selftest_post',
    method: 'POST',
    pathPattern: new RegExp(
      `^/saas/v1/admin/(?:platform/tenants|tenant-ids)/${ADMIN_TENANT_ID_SEGMENT}/channels/[^/]+/(?:selftest|test)$`,
      'i',
    ),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin'],
  },
  {
    id: 'admin_tenant_id_channel_disconnect_post',
    method: 'POST',
    pathPattern: new RegExp(
      `^/saas/v1/admin/(?:platform/tenants|tenant-ids)/${ADMIN_TENANT_ID_SEGMENT}/channels/[^/]+/disconnect$`,
      'i',
    ),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin'],
  },
  {
    id: 'admin_tenant_id_get',
    method: 'GET',
    pathPattern: tenantIdPath(''),
    resource_scope: 'tenant_targeted',
    allowed_roles: ['platform_admin', 'tenant_admin', 'tenant_operator_readonly'],
  },
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

export function resolveAdminRouteTargetTenantId(pathname: string): string | null {
  const m = pathname.match(
    new RegExp(
      `^/saas/v1/admin/(?:platform/tenants|tenant-ids)/(${ADMIN_TENANT_ID_SEGMENT})(?:/|$)`,
      'i',
    ),
  );
  if (!m) return null;
  return m[1].trim().toLowerCase();
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

export type ResolveTenantSlugById = (tenantId: string) => Promise<{ slug: string } | null>;

/**
 * After authentication: enforce allowed_roles + tenant scope for tenant_targeted routes.
 * Unlisted paths under `/saas/v1/admin/` fall through without 403 here.
 */
export async function authorizeAdminRouteAfterAuth(
  method: string,
  pathname: string,
  context: SaasAdminAuthContext,
  resolveTenantSlugById: ResolveTenantSlugById,
): Promise<{ ok: true } | { ok: false; reason: 'forbidden' }> {
  const policy = matchAdminRoutePolicy(method, pathname);
  if (!policy) return { ok: true };

  if (!isRoleAllowedForAdminPolicy(policy, context.role)) {
    return { ok: false, reason: 'forbidden' };
  }

  if (policy.resource_scope === 'platform') {
    return { ok: true };
  }

  const targetSlug = resolveAdminRouteTargetTenantSlug(pathname);
  if (targetSlug) {
    if (!doesAdminScopeMatchRouteTarget(context, targetSlug)) {
      return { ok: false, reason: 'forbidden' };
    }
    return { ok: true };
  }

  const targetId = resolveAdminRouteTargetTenantId(pathname);
  if (targetId) {
    if (context.role === 'platform_admin') {
      return { ok: true };
    }
    const row = await resolveTenantSlugById(targetId);
    if (!row) {
      return { ok: false, reason: 'forbidden' };
    }
    if (!doesAdminScopeMatchRouteTarget(context, row.slug)) {
      return { ok: false, reason: 'forbidden' };
    }
    return { ok: true };
  }

  return { ok: false, reason: 'forbidden' };
}
