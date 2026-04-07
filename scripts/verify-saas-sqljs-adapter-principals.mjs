/**
 * Phase 24 / 2B — sql.js SaaSDbAdapter wiring for principals + audit (no Postgres).
 * Requires: npm run build
 */

import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join as pathJoin } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = pathJoin(__dirname, '..');

const tmpDir = mkdtempSync(pathJoin(tmpdir(), 'cf-saas-adapter-p-'));
const dbFile = pathJoin(tmpDir, 'saas.sqlite');
process.env.CHATFLOW_SAAS_DB_PATH = dbFile;

const require = createRequire(import.meta.url);
const repo = require(pathJoin(root, 'dist', 'src', 'saas', 'repository.js'));
const dbMod = require(pathJoin(root, 'dist', 'src', 'saas', 'db.js'));

const actor = {
  actor_auth_source: 'break_glass_env',
  actor_role: 'platform_admin',
  actor_scope_type: 'platform',
  actor_tenant_slug: null,
};

function fail(msg) {
  console.error(msg);
  rmSync(tmpDir, { recursive: true, force: true });
  process.exit(1);
}

function runBreakGlassSample(extraEnv) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [pathJoin(root, 'scripts', 'verify-saas-admin-auth-break-glass.mjs')], {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, ...extraEnv },
    });
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`verify-saas-admin-auth-break-glass exited ${code}`)),
    );
  });
}

async function main() {
  const suffix = Date.now();
  const slug = `adp${suffix}`;
  const tok1 = `adp-one-${suffix}`;
  const tok2 = `adp-two-${suffix}`;

  const tenant = await repo.createTenant(slug, 'adapter tenant');
  if (!tenant?.id) fail('createTenant failed');

  await repo.replaceTenantAdminPrincipals(
    tenant.id,
    [{ role: 'tenant_admin', bridge_token: tok1, is_enabled: true, display_name: 'd1' }],
    actor,
  );

  let list = await repo.listTenantAdminPrincipals(tenant.id);
  if (list.length !== 1) fail(`expected 1 principal, got ${list.length}`);
  if (list[0].token_state !== 'hash_at_rest') fail('expected hash_at_rest after replace');
  if (!list[0].has_token) fail('expected has_token');

  let auth = await repo.findEnabledPrincipalByBridgeToken(tok1);
  if (!auth || auth.tenant_slug !== slug) fail('findEnabledPrincipalByBridgeToken (hash path) failed');

  let logs = await repo.listTenantPrincipalAuditLogs(tenant.id, 50);
  if (!logs.some((e) => e.action === 'created')) fail('audit missing created');

  await repo.replaceTenantAdminPrincipals(
    tenant.id,
    [{ role: 'tenant_admin', bridge_token: tok2, is_enabled: true, display_name: 'd2' }],
    actor,
  );
  logs = await repo.listTenantPrincipalAuditLogs(tenant.id, 50);
  if (!logs.some((e) => e.action === 'rotated')) fail('audit missing rotated');

  const cnt = await repo.countAllTenantAdminPrincipals();
  if (cnt < 1) fail('countAllTenantAdminPrincipals too low');

  const slugB = `leg${suffix}`;
  const tenantB = await repo.createTenant(slugB, 'legacy tenant');
  const db = await dbMod.getSaaSDatabase();
  const legId = randomUUID();
  const legSecret = `legacy-plain-${suffix}`;
  db.run(
    `INSERT INTO tenant_admin_principals (id, tenant_id, role, bridge_token, bridge_token_hash, is_enabled, display_name, created_at, updated_at)
     VALUES (?, ?, 'tenant_admin', ?, NULL, 1, NULL, datetime('now'), datetime('now'))`,
    [legId, tenantB.id, legSecret],
  );
  dbMod.persistSaaSDatabase();

  auth = await repo.findEnabledPrincipalByBridgeToken(legSecret);
  if (!auth || auth.tenant_slug !== slugB) fail('lazy legacy migrate via adapter failed');

  list = await repo.listTenantAdminPrincipals(tenantB.id);
  if (list.length !== 1 || list[0].token_state !== 'hash_at_rest') fail('expected hash_at_rest after lazy migrate');

  const bgTok = `adapter-bg-${suffix}`;
  await runBreakGlassSample({ CHATFLOW_SAAS_ADMIN_TOKEN: bgTok });

  rmSync(tmpDir, { recursive: true, force: true });
  console.log('verify-saas-sqljs-adapter-principals: ok');
}

main().catch((e) => {
  console.error(e);
  rmSync(tmpDir, { recursive: true, force: true });
  process.exit(1);
});
