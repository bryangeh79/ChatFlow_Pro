import { randomUUID } from 'node:crypto';
import { getSaaSDatabase, persistSaaSDatabase } from '../dist/src/saas/db.js';

const tenantId = process.env.TENANT_ID?.trim();
if (!tenantId) {
  throw new Error('TENANT_ID missing');
}

const db = await getSaaSDatabase();
const chk = db.prepare('SELECT id FROM tenants WHERE id = ?');
chk.bind([tenantId]);
const ok = chk.step();
chk.free();
if (!ok) {
  throw new Error('tenant_not_found');
}

const now = new Date().toISOString();
const convId = randomUUID();
const msgId = randomUUID();
db.run(
  `INSERT INTO conversations
   (id, tenant_id, channel, external_contact_id, customer_name, customer_phone, customer_email, status, current_owner_principal_id, source_message_id, inquiry_summary, last_message_at, resolved_at, created_at, updated_at)
   VALUES (?, ?, 'website', ?, 'PhaseC Seed User', '+10000000000', 'seed@example.com', 'open', NULL, ?, 'Need pricing details', ?, NULL, ?, ?)`,
  [convId, tenantId, `seed-contact-${Date.now()}`, msgId, now, now, now],
);
db.run(
  `INSERT INTO messages
   (id, tenant_id, conversation_id, direction, sender_type, sender_display_name, body, metadata_json, created_at)
   VALUES (?, ?, ?, 'inbound', 'customer', 'Seed Customer', 'Hello, I need pricing info.', '{}', ?)`,
  [msgId, tenantId, convId, now],
);
persistSaaSDatabase();
console.log(JSON.stringify({ ok: true, conversation_id: convId, message_id: msgId }));
