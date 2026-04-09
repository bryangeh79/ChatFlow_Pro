import type { UnifiedResponse } from '../../shared/types/unified-response';
import { observabilityFingerprint, writeStructuredLog } from '../observability/structured-log';
import { getSaaSDbDriver, getSaasDbAdapter } from './db-adapter';
import { getTenantIdOrNull } from './tenant-context';

export type OutboundDedupeDecision = 'accepted' | 'duplicate_completed' | 'duplicate_processing' | 'bypass';

export interface BeginOutboundDedupeResult {
  decision: OutboundDedupeDecision;
  tenant_id: string | null;
  channel: UnifiedResponse['channel'];
  idempotency_key: string | null;
  version: number | null;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function buildOutboundIdempotencyKey(response: UnifiedResponse): string {
  const traceId =
    (response.debug_metadata?.message_trace_id as string | undefined)?.trim() ||
    `no_trace:${response.session_id}`;
  return `outbound:${response.channel}:${response.session_id}:${traceId}`;
}

export async function beginOutboundDedupe(response: UnifiedResponse): Promise<BeginOutboundDedupeResult> {
  const tenantId = getTenantIdOrNull();
  if (!tenantId || getSaaSDbDriver() !== 'postgres') {
    return { decision: 'bypass', tenant_id: tenantId, channel: response.channel, idempotency_key: null, version: null };
  }
  const idempotencyKey = buildOutboundIdempotencyKey(response);
  const messageTraceId =
    (response.debug_metadata?.message_trace_id as string | undefined)?.trim() || `no_trace:${response.session_id}`;
  const now = nowIso();
  const adapter = await getSaasDbAdapter();
  const inserted = await adapter.queryOne(
    `INSERT INTO tenant_outbound_dedupe (
       tenant_id, channel, idempotency_key, session_id, message_trace_id, status, version, first_seen_at, last_seen_at, completed_at
     ) VALUES (?, ?, ?, ?, ?, 'processing', 1, ?, ?, NULL)
     ON CONFLICT (tenant_id, channel, idempotency_key)
     DO NOTHING
     RETURNING version`,
    [tenantId, response.channel, idempotencyKey, response.session_id, messageTraceId, now, now],
  );
  let result: BeginOutboundDedupeResult;
  if (inserted) {
    result = {
      decision: 'accepted',
      tenant_id: tenantId,
      channel: response.channel,
      idempotency_key: idempotencyKey,
      version: Number(inserted.version ?? 1),
    };
  } else {
    const existing = await adapter.queryOne(
      `SELECT status, version
         FROM tenant_outbound_dedupe
        WHERE tenant_id = ? AND channel = ? AND idempotency_key = ?`,
      [tenantId, response.channel, idempotencyKey],
    );
    const status = String(existing?.status ?? 'processing');
    const version = Number(existing?.version ?? 1);
    if (status === 'completed') {
      result = {
        decision: 'duplicate_completed',
        tenant_id: tenantId,
        channel: response.channel,
        idempotency_key: idempotencyKey,
        version,
      };
    } else {
      result = {
        decision: 'duplicate_processing',
        tenant_id: tenantId,
        channel: response.channel,
        idempotency_key: idempotencyKey,
        version,
      };
    }
  }

  writeStructuredLog({
    type: 'outbound_dedupe_decision',
    phase: 'outbound',
    outcome: result.decision,
    tenant_id: result.tenant_id,
    channel: result.channel,
    idempotency_key_fp: result.idempotency_key ? observabilityFingerprint(result.idempotency_key) : null,
    session_fp: observabilityFingerprint(response.session_id),
    message_trace_id: (response.debug_metadata?.message_trace_id as string | undefined) ?? null,
    request_id: (response.debug_metadata?.request_id as string | undefined) ?? null,
  });
  return result;
}

export async function completeOutboundDedupeWithCas(input: {
  tenant_id: string;
  channel: UnifiedResponse['channel'];
  idempotency_key: string;
  expected_version: number;
}): Promise<{ ok: true; version: number } | { ok: false; reason: 'cas_conflict' }> {
  const adapter = await getSaasDbAdapter();
  const now = nowIso();
  const updated = await adapter.queryOne(
    `UPDATE tenant_outbound_dedupe
        SET status = 'completed',
            version = version + 1,
            last_seen_at = ?,
            completed_at = ?
      WHERE tenant_id = ?
        AND channel = ?
        AND idempotency_key = ?
        AND version = ?
      RETURNING version`,
    [now, now, input.tenant_id, input.channel, input.idempotency_key, input.expected_version],
  );
  if (!updated) return { ok: false, reason: 'cas_conflict' };
  return { ok: true, version: Number(updated.version ?? input.expected_version + 1) };
}
