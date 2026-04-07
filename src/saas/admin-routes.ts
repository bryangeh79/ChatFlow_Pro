import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  createTenant,
  getTenantBySlug,
  listTenants,
  listTenantAdminPrincipals,
  listTenantPrincipalAuditLogs,
  loadTenantFaqEntries,
  mergeTenantCredentials,
  mergeTenantSettings,
  replaceTenantAdminPrincipals,
  replaceTenantFaqEntries,
} from './repository';
import type { TenantPrincipalRole } from './repository';
import { getSaaSDbPathForDisplay } from './db';
import { breakGlassAdminToken, requireSaasAdmin } from './admin-auth';
import type { SaasAdminAuthContext } from './admin-auth';
import { authorizeAdminRouteAfterAuth } from './admin-authorization';
import type { PrincipalReplaceActorFields } from './principal-audit';

function unauthorized(): { status: number; body: unknown } {
  return { status: 401, body: { ok: false, error: 'unauthorized' } };
}

function forbidden(): { status: number; body: unknown } {
  return { status: 403, body: { ok: false, error: 'forbidden' } };
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function toPrincipalActor(ctx: SaasAdminAuthContext): PrincipalReplaceActorFields {
  return {
    actor_auth_source: ctx.auth_source,
    actor_role: ctx.role,
    actor_scope_type: ctx.scope_type,
    actor_tenant_slug: ctx.tenant_slug ?? null,
  };
}

function parseAuditLogLimit(searchParams: URLSearchParams | undefined): number {
  const raw = searchParams?.get('limit');
  if (raw == null || raw === '') return 50;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return 50;
  return Math.min(n, 200);
}

export async function handleSaaSAdminRequest(
  method: string,
  pathname: string,
  bodyText: string,
  authHeader: string | undefined,
  searchParams?: URLSearchParams,
): Promise<{ status: number; body: unknown; contentType?: string } | null> {
  if (!pathname.startsWith('/saas/')) {
    return null;
  }

  if (pathname === '/saas/admin' || pathname === '/saas/admin/') {
    const htmlPath = path.join(process.cwd(), 'public', 'saas-admin.html');
    if (!fs.existsSync(htmlPath)) {
      return { status: 404, body: { ok: false, error: 'dashboard_missing' } };
    }
    const html = fs.readFileSync(htmlPath, 'utf8');
    return { status: 200, body: html, contentType: 'text/html; charset=utf-8' };
  }

  if (pathname === '/saas/v1/health' && method === 'GET') {
    return {
      status: 200,
      body: {
        ok: true,
        saas: true,
        db_path: getSaaSDbPathForDisplay(),
        admin_configured: Boolean(breakGlassAdminToken()),
      },
    };
  }

  let saasAdminContext: SaasAdminAuthContext | undefined;
  if (pathname.startsWith('/saas/v1/admin/')) {
    const authResult = await requireSaasAdmin(authHeader);
    if (!authResult.ok) return unauthorized();
    const authz = authorizeAdminRouteAfterAuth(method, pathname, authResult.context);
    if (!authz.ok) return forbidden();
    saasAdminContext = authResult.context;
  }

  if (pathname === '/saas/v1/admin/tenants' && method === 'GET') {
    const tenants = await listTenants();
    return { status: 200, body: { ok: true, tenants } };
  }

  if (pathname === '/saas/v1/admin/tenants' && method === 'POST') {
    const parsed = parseJson(bodyText) as { slug?: string; name?: string } | null;
    if (!parsed?.slug || !parsed?.name) {
      return { status: 400, body: { ok: false, error: 'slug_and_name_required' } };
    }
    const slug = String(parsed.slug).trim().toLowerCase();
    const name = String(parsed.name).trim();
    if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(slug)) {
      return { status: 400, body: { ok: false, error: 'invalid_slug' } };
    }
    const existing = await getTenantBySlug(slug);
    if (existing) {
      return { status: 409, body: { ok: false, error: 'slug_exists' } };
    }
    const tenant = await createTenant(slug, name);
    return { status: 201, body: { ok: true, tenant } };
  }

  const tenantGet = pathname.match(/^\/saas\/v1\/admin\/tenants\/([^/]+)$/);
  if (tenantGet && method === 'GET') {
    const slug = tenantGet[1];
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    return { status: 200, body: { ok: true, tenant } };
  }

  const credPut = pathname.match(/^\/saas\/v1\/admin\/tenants\/([^/]+)\/credentials$/);
  if (credPut && method === 'PUT') {
    const slug = credPut[1];
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const parsed = parseJson(bodyText) as { credentials?: Record<string, string> } | null;
    if (!parsed?.credentials || typeof parsed.credentials !== 'object') {
      return { status: 400, body: { ok: false, error: 'credentials_object_required' } };
    }
    await mergeTenantCredentials(tenant.id, parsed.credentials);
    return { status: 200, body: { ok: true } };
  }

  const faqGet = pathname.match(/^\/saas\/v1\/admin\/tenants\/([^/]+)\/faq$/);
  if (faqGet && method === 'GET') {
    const slug = faqGet[1];
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const entries = await loadTenantFaqEntries(tenant.id);
    return { status: 200, body: { ok: true, entries } };
  }

  if (faqGet && method === 'PUT') {
    const slug = faqGet[1];
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const parsed = parseJson(bodyText) as {
      entries?: Array<{
        id: string;
        language: string;
        topic: string;
        question: string;
        answer: string;
        keywords?: string[];
        tags?: string[];
        is_active?: boolean;
      }>;
    } | null;
    if (!parsed?.entries || !Array.isArray(parsed.entries)) {
      return { status: 400, body: { ok: false, error: 'entries_array_required' } };
    }
    await replaceTenantFaqEntries(tenant.id, parsed.entries);
    return { status: 200, body: { ok: true } };
  }

  const settingsPut = pathname.match(/^\/saas\/v1\/admin\/tenants\/([^/]+)\/settings$/);
  if (settingsPut && method === 'PUT') {
    const slug = settingsPut[1];
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const parsed = parseJson(bodyText) as { settings?: Record<string, unknown> } | null;
    if (!parsed?.settings || typeof parsed.settings !== 'object') {
      return { status: 400, body: { ok: false, error: 'settings_object_required' } };
    }
    await mergeTenantSettings(tenant.id, parsed.settings);
    return { status: 200, body: { ok: true } };
  }

  const principalsAuditPath = pathname.match(/^\/saas\/v1\/admin\/tenants\/([^/]+)\/principals\/audit$/);
  if (principalsAuditPath && method === 'GET') {
    const slug = principalsAuditPath[1];
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const limit = parseAuditLogLimit(searchParams);
    const entries = await listTenantPrincipalAuditLogs(tenant.id, limit);
    return { status: 200, body: { ok: true, entries } };
  }

  const principalsPath = pathname.match(/^\/saas\/v1\/admin\/tenants\/([^/]+)\/principals$/);
  if (principalsPath && method === 'GET') {
    const slug = principalsPath[1];
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const principals = await listTenantAdminPrincipals(tenant.id);
    return { status: 200, body: { ok: true, principals } };
  }

  if (principalsPath && method === 'PUT') {
    const slug = principalsPath[1];
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const parsed = parseJson(bodyText) as { principals?: unknown } | null;
    if (!parsed || !Array.isArray(parsed.principals)) {
      return { status: 400, body: { ok: false, error: 'principals_array_required' } };
    }
    const items: Array<{
      role: TenantPrincipalRole;
      bridge_token: string;
      is_enabled: boolean;
      display_name?: string;
    }> = [];
    const seenTokens = new Set<string>();
    for (const row of parsed.principals) {
      if (typeof row !== 'object' || row === null) {
        return { status: 400, body: { ok: false, error: 'invalid_principal_row' } };
      }
      const o = row as Record<string, unknown>;
      const role = o.role;
      if (role !== 'tenant_admin' && role !== 'tenant_operator_readonly') {
        return { status: 400, body: { ok: false, error: 'invalid_principal_role' } };
      }
      const bridge_token = typeof o.bridge_token === 'string' ? o.bridge_token.trim() : '';
      if (!bridge_token) {
        return { status: 400, body: { ok: false, error: 'bridge_token_required' } };
      }
      if (seenTokens.has(bridge_token)) {
        return { status: 400, body: { ok: false, error: 'duplicate_bridge_token' } };
      }
      seenTokens.add(bridge_token);
      const is_enabled = o.is_enabled === true || o.is_enabled === 1;
      const display_name =
        o.display_name === undefined || o.display_name === null
          ? undefined
          : String(o.display_name).trim() || undefined;
      items.push({ role, bridge_token, is_enabled, display_name });
    }
    if (!saasAdminContext) {
      return { status: 401, body: { ok: false, error: 'unauthorized' } };
    }
    try {
      await replaceTenantAdminPrincipals(tenant.id, items, toPrincipalActor(saasAdminContext));
    } catch {
      return { status: 409, body: { ok: false, error: 'principal_persist_conflict' } };
    }
    return { status: 200, body: { ok: true } };
  }

  return { status: 404, body: { ok: false, error: 'saas_route_not_found' } };
}
