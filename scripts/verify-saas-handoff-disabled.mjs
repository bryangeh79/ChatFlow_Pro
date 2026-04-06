/**
 * Phase 22B — minimal check: tenant with handoff.enabled=false does not enter handoff on keyword.
 *
 * Requires: server running with same CHATFLOW_SAAS_ADMIN_TOKEN as this process.
 *   CHATFLOW_SAAS_ADMIN_TOKEN=... node dist/src/index.js
 *   npm run verify:saas-handoff-disabled
 *
 * Optional: VERIFY_BASE_URL (default http://127.0.0.1:3030)
 */

const BASE = (process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3030').replace(/\/$/, '');
const token = process.env.CHATFLOW_SAAS_ADMIN_TOKEN?.trim();
if (!token) {
  console.error('CHATFLOW_SAAS_ADMIN_TOKEN is required');
  process.exit(1);
}

const slug = `handoff-off-${Date.now()}`;
const auth = `Bearer ${token}`;

async function main() {
  const r1 = await fetch(`${BASE}/saas/v1/admin/tenants`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: auth },
    body: JSON.stringify({ slug, name: 'Handoff off verify' }),
  });
  if (!r1.ok) {
    console.error('create tenant failed', r1.status, await r1.text());
    process.exit(1);
  }

  const r2 = await fetch(`${BASE}/saas/v1/admin/tenants/${encodeURIComponent(slug)}/settings`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', authorization: auth },
    body: JSON.stringify({ settings: { handoff: { enabled: false } } }),
  });
  if (!r2.ok) {
    console.error('put settings failed', r2.status, await r2.text());
    process.exit(1);
  }

  const tgBody = {
    update_id: 900000001,
    message: {
      message_id: 1,
      from: { id: 111222333, is_bot: false, first_name: 'V', last_name: 'Test' },
      chat: { id: 111222333, first_name: 'V', last_name: 'Test', type: 'private' },
      date: Math.floor(Date.now() / 1000),
      text: '我需要人工客服',
    },
  };

  const r3 = await fetch(`${BASE}/webhooks/t/${encodeURIComponent(slug)}/telegram`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(tgBody),
  });

  const raw = await r3.text();
  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    console.error('webhook non-json', r3.status, raw.slice(0, 500));
    process.exit(1);
  }

  if (!json.ok) {
    console.error('webhook ok:false', json);
    process.exit(1);
  }

  const hs = json.session?.handoff_state;
  const hr = json.response?.handoff_required;
  const sc = json.response?.debug_metadata?.saas_control;

  if (hs?.status !== 'none') {
    console.error('expected handoff_state.status none, got', hs);
    process.exit(1);
  }
  if (hr !== false) {
    console.error('expected handoff_required false, got', hr);
    process.exit(1);
  }
  if (!sc?.tenant_runtime_settings_injected || sc.handoff_enabled_effective !== false) {
    console.error('unexpected saas_control', sc);
    process.exit(1);
  }
  if (sc.handoff_trigger_suppressed !== true) {
    console.error('expected handoff_trigger_suppressed true, got', sc);
    process.exit(1);
  }

  console.log(JSON.stringify({ ok: true, slug, saas_control: sc }, null, 0));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
