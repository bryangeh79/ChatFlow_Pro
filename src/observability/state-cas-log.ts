/**
 * Phase D-C1 — structured log when tenant_*_state CAS upsert conflicts.
 */

import { observabilityFingerprint, writeStructuredLog } from './structured-log';

export type StateCasLayer = 'session_state' | 'processing_state' | 'delivery_state';

export function logStateCasConflict(input: {
  layer: StateCasLayer;
  tenant_id: string;
  session_id: string;
  channel?: string | null;
}): void {
  writeStructuredLog({
    type: 'state_cas_conflict',
    phase: 'pipeline',
    outcome: 'cas_conflict',
    code: input.layer,
    tenant_id: input.tenant_id,
    channel: input.channel ?? null,
    session_fp: observabilityFingerprint(input.session_id),
  });
}
