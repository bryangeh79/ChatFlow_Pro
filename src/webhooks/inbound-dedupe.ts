import type { UnifiedInboundMessage } from '../../shared/types/unified-inbound-message';
import { observabilityFingerprint, writeStructuredLog } from '../observability/structured-log';
import { beginInboundDedupe, markInboundDedupeCompleted } from '../saas/inbound-dedupe-repository';

export interface InboundDedupeGuard {
  duplicateResponse?: {
    ok: true;
    duplicate: true;
    dedupe_status: 'completed' | 'processing';
    http_status: 200 | 202;
  };
  completeIfAccepted(): Promise<void>;
}

export async function guardInboundDedupe(message: UnifiedInboundMessage): Promise<InboundDedupeGuard> {
  const begin = await beginInboundDedupe(message);
  writeStructuredLog({
    type: 'inbound_dedupe_decision',
    phase: 'inbound',
    outcome: begin.decision,
    tenant_id: begin.tenant_id,
    channel: begin.channel,
    idempotency_key_fp: begin.idempotency_key ? observabilityFingerprint(begin.idempotency_key) : null,
  });
  if (begin.decision === 'accepted' && begin.tenant_id && begin.idempotency_key) {
    return {
      async completeIfAccepted() {
        await markInboundDedupeCompleted({
          tenant_id: begin.tenant_id!,
          channel: begin.channel,
          idempotency_key: begin.idempotency_key!,
        });
      },
    };
  }
  if (begin.decision === 'duplicate_completed') {
    return {
      duplicateResponse: {
        ok: true,
        duplicate: true,
        dedupe_status: 'completed',
        http_status: 200,
      },
      async completeIfAccepted() {},
    };
  }
  if (begin.decision === 'duplicate_processing') {
    return {
      duplicateResponse: {
        ok: true,
        duplicate: true,
        dedupe_status: 'processing',
        http_status: 202,
      },
      async completeIfAccepted() {},
    };
  }
  return {
    async completeIfAccepted() {},
  };
}
