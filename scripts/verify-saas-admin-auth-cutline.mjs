/**
 * Phase 24 / 1J — auth source registry cutline + GET /saas/v1/admin/auth/summary (no secrets).
 */

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join as pathJoin } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = pathJoin(__dirname, '..');

const src = require(pathJoin(root, 'dist', 'src', 'saas', 'admin-auth-sources.js'));

const {
  SAAS_ADMIN_AUTH_SOURCE_IDS,
  SAAS_ADMIN_AUTH_SOURCE_REGISTRY,
  BRIDGE_SAAS_ADMIN_AUTH_SOURCE_IDS,
} = src;

const breakToken =
  process.env.CHATFLOW_SAAS_ADMIN_TOKEN?.trim() ||
  `verify-cutline-bg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const chatflowPort = Number(process.env.VERIFY_CHATFLOW_PORT || '3105');
const base = `http://127.0.0.1:${chatflowPort}`;

function waitChildExit(child) {
  return new Promise((resolve) => child.once('exit', resolve));
}

async function waitForHealth() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${base}/health`);
      if (r.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('health timeout');
}

function mainRegistry() {
  if (!Array.isArray(SAAS_ADMIN_AUTH_SOURCE_IDS) || SAAS_ADMIN_AUTH_SOURCE_IDS.length !== 4) {
    console.error('expected SAAS_ADMIN_AUTH_SOURCE_IDS length 4');
    process.exit(1);
  }
  for (const id of SAAS_ADMIN_AUTH_SOURCE_IDS) {
    const m = SAAS_ADMIN_AUTH_SOURCE_REGISTRY[id];
    if (!m || m.id !== id) {
      console.error('missing metadata for', id);
      process.exit(1);
    }
    if (!m.intended_scope || typeof m.deprecation_candidate !== 'boolean') {
      console.error('incomplete metadata', id, m);
      process.exit(1);
    }
  }

  const bridgeSet = new Set(BRIDGE_SAAS_ADMIN_AUTH_SOURCE_IDS);
  for (const id of BRIDGE_SAAS_ADMIN_AUTH_SOURCE_IDS) {
    if (SAAS_ADMIN_AUTH_SOURCE_REGISTRY[id].stability !== 'bridge') {
      console.error('BRIDGE list must be stability bridge', id);
      process.exit(1);
    }
  }
  if (SAAS_ADMIN_AUTH_SOURCE_REGISTRY.break_glass_env.stability !== 'break_glass') {
    console.error('break_glass_env must be break_glass');
    process.exit(1);
  }
  if (SAAS_ADMIN_AUTH_SOURCE_REGISTRY.tenant_bridge_db.stability !== 'bridge') {
    console.error('tenant_bridge_db must be bridge');
    process.exit(1);
  }
  for (const id of ['tenant_bridge_env', 'tenant_readonly_bridge_env']) {
    if (SAAS_ADMIN_AUTH_SOURCE_REGISTRY[id].stability !== 'bridge') {
      console.error(id, 'must be bridge');
      process.exit(1);
    }
  }
  if (bridgeSet.size !== 3) {
    console.error('expected 3 bridge source ids');
    process.exit(1);
  }
}

async function mainHttp() {
  const child = spawn(process.execPath, [pathJoin(root, 'dist', 'src', 'index.js')], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(chatflowPort),
      CHATFLOW_SAAS_ADMIN_TOKEN: breakToken,
      CHATFLOW_SAAS_TENANT_ADMIN_TOKENS: '',
      CHATFLOW_SAAS_TENANT_READONLY_TOKENS: '',
    },
    stdio: 'inherit',
  });

  try {
    await waitForHealth();
  } catch (e) {
    child.kill();
    await waitChildExit(child);
    throw e;
  }

  const r401 = await fetch(`${base}/saas/v1/admin/auth/summary`);
  if (r401.status !== 401) {
    child.kill();
    await waitChildExit(child);
    console.error('expected 401 without auth', r401.status);
    process.exit(1);
  }

  const r = await fetch(`${base}/saas/v1/admin/auth/summary`, {
    headers: { authorization: `Bearer ${breakToken}` },
  });
  const j = await r.json();
  if (!r.ok) {
    child.kill();
    await waitChildExit(child);
    console.error('summary failed', r.status, j);
    process.exit(1);
  }

  const raw = JSON.stringify(j);
  if (raw.includes(breakToken)) {
    child.kill();
    await waitChildExit(child);
    console.error('summary leaked break token');
    process.exit(1);
  }
  if (!j.break_glass_present || !Array.isArray(j.auth_sources) || j.auth_sources.length !== 4) {
    child.kill();
    await waitChildExit(child);
    console.error('unexpected summary shape', j);
    process.exit(1);
  }
  if (!Array.isArray(j.bridge_source_ids) || j.bridge_source_ids.length !== 3) {
    child.kill();
    await waitChildExit(child);
    console.error('bridge_source_ids', j.bridge_source_ids);
    process.exit(1);
  }

  child.kill();
  await waitChildExit(child);
}

async function main() {
  mainRegistry();
  await mainHttp();
  console.log(
    JSON.stringify({
      ok: true,
      registry_complete: true,
      bridge_tagged: true,
      break_glass_tagged: true,
      summary_api_ok: true,
      no_token_leak: true,
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
