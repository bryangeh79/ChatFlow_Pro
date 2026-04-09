/**
 * Phase D-C1 — structured milestones for notify path (no notify body / secrets in logs).
 */

import { observabilityFingerprint, writeStructuredLog } from './structured-log';

export type NotifyKind = 'handoff' | 'lead';

export function logNotifyDedupeDecision(input: {
  notify_kind: NotifyKind;
  decision: string;
  tenant_id: string | null;
  event_type: string;
  idempotency_key: string | null;
  channel: string | null;
  request_id?: string | null;
  message_trace_id?: string | null;
  session_id?: string | null;
}): void {
  writeStructuredLog({
    type: 'notify_milestone',
    phase: 'notify',
    outcome: input.decision,
    code: input.notify_kind,
    tenant_id: input.tenant_id,
    channel: input.channel,
    event_type: input.event_type,
    idempotency_key_fp: input.idempotency_key ? observabilityFingerprint(input.idempotency_key) : null,
    session_fp: input.session_id ? observabilityFingerprint(input.session_id) : null,
    request_id: input.request_id ?? null,
    message_trace_id: input.message_trace_id ?? null,
  });
}

export function logNotifyDispatchStep(input: {
  notify_kind: NotifyKind;
  outcome: string;
  tenant_id: string | null;
  channel: string | null;
  event_type: string;
  idempotency_key: string | null;
  http_status?: number | null;
  request_id?: string | null;
  message_trace_id?: string | null;
  session_id?: string | null;
}): void {
  writeStructuredLog({
    type: 'notify_milestone',
    phase: 'notify',
    outcome: input.outcome,
    code: input.notify_kind,
    tenant_id: input.tenant_id,
    channel: input.channel,
    event_type: input.event_type,
    idempotency_key_fp: input.idempotency_key ? observabilityFingerprint(input.idempotency_key) : null,
    session_fp: input.session_id ? observabilityFingerprint(input.session_id) : null,
    http_status: input.http_status ?? null,
    request_id: input.request_id ?? null,
    message_trace_id: input.message_trace_id ?? null,
  });
}

export function logNotifyDedupeCasConflict(input: {
  notify_kind: NotifyKind;
  tenant_id: string;
  event_type: string;
  idempotency_key: string;
  channel: string | null;
  request_id?: string | null;
  message_trace_id?: string | null;
  session_id?: string | null;
}): void {
  writeStructuredLog({
    type: 'notify_dedupe_cas_conflict',
    phase: 'notify',
    outcome: 'cas_conflict',
    code: input.notify_kind,
    tenant_id: input.tenant_id,
    channel: input.channel,
    event_type: input.event_type,
    idempotency_key_fp: observabilityFingerprint(input.idempotency_key),
    session_fp: input.session_id ? observabilityFingerprint(input.session_id) : null,
    request_id: input.request_id ?? null,
    message_trace_id: input.message_trace_id ?? null,
  });
}
