import { getSaaSDbDriver, getSaasDbAdapter } from './db-adapter';
import { getTenantIdOrNull } from './tenant-context';

export type NotifyDedupeDecision = 'accepted' | 'duplicate_completed' | 'duplicate_processing' | 'bypass';

export interface BeginNotifyDedupeResult {
  decision: NotifyDedupeDecision;
  tenant_id: string | null;
  event_type: string;
  idempotency_key: string | null;
  version: number | null;
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function beginNotifyDedupe(input: {
  event_type: string;
  idempotency_key: string;
}): Promise<BeginNotifyDedupeResult> {
  const tenantId = getTenantIdOrNull();
  if (!tenantId || getSaaSDbDriver() !== 'postgres') {
    return {
      decision: 'bypass',
      tenant_id: tenantId,
      event_type: input.event_type,
      idempotency_key: null,
      version: null,
    };
  }
  const adapter = await getSaasDbAdapter();
  const now = nowIso();
  const inserted = await adapter.queryOne(
    `INSERT INTO tenant_notify_dedupe (
       tenant_id, event_type, idempotency_key, status, version, first_seen_at, last_seen_at, completed_at
     ) VALUES (?, ?, ?, 'processing', 1, ?, ?, NULL)
     ON CONFLICT (tenant_id, event_type, idempotency_key)
     DO NOTHING
     RETURNING version`,
    [tenantId, input.event_type, input.idempotency_key, now, now],
  );
  if (inserted) {
    return {
      decision: 'accepted',
      tenant_id: tenantId,
      event_type: input.event_type,
      idempotency_key: input.idempotency_key,
      version: Number(inserted.version ?? 1),
    };
  }
  const row = await adapter.queryOne(
    `SELECT status, version
       FROM tenant_notify_dedupe
      WHERE tenant_id = ? AND event_type = ? AND idempotency_key = ?`,
    [tenantId, input.event_type, input.idempotency_key],
  );
  const status = String(row?.status ?? 'processing');
  const version = Number(row?.version ?? 1);
  if (status === 'completed') {
    return {
      decision: 'duplicate_completed',
      tenant_id: tenantId,
      event_type: input.event_type,
      idempotency_key: input.idempotency_key,
      version,
    };
  }
  return {
    decision: 'duplicate_processing',
    tenant_id: tenantId,
    event_type: input.event_type,
    idempotency_key: input.idempotency_key,
    version,
  };
}

export async function completeNotifyDedupeWithCas(input: {
  tenant_id: string;
  event_type: string;
  idempotency_key: string;
  expected_version: number;
}): Promise<{ ok: true; version: number } | { ok: false; reason: 'cas_conflict' }> {
  const adapter = await getSaasDbAdapter();
  const now = nowIso();
  const updated = await adapter.queryOne(
    `UPDATE tenant_notify_dedupe
        SET status = 'completed',
            version = version + 1,
            last_seen_at = ?,
            completed_at = ?
      WHERE tenant_id = ?
        AND event_type = ?
        AND idempotency_key = ?
        AND version = ?
      RETURNING version`,
    [now, now, input.tenant_id, input.event_type, input.idempotency_key, input.expected_version],
  );
  if (!updated) return { ok: false, reason: 'cas_conflict' };
  return { ok: true, version: Number(updated.version ?? input.expected_version + 1) };
}
