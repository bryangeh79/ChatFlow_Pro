/**
 * Phase 24 / 1D — tenant-scoped RBAC semantics via authorizeAdminRouteAfterAuth. Run after: npm run build
 */

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const authz = require(join(root, 'dist', 'src', 'saas', 'admin-authorization.js'));

const { authorizeAdminRouteAfterAuth } = authz;

const ACME_UUID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

/** Maps only the fixture UUID → acme slug (no DB). */
async function mockResolveTenantSlugById(id) {
  if (id === ACME_UUID) return { slug: 'acme' };
  return null;
}

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

async function mustAllow(c, method, path) {
  const r = await authorizeAdminRouteAfterAuth(method, path, c, mockResolveTenantSlugById);
  if (!r.ok) {
    console.error('expected allow', { method, path, c: c.role, slug: c.tenant_slug }, r);
    process.exit(1);
  }
}

async function mustDeny(c, method, path) {
  const r = await authorizeAdminRouteAfterAuth(method, path, c, mockResolveTenantSlugById);
  if (r.ok) {
    console.error('expected deny', { method, path, c: c.role, slug: c.tenant_slug });
    process.exit(1);
  }
}

async function main() {
  const routes = [
    ['GET', '/saas/v1/admin/auth/summary'],
    ['GET', '/saas/v1/admin/platform/tenants-index'],
    ['GET', '/saas/v1/admin/platform/dashboard'],
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
    [`GET`, `/saas/v1/admin/platform/tenants/${ACME_UUID}`],
    [`GET`, `/saas/v1/admin/platform/tenants/${ACME_UUID}/settings`],
    [`PUT`, `/saas/v1/admin/platform/tenants/${ACME_UUID}/settings`],
    [`GET`, `/saas/v1/admin/platform/tenants/${ACME_UUID}/faq`],
    [`POST`, `/saas/v1/admin/platform/tenants/${ACME_UUID}/channels/telegram/test`],
  ];

  for (const [method, path] of routes) {
    await mustAllow(platformAdmin, method, path);
  }

  await mustDeny(tenantAdminAcme, 'GET', '/saas/v1/admin/auth/summary');
  await mustDeny(tenantAdminAcme, 'GET', '/saas/v1/admin/tenants');
  await mustDeny(tenantAdminAcme, 'POST', '/saas/v1/admin/tenants');
  await mustDeny(tenantAdminAcme, 'GET', '/saas/v1/admin/platform/tenants-index');
  await mustAllow(tenantAdminAcme, 'GET', '/saas/v1/admin/tenants/acme');
  await mustDeny(tenantAdminAcme, 'GET', '/saas/v1/admin/tenants/acme/principals');
  await mustDeny(tenantAdminAcme, 'GET', '/saas/v1/admin/tenants/acme/principals/audit');
  await mustDeny(tenantAdminAcme, 'PUT', '/saas/v1/admin/tenants/acme/principals');
  await mustDeny(tenantAdminAcme, 'GET', '/saas/v1/admin/tenants/other-corp');
  await mustAllow(tenantAdminAcme, 'PUT', '/saas/v1/admin/tenants/acme/credentials');
  await mustDeny(tenantAdminAcme, 'PUT', '/saas/v1/admin/tenants/other-corp/credentials');
  await mustAllow(tenantAdminAcme, 'GET', '/saas/v1/admin/tenants/acme/faq');
  await mustDeny(tenantAdminAcme, 'GET', '/saas/v1/admin/tenants/other-corp/faq');
  await mustAllow(tenantAdminAcme, 'PUT', '/saas/v1/admin/tenants/acme/faq');
  await mustAllow(tenantAdminAcme, 'PUT', '/saas/v1/admin/tenants/acme/settings');

  await mustAllow(tenantAdminAcme, 'GET', `/saas/v1/admin/platform/tenants/${ACME_UUID}`);
  await mustAllow(tenantAdminAcme, 'GET', `/saas/v1/admin/platform/tenants/${ACME_UUID}/settings`);
  await mustAllow(tenantAdminAcme, 'PUT', `/saas/v1/admin/platform/tenants/${ACME_UUID}/settings`);
  await mustAllow(tenantAdminAcme, 'POST', `/saas/v1/admin/platform/tenants/${ACME_UUID}/channels/telegram/test`);
  await mustDeny(tenantAdminAcme, 'GET', '/saas/v1/admin/platform/tenants/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/settings');

  await mustDeny(readonlyAcme, 'GET', '/saas/v1/admin/auth/summary');
  await mustDeny(readonlyAcme, 'GET', '/saas/v1/admin/tenants');
  await mustDeny(readonlyAcme, 'POST', '/saas/v1/admin/tenants');
  await mustAllow(readonlyAcme, 'GET', '/saas/v1/admin/tenants/acme');
  await mustDeny(readonlyAcme, 'GET', '/saas/v1/admin/tenants/acme/principals');
  await mustDeny(readonlyAcme, 'GET', '/saas/v1/admin/tenants/acme/principals/audit');
  await mustDeny(readonlyAcme, 'PUT', '/saas/v1/admin/tenants/acme/principals');
  await mustDeny(readonlyAcme, 'GET', '/saas/v1/admin/tenants/other-corp');
  await mustDeny(readonlyAcme, 'PUT', '/saas/v1/admin/tenants/acme/credentials');
  await mustDeny(readonlyAcme, 'PUT', '/saas/v1/admin/tenants/acme/faq');
  await mustDeny(readonlyAcme, 'PUT', '/saas/v1/admin/tenants/acme/settings');
  await mustAllow(readonlyAcme, 'GET', '/saas/v1/admin/tenants/acme/faq');
  await mustAllow(readonlyAcme, 'GET', `/saas/v1/admin/platform/tenants/${ACME_UUID}/settings`);
  await mustDeny(readonlyAcme, 'PUT', `/saas/v1/admin/platform/tenants/${ACME_UUID}/settings`);

  await mustDeny(readonlyOther, 'GET', '/saas/v1/admin/tenants/acme');
  await mustDeny(readonlyOther, 'GET', '/saas/v1/admin/tenants/acme/faq');

  console.log(JSON.stringify({ ok: true, tenant_scope_checks: true }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

