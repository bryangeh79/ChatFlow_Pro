import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  createTenant,
  getTenantBySlug,
  listTenants,
  loadTenantFaqEntries,
  mergeTenantCredentials,
  mergeTenantSettings,
  replaceTenantFaqEntries,
} from './repository';
import { getSaaSDbPathForDisplay } from './db';

function adminToken(): string | undefined {
  return process.env.CHATFLOW_SAAS_ADMIN_TOKEN?.trim() || undefined;
}

function unauthorized(): { status: number; body: unknown } {
  return { status: 401, body: { ok: false, error: 'unauthorized' } };
}

function requireAdmin(authHeader: string | undefined): boolean {
  const t = adminToken();
  if (!t) return false;
  const expected = `Bearer ${t}`;
  return authHeader === expected;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function handleSaaSAdminRequest(
  method: string,
  pathname: string,
  bodyText: string,
  authHeader: string | undefined,
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
        admin_configured: Boolean(adminToken()),
      },
    };
  }

  if (pathname.startsWith('/saas/v1/admin/') && !requireAdmin(authHeader)) {
    return unauthorized();
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

  return { status: 404, body: { ok: false, error: 'saas_route_not_found' } };
}
