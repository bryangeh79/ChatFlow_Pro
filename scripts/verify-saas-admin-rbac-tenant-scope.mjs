/**
 * Phase 24 / 1D — tenant-scoped RBAC semantics via authorizeAdminRouteAfterAuth (pure). Run after: npm run build
 */

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const authz = require(join(root, 'dist', 'src', 'saas', 'admin-authorization.js'));

const { authorizeAdminRouteAfterAuth } = authz;

function ctx(partial) {
  return {
    auth_source: 'break_glass_env',
    tenant_id: null,
    ...partial,
  };
}

const platformAdmin = ctx({
  role: 'platform_admin',
  scope_type: 'platform',
});

const tenantAdminAcme = ctx({
  role: 'tenant_admin',
  scope_type: 'tenant',
  tenant_slug: 'acme',
});

const tenantAdminOther = ctx({
  role: 'tenant_admin',
  scope_type: 'tenant',
  tenant_slug: 'other-corp',
});

const readonlyAcme = ctx({
  role: 'tenant_operator_readonly',
  scope_type: 'tenant',
  tenant_slug: 'acme',
});

const readonlyOther = ctx({
  role: 'tenant_operator_readonly',
  scope_type: 'tenant',
  tenant_slug: 'other-corp',
});

function mustAllow(c, method, path) {
  const r = authorizeAdminRouteAfterAuth(method, path, c);
  if (!r.ok) {
    console.error('expected allow', { method, path, c: c.role, slug: c.tenant_slug }, r);
    process.exit(1);
  }
}

function mustDeny(c, method, path) {
  const r = authorizeAdminRouteAfterAuth(method, path, c);
  if (r.ok) {
    console.error('expected deny', { method, path, c: c.role, slug: c.tenant_slug });
    process.exit(1);
  }
}

function main() {
  const routes = [
    ['GET', '/saas/v1/admin/auth/summary'],
    ['GET', '/saas/v1/admin/tenants'],
    ['POST', '/saas/v1/admin/tenants'],
    ['GET', '/saas/v1/admin/tenants/acme'],
    ['GET', '/saas/v1/admin/tenants/other-corp'],
    ['GET', '/saas/v1/admin/tenants/acme/principals'],
    ['GET', '/saas/v1/admin/tenants/acme/principals/audit'],
    ['PUT', '/saas/v1/admin/tenants/acme/principals'],
    ['PUT', '/saas/v1/admin/tenants/acme/credentials'],
    ['PUT', '/saas/v1/admin/tenants/other-corp/credentials'],
    ['GET', '/saas/v1/admin/tenants/acme/faq'],
    ['GET', '/saas/v1/admin/tenants/other-corp/faq'],
    ['PUT', '/saas/v1/admin/tenants/acme/faq'],
    ['PUT', '/saas/v1/admin/tenants/acme/settings'],
  ];

  for (const [method, path] of routes) {
    mustAllow(platformAdmin, method, path);
  }

  mustDeny(tenantAdminAcme, 'GET', '/saas/v1/admin/auth/summary');
  mustDeny(tenantAdminAcme, 'GET', '/saas/v1/admin/tenants');
  mustDeny(tenantAdminAcme, 'POST', '/saas/v1/admin/tenants');
  mustAllow(tenantAdminAcme, 'GET', '/saas/v1/admin/tenants/acme');
  mustDeny(tenantAdminAcme, 'GET', '/saas/v1/admin/tenants/acme/principals');
  mustDeny(tenantAdminAcme, 'GET', '/saas/v1/admin/tenants/acme/principals/audit');
  mustDeny(tenantAdminAcme, 'PUT', '/saas/v1/admin/tenants/acme/principals');
  mustDeny(tenantAdminAcme, 'GET', '/saas/v1/admin/tenants/other-corp');
  mustAllow(tenantAdminAcme, 'PUT', '/saas/v1/admin/tenants/acme/credentials');
  mustDeny(tenantAdminAcme, 'PUT', '/saas/v1/admin/tenants/other-corp/credentials');
  mustAllow(tenantAdminAcme, 'GET', '/saas/v1/admin/tenants/acme/faq');
  mustDeny(tenantAdminAcme, 'GET', '/saas/v1/admin/tenants/other-corp/faq');
  mustAllow(tenantAdminAcme, 'PUT', '/saas/v1/admin/tenants/acme/faq');
  mustAllow(tenantAdminAcme, 'PUT', '/saas/v1/admin/tenants/acme/settings');

  mustDeny(readonlyAcme, 'GET', '/saas/v1/admin/auth/summary');
  mustDeny(readonlyAcme, 'GET', '/saas/v1/admin/tenants');
  mustDeny(readonlyAcme, 'POST', '/saas/v1/admin/tenants');
  mustAllow(readonlyAcme, 'GET', '/saas/v1/admin/tenants/acme');
  mustDeny(readonlyAcme, 'GET', '/saas/v1/admin/tenants/acme/principals');
  mustDeny(readonlyAcme, 'GET', '/saas/v1/admin/tenants/acme/principals/audit');
  mustDeny(readonlyAcme, 'PUT', '/saas/v1/admin/tenants/acme/principals');
  mustDeny(readonlyAcme, 'GET', '/saas/v1/admin/tenants/other-corp');
  mustDeny(readonlyAcme, 'PUT', '/saas/v1/admin/tenants/acme/credentials');
  mustDeny(readonlyAcme, 'PUT', '/saas/v1/admin/tenants/acme/faq');
  mustDeny(readonlyAcme, 'PUT', '/saas/v1/admin/tenants/acme/settings');
  mustAllow(readonlyAcme, 'GET', '/saas/v1/admin/tenants/acme/faq');

  mustDeny(readonlyOther, 'GET', '/saas/v1/admin/tenants/acme');
  mustDeny(readonlyOther, 'GET', '/saas/v1/admin/tenants/acme/faq');

  console.log(JSON.stringify({ ok: true, tenant_scope_checks: true }));
}

main();
