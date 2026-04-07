/**
 * Phase 24 — policy table shape + routing match (pure). Run after: npm run build
 */

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const authz = require(join(root, 'dist', 'src', 'saas', 'admin-authorization.js'));

const {
  ADMIN_ROUTE_POLICIES,
  matchAdminRoutePolicy,
  isRoleAllowedForAdminPolicy,
} = authz;

const EXPECTED_POLICY_IDS = [
  'admin_tenant_settings_put',
  'admin_tenant_faq_put',
  'admin_tenant_faq_get',
  'admin_tenant_credentials_put',
  'admin_tenant_get',
  'admin_tenants_list_get',
  'admin_tenants_create_post',
];

const SAMPLES = [
  ['GET', '/saas/v1/admin/tenants', 'admin_tenants_list_get'],
  ['POST', '/saas/v1/admin/tenants', 'admin_tenants_create_post'],
  ['GET', '/saas/v1/admin/tenants/acme', 'admin_tenant_get'],
  ['PUT', '/saas/v1/admin/tenants/acme/credentials', 'admin_tenant_credentials_put'],
  ['GET', '/saas/v1/admin/tenants/acme/faq', 'admin_tenant_faq_get'],
  ['PUT', '/saas/v1/admin/tenants/acme/faq', 'admin_tenant_faq_put'],
  ['PUT', '/saas/v1/admin/tenants/acme/settings', 'admin_tenant_settings_put'],
];

function main() {
  const ids = ADMIN_ROUTE_POLICIES.map((p) => p.id).sort();
  const exp = [...EXPECTED_POLICY_IDS].sort();
  if (ids.length !== exp.length || ids.some((x, i) => x !== exp[i])) {
    console.error('policy id set mismatch', { ids, exp });
    process.exit(1);
  }

  for (const [method, path, expectedId] of SAMPLES) {
    const p = matchAdminRoutePolicy(method, path);
    if (!p || p.id !== expectedId) {
      console.error('matchAdminRoutePolicy mismatch', method, path, p?.id, expectedId);
      process.exit(1);
    }
  }

  for (const p of ADMIN_ROUTE_POLICIES) {
    if (!p.resource_scope || !['platform', 'tenant_targeted'].includes(p.resource_scope)) {
      console.error('policy missing resource_scope', p.id);
      process.exit(1);
    }
    if (!isRoleAllowedForAdminPolicy(p, 'platform_admin')) {
      console.error('platform_admin must be allowed for', p.id);
      process.exit(1);
    }
    if (p.resource_scope === 'platform') {
      if (isRoleAllowedForAdminPolicy(p, 'tenant_admin') || isRoleAllowedForAdminPolicy(p, 'tenant_operator_readonly')) {
        console.error('platform route must not allow tenant roles', p.id);
        process.exit(1);
      }
    }
    if (p.method === 'PUT' && isRoleAllowedForAdminPolicy(p, 'tenant_operator_readonly')) {
      console.error('tenant_operator_readonly must be denied on PUT', p.id);
      process.exit(1);
    }
    if (p.resource_scope === 'tenant_targeted' && p.method === 'GET') {
      if (!isRoleAllowedForAdminPolicy(p, 'tenant_operator_readonly')) {
        console.error('tenant-targeted GET must allow tenant_operator_readonly', p.id);
        process.exit(1);
      }
    }
  }

  console.log(
    JSON.stringify({
      ok: true,
      policies: ADMIN_ROUTE_POLICIES.length,
      platform_admin_all: true,
      platform_routes_platform_only: true,
      readonly_put_denied: true,
    }),
  );
}

main();
