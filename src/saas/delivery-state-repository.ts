import { logStateCasConflict } from '../observability/state-cas-log';
import type { UnifiedSendResult } from '../../shared/types/unified-send-result';
import { getSaasDbAdapter } from './db-adapter';

export interface TenantDeliveryStatePayload {
  status: UnifiedSendResult['status'];
  retryable: boolean;
  provider_message_id: string | null;
  error_code: string | null;
  request_id: string | null;
  message_trace_id: string;
  completed_at: string;
}

export interface TenantDeliveryStateRow {
  tenant_id: string;
  session_id: string;
  channel: UnifiedSendResult['channel'];
  delivery_status: string;
  state: TenantDeliveryStatePayload;
  version: number;
  updated_at: string;
}

export type UpsertTenantDeliveryStateResult =
  | { ok: true; version: number }
  | { ok: false; reason: 'cas_conflict' };

function nowIso(): string {
  return new Date().toISOString();
}

function parsePayload(raw: unknown): TenantDeliveryStatePayload | null {
  if (typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw) as TenantDeliveryStatePayload;
  } catch {
    return null;
  }
}

export async function getTenantDeliveryState(
  tenantId: string,
  sessionId: string,
): Promise<TenantDeliveryStateRow | null> {
  const adapter = await getSaasDbAdapter();
  const row = await adapter.queryOne(
    `SELECT tenant_id, session_id, channel, delivery_status, state_json, version, updated_at
       FROM tenant_delivery_state
      WHERE tenant_id = ? AND session_id = ?`,
    [tenantId, sessionId],
  );
  if (!row) return null;
  const payload = parsePayload(row.state_json);
  if (!payload) return null;
  return {
    tenant_id: String(row.tenant_id),
    session_id: String(row.session_id),
    channel: String(row.channel) as UnifiedSendResult['channel'],
    delivery_status: String(row.delivery_status),
    state: payload,
    version: Number(row.version ?? 0),
    updated_at: String(row.updated_at ?? nowIso()),
  };
}

export async function upsertTenantDeliveryStateWithCas(input: {
  tenant_id: string;
  session_id: string;
  channel: UnifiedSendResult['channel'];
  delivery_status: string;
  state: TenantDeliveryStatePayload;
  expected_version: number | null;
}): Promise<UpsertTenantDeliveryStateResult> {
  const adapter = await getSaasDbAdapter();
  const payload = JSON.stringify(input.state);
  const updatedAt = nowIso();
  if (input.expected_version === null) {
    const inserted = await adapter.queryOne(
      `INSERT INTO tenant_delivery_state (
         tenant_id, session_id, channel, delivery_status, state_json, version, updated_at
       ) VALUES (?, ?, ?, ?, ?, 1, ?)
       ON CONFLICT (tenant_id, session_id)
       DO NOTHING
       RETURNING version`,
      [input.tenant_id, input.session_id, input.channel, input.delivery_status, payload, updatedAt],
    );
    if (!inserted) {
      logStateCasConflict({
        layer: 'delivery_state',
        tenant_id: input.tenant_id,
        session_id: input.session_id,
        channel: input.channel,
      });
      return { ok: false, reason: 'cas_conflict' };
    }
    return { ok: true, version: Number(inserted.version ?? 1) };
  }
  const updated = await adapter.queryOne(
    `UPDATE tenant_delivery_state
        SET channel = ?,
            delivery_status = ?,
            state_json = ?,
            version = version + 1,
            updated_at = ?
      WHERE tenant_id = ?
        AND session_id = ?
        AND version = ?
      RETURNING version`,
    [
      input.channel,
      input.delivery_status,
      payload,
      updatedAt,
      input.tenant_id,
      input.session_id,
      input.expected_version,
    ],
  );
  if (!updated) {
    logStateCasConflict({
      layer: 'delivery_state',
      tenant_id: input.tenant_id,
      session_id: input.session_id,
      channel: input.channel,
    });
    return { ok: false, reason: 'cas_conflict' };
  }
  return { ok: true, version: Number(updated.version ?? input.expected_version + 1) };
}
