/**
 * Phase D-C2B2 — break-glass TTL audit rows (DB only; no secrets / no bearer plaintext).
 */

import { randomUUID } from 'node:crypto';
import { logGovernanceBreakGlassClosed } from '../observability/governance-audit-closure';
import { getSaasDbAdapter } from './db-adapter';

export type BreakGlassAuditAction =
  | 'break_glass_ttl_enabled'
  | 'break_glass_ttl_denied_expired'
  | 'break_glass_ttl_denied_misconfigured';

export async function insertBreakGlassAuditEvent(input: {
  action: BreakGlassAuditAction;
  expires_at_iso?: string | null;
  request_id?: string | null;
  detail?: Record<string, unknown> | null;
}): Promise<void> {
  const adapter = await getSaasDbAdapter();
  const id = randomUUID();
  const tsIso = new Date().toISOString();
  const detailJson = input.detail && Object.keys(input.detail).length > 0 ? JSON.stringify(input.detail) : null;
  await adapter.execute(
    `INSERT INTO break_glass_audit_events (id, action, ts_iso, expires_at_iso, request_id, detail_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.action,
      tsIso,
      input.expires_at_iso ?? null,
      input.request_id ?? null,
      detailJson,
    ],
  );
  await adapter.persistIfNeeded();

  logGovernanceBreakGlassClosed({
    break_glass_audit_id: id,
    action: input.action,
    expires_at_iso: input.expires_at_iso ?? null,
    request_id: input.request_id ?? null,
  });
}

let enabledAuditEmittedThisProcess = false;

export function resetBreakGlassTtlEnabledAuditDedupeForTests(): void {
  enabledAuditEmittedThisProcess = false;
}

export async function maybeAuditBreakGlassTtlEnabled(input: {
  expires_at_iso: string;
  request_id?: string | null;
}): Promise<void> {
  if (enabledAuditEmittedThisProcess) return;
  enabledAuditEmittedThisProcess = true;
  await insertBreakGlassAuditEvent({
    action: 'break_glass_ttl_enabled',
    expires_at_iso: input.expires_at_iso,
    request_id: input.request_id ?? null,
    detail: { gate: 'ttl_ok' },
  });
}
