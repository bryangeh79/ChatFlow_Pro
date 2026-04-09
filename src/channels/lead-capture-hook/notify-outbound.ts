import { fetch } from 'undici';
import type { CapturedLeadRecord } from './captured-lead-record';
import { loadLeadNotifySecret, loadLeadNotifyUrl } from '../../config/lead-notify';
import { beginNotifyDedupe, completeNotifyDedupeWithCas } from '../../saas/notify-dedupe-repository';
import { emitOpsAlert } from '../../observability/ops-alert';
import {
  logNotifyDedupeCasConflict,
  logNotifyDedupeDecision,
  logNotifyDispatchStep,
} from '../../observability/notify-milestone-log';
import { observabilityFingerprint } from '../../observability/structured-log';

export interface NotifyDispatchResult {
  sent: boolean;
  duplicate?: true;
  dedupe_status?: 'completed' | 'processing';
  http_status?: 200 | 202 | 409;
}

/**
 * Fire-and-forget POST of the same JSON shape as one JSONL line in `data/local-captured-leads.jsonl`.
 * Does nothing when CHATFLOW_LEAD_NOTIFY_URL is unset. Never throws; logs failures only.
 */
export function scheduleLeadCaptureNotify(record: CapturedLeadRecord): void {
  void dispatchLeadCaptureNotifyWithDedupe(record);
}

export async function dispatchLeadCaptureNotifyWithDedupe(
  record: CapturedLeadRecord,
): Promise<NotifyDispatchResult> {
  const begin = await beginNotifyDedupe({
    event_type: record.event_type,
    idempotency_key: record.idempotency_key,
  });
  const idemKeyForLog = begin.idempotency_key ?? record.idempotency_key;
  logNotifyDedupeDecision({
    notify_kind: 'lead',
    decision: begin.decision,
    tenant_id: begin.tenant_id,
    event_type: begin.event_type,
    idempotency_key: idemKeyForLog,
    channel: record.channel,
    request_id: record.request_id ?? null,
    message_trace_id: record.message_trace_id ?? null,
    session_id: record.session_id,
  });
  if (begin.decision === 'duplicate_completed') {
    return { sent: false, duplicate: true, dedupe_status: 'completed', http_status: 200 };
  }
  if (begin.decision === 'duplicate_processing') {
    return { sent: false, duplicate: true, dedupe_status: 'processing', http_status: 202 };
  }

  const url = loadLeadNotifyUrl();
  if (!url) {
    logNotifyDispatchStep({
      notify_kind: 'lead',
      outcome: 'skipped_no_url',
      tenant_id: begin.tenant_id,
      channel: record.channel,
      event_type: begin.event_type,
      idempotency_key: idemKeyForLog,
      request_id: record.request_id ?? null,
      message_trace_id: record.message_trace_id ?? null,
      session_id: record.session_id,
    });
    return { sent: false };
  }

  const secret = loadLeadNotifySecret();
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'user-agent': 'ChatFlow-Pro/lead-notify',
  };
  if (secret) {
    headers['x-chatflow-lead-notify-secret'] = secret;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(record),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      logNotifyDispatchStep({
        notify_kind: 'lead',
        outcome: 'http_error',
        tenant_id: begin.tenant_id,
        channel: record.channel,
        event_type: begin.event_type,
        idempotency_key: idemKeyForLog,
        http_status: res.status,
        request_id: record.request_id ?? null,
        message_trace_id: record.message_trace_id ?? null,
        session_id: record.session_id,
      });
      // eslint-disable-next-line no-console
      console.error(`[LeadNotify] HTTP ${res.status} from notify endpoint`);
      return { sent: false };
    }
    logNotifyDispatchStep({
      notify_kind: 'lead',
      outcome: 'http_ok',
      tenant_id: begin.tenant_id,
      channel: record.channel,
      event_type: begin.event_type,
      idempotency_key: idemKeyForLog,
      http_status: res.status,
      request_id: record.request_id ?? null,
      message_trace_id: record.message_trace_id ?? null,
      session_id: record.session_id,
    });
    if (begin.decision === 'accepted' && begin.tenant_id && begin.idempotency_key && begin.version !== null) {
      const completed = await completeNotifyDedupeWithCas({
        tenant_id: begin.tenant_id,
        event_type: begin.event_type,
        idempotency_key: begin.idempotency_key,
        expected_version: begin.version,
      });
      if (!completed.ok) {
        logNotifyDedupeCasConflict({
          notify_kind: 'lead',
          tenant_id: begin.tenant_id,
          event_type: begin.event_type,
          idempotency_key: begin.idempotency_key,
          channel: record.channel,
          message_trace_id: record.message_trace_id ?? null,
          request_id: record.request_id ?? null,
          session_id: record.session_id,
        });
        emitOpsAlert({
          severity: 'P2',
          code: 'notify_dedupe_cas_conflict',
          message: 'Lead notify HTTP succeeded but notify dedupe CAS failed',
          tenant_id: begin.tenant_id,
          channel: record.channel,
          phase: 'notify',
          message_trace_id: record.message_trace_id ?? null,
          request_id: record.request_id ?? null,
          context: {
            event_type: begin.event_type,
            idempotency_key_fp: observabilityFingerprint(begin.idempotency_key),
            notify: 'lead',
          },
        });
        // eslint-disable-next-line no-console
        console.error('[LeadNotify] dedupe CAS conflict while completing notify record');
        return { sent: false, http_status: 409 };
      }
      logNotifyDispatchStep({
        notify_kind: 'lead',
        outcome: 'dedupe_marked_completed',
        tenant_id: begin.tenant_id,
        channel: record.channel,
        event_type: begin.event_type,
        idempotency_key: idemKeyForLog,
        http_status: 200,
        request_id: record.request_id ?? null,
        message_trace_id: record.message_trace_id ?? null,
        session_id: record.session_id,
      });
    }
    return { sent: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // eslint-disable-next-line no-console
    console.error(`[LeadNotify] request failed: ${msg}`);
    return { sent: false };
  }
}
