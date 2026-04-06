/**
 * Phase 24 / 1B — SaaS admin auth abstraction; break-glass env token only.
 *
 * Env: CHATFLOW_SAAS_ADMIN_TOKEN
 * Optional: VERIFY_CHATFLOW_PORT (default 3099)
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const token = process.env.CHATFLOW_SAAS_ADMIN_TOKEN?.trim();
if (!token) {
  console.error('CHATFLOW_SAAS_ADMIN_TOKEN is required');
  process.exit(1);
}

const chatflowPort = Number(process.env.VERIFY_CHATFLOW_PORT || '3099');
const base = `http://127.0.0.1:${chatflowPort}`;
const auth = `Bearer ${token}`;

async function main() {
  const child = spawn(process.execPath, [join(root, 'dist', 'src', 'index.js')], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(chatflowPort),
      CHATFLOW_SAAS_ADMIN_TOKEN: token,
    },
    stdio: 'inherit',
  });

  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${base}/health`);
      if (r.ok) break;
    } catch {
      /* wait */
    }
    await new Promise((r) => setTimeout(r, 200));
    if (child.exitCode !== null) {
      console.error('server exited early');
      process.exit(1);
    }
  }

  const hPublic = await fetch(`${base}/saas/v1/health`);
  if (!hPublic.ok) {
    child.kill();
    console.error('expected GET /saas/v1/health without Bearer to succeed', hPublic.status);
    process.exit(1);
  }

  const adminPage = await fetch(`${base}/saas/admin`);
  if (!adminPage.ok) {
    child.kill();
    console.error('expected GET /saas/admin without Bearer to succeed', adminPage.status);
    process.exit(1);
  }

  const noAuth = await fetch(`${base}/saas/v1/admin/tenants`);
  if (noAuth.status !== 401) {
    child.kill();
    console.error('expected GET /saas/v1/admin/tenants without Bearer → 401, got', noAuth.status);
    process.exit(1);
  }

  const okAuth = await fetch(`${base}/saas/v1/admin/tenants`, {
    headers: { authorization: auth },
  });
  if (okAuth.status === 401) {
    child.kill();
    console.error('expected GET /saas/v1/admin/tenants with valid Bearer not to be 401');
    process.exit(1);
  }

  child.kill();
  await new Promise((r) => child.once('exit', r));

  console.log(JSON.stringify({ ok: true, health_public: true, admin_page_public: true, tenants_401_without_auth: true, tenants_not_401_with_auth: true }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
