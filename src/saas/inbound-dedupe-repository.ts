import { createHash } from 'node:crypto';
import type { UnifiedInboundMessage } from '../../shared/types/unified-inbound-message';
import { getSaaSDbDriver, getSaasDbAdapter } from './db-adapter';
import { getTenantIdOrNull } from './tenant-context';

export type InboundDedupeDecision = 'accepted' | 'duplicate_completed' | 'duplicate_processing' | 'bypass';

export interface BeginInboundDedupeResult {
  decision: InboundDedupeDecision;
  tenant_id: string | null;
  channel: UnifiedInboundMessage['channel'];
  idempotency_key: string | null;
}

function nowIso(): string {
  return new Date().toISOString();
}

function isPlaceholderMessageId(id: string | undefined | null): boolean {
  if (!id) return true;
  const t = id.trim().toLowerCase();
  return t === '' || t === 'unknown' || t === 'website-generated-id';
}

function canonicalInboundFallback(message: UnifiedInboundMessage): string {
  return [
    message.channel,
    message.external_user_id ?? '',
    message.external_session_id ?? '',
    message.timestamp ?? '',
    message.message_type ?? '',
    message.text ?? '',
  ].join('|');
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function buildInboundIdempotencyKey(message: UnifiedInboundMessage): {
  idempotency_key: string;
  provider_message_id: string | null;
} {
  const providerId = isPlaceholderMessageId(message.message_id) ? null : String(message.message_id);
  if (providerId) {
    return {
      idempotency_key: `pmid:${providerId}`,
      provider_message_id: providerId,
    };
  }
  const digest = sha256Hex(canonicalInboundFallback(message));
  return {
    idempotency_key: `fallback:${digest}`,
    provider_message_id: null,
  };
}

export async function beginInboundDedupe(message: UnifiedInboundMessage): Promise<BeginInboundDedupeResult> {
  const tenantId = getTenantIdOrNull();
  if (!tenantId) {
    return { decision: 'bypass', tenant_id: null, channel: message.channel, idempotency_key: null };
  }
  if (getSaaSDbDriver() !== 'postgres') {
    return { decision: 'bypass', tenant_id: tenantId, channel: message.channel, idempotency_key: null };
  }
  const { idempotency_key, provider_message_id } = buildInboundIdempotencyKey(message);
  const adapter = await getSaasDbAdapter();
  const now = nowIso();
  const inserted = await adapter.queryOne(
    `INSERT INTO tenant_inbound_dedupe (
       tenant_id, channel, idempotency_key, provider_message_id, status, first_seen_at, last_seen_at, completed_at
     ) VALUES (?, ?, ?, ?, 'processing', ?, ?, NULL)
     ON CONFLICT (tenant_id, channel, idempotency_key)
     DO NOTHING
     RETURNING status`,
    [tenantId, message.channel, idempotency_key, provider_message_id, now, now],
  );
  if (inserted) {
    return { decision: 'accepted', tenant_id: tenantId, channel: message.channel, idempotency_key };
  }
  const existing = await adapter.queryOne(
    `SELECT status
       FROM tenant_inbound_dedupe
      WHERE tenant_id = ? AND channel = ? AND idempotency_key = ?`,
    [tenantId, message.channel, idempotency_key],
  );
  if (String(existing?.status ?? 'processing') === 'completed') {
    return { decision: 'duplicate_completed', tenant_id: tenantId, channel: message.channel, idempotency_key };
  }
  return { decision: 'duplicate_processing', tenant_id: tenantId, channel: message.channel, idempotency_key };
}

export async function markInboundDedupeCompleted(input: {
  tenant_id: string;
  channel: UnifiedInboundMessage['channel'];
  idempotency_key: string;
}): Promise<void> {
  const adapter = await getSaasDbAdapter();
  const now = nowIso();
  await adapter.execute(
    `UPDATE tenant_inbound_dedupe
        SET status = 'completed',
            last_seen_at = ?,
            completed_at = ?
      WHERE tenant_id = ?
        AND channel = ?
        AND idempotency_key = ?`,
    [now, now, input.tenant_id, input.channel, input.idempotency_key],
  );
}
