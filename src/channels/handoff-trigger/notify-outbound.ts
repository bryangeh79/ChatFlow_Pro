import { fetch } from 'undici';
import { loadHandoffNotifySecret, loadHandoffNotifyUrl } from '../../config/handoff-notify';
import { beginNotifyDedupe, completeNotifyDedupeWithCas } from '../../saas/notify-dedupe-repository';
import { emitOpsAlert } from '../../observability/ops-alert';
import { observabilityFingerprint } from '../../observability/structured-log';
import {
  logNotifyDedupeCasConflict,
  logNotifyDedupeDecision,
  logNotifyDispatchStep,
} from '../../observability/notify-milestone-log';
import type { NotifyDispatchResult } from '../lead-capture-hook/notify-outbound';

export interface HandoffNotifyPayload {
  event: 'handoff_pending';
  session_id: string;
  channel: string;
  external_user_id: string;
  external_session_id: string;
  reason: string | null;
  triggered_at: string | null;
  request_id?: string;
  message_trace_id?: string;
  assigned_owner_id?: string;
  assign_reason?: string;
  online_agents_count?: number;
  assignment_log_id?: string;
  /** Phase 24 / 3C — deterministic key for downstream at-least-once consumers. */
  idempotency_key: string;
}

/**
 * Fire-and-forget POST when session first enters handoff pending.
 * Does nothing when CHATFLOW_HANDOFF_NOTIFY_URL is unset. Never throws; logs failures only.
 */
export function scheduleHandoffNotify(payload: HandoffNotifyPayload): void {
  void dispatchHandoffNotifyWithDedupe(payload);
}

export interface HandoffTelegramNotifyOptions {
  botToken: string;
  operatorChatId: string;
  payload: HandoffNotifyPayload;
}

/**
 * Fire-and-forget Telegram message to operator when handoff is triggered.
 * Uses the tenant's own bot token to message the operator chat_id.
 * Never throws.
 */
export function scheduleHandoffTelegramNotify(opts: HandoffTelegramNotifyOptions): void {
  void dispatchHandoffTelegramNotify(opts);
}

async function dispatchHandoffTelegramNotify(opts: HandoffTelegramNotifyOptions): Promise<void> {
  const { botToken, operatorChatId, payload } = opts;
  if (!botToken || !operatorChatId) return;

  const channelLabel: Record<string, string> = {
    telegram: 'Telegram', whatsapp: 'WhatsApp', messenger: 'Messenger',
    line: 'LINE', zalo: 'Zalo', website: 'Website',
  };
  const ch = channelLabel[payload.channel] ?? payload.channel;
  const time = payload.triggered_at
    ? new Date(payload.triggered_at).toLocaleString('zh-CN', { timeZone: 'Asia/Kuala_Lumpur' })
    : new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Kuala_Lumpur' });

  const text = [
    '🔔 *新客户正在等待人工客服*',
    '',
    `📱 频道：${ch}`,
    `👤 用户 ID：\`${payload.external_user_id}\``,
    `⏰ 时间：${time}`,
    payload.reason ? `💬 触发原因：${payload.reason}` : null,
    '',
    '请前往 Inbox 处理。',
  ].filter(Boolean).join('\n');

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: operatorChatId,
        text,
        parse_mode: 'Markdown',
      }),
      signal: AbortSignal.timeout(8_000),
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[HandoffTelegramNotify] failed:', e instanceof Error ? e.message : String(e));
  }
}

export async function dispatchHandoffNotifyWithDedupe(
  payload: HandoffNotifyPayload,
): Promise<NotifyDispatchResult> {
  const begin = await beginNotifyDedupe({
    event_type: payload.event,
    idempotency_key: payload.idempotency_key,
  });
  const idemKeyForLog = begin.idempotency_key ?? payload.idempotency_key;
  logNotifyDedupeDecision({
    notify_kind: 'handoff',
    decision: begin.decision,
    tenant_id: begin.tenant_id,
    event_type: begin.event_type,
    idempotency_key: idemKeyForLog,
    channel: payload.channel,
    request_id: payload.request_id ?? null,
    message_trace_id: payload.message_trace_id ?? null,
    session_id: payload.session_id,
  });
  if (begin.decision === 'duplicate_completed') {
    return { sent: false, duplicate: true, dedupe_status: 'completed', http_status: 200 };
  }
  if (begin.decision === 'duplicate_processing') {
    return { sent: false, duplicate: true, dedupe_status: 'processing', http_status: 202 };
  }

  const url = loadHandoffNotifyUrl();
  if (!url) {
    logNotifyDispatchStep({
      notify_kind: 'handoff',
      outcome: 'skipped_no_url',
      tenant_id: begin.tenant_id,
      channel: payload.channel,
      event_type: begin.event_type,
      idempotency_key: idemKeyForLog,
      request_id: payload.request_id ?? null,
      message_trace_id: payload.message_trace_id ?? null,
      session_id: payload.session_id,
    });
    return { sent: false };
  }

  const secret = loadHandoffNotifySecret();
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'user-agent': 'ChatFlow-Pro/handoff-notify',
  };
  if (secret) {
    headers['x-chatflow-handoff-notify-secret'] = secret;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      logNotifyDispatchStep({
        notify_kind: 'handoff',
        outcome: 'http_error',
        tenant_id: begin.tenant_id,
        channel: payload.channel,
        event_type: begin.event_type,
        idempotency_key: idemKeyForLog,
        http_status: res.status,
        request_id: payload.request_id ?? null,
        message_trace_id: payload.message_trace_id ?? null,
        session_id: payload.session_id,
      });
      // eslint-disable-next-line no-console
      console.error(`[HandoffNotify] HTTP ${res.status} from notify endpoint`);
      return { sent: false };
    }
    logNotifyDispatchStep({
      notify_kind: 'handoff',
      outcome: 'http_ok',
      tenant_id: begin.tenant_id,
      channel: payload.channel,
      event_type: begin.event_type,
      idempotency_key: idemKeyForLog,
      http_status: res.status,
      request_id: payload.request_id ?? null,
      message_trace_id: payload.message_trace_id ?? null,
      session_id: payload.session_id,
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
          notify_kind: 'handoff',
          tenant_id: begin.tenant_id,
          event_type: begin.event_type,
          idempotency_key: begin.idempotency_key,
          channel: payload.channel,
          message_trace_id: payload.message_trace_id ?? null,
          request_id: payload.request_id ?? null,
          session_id: payload.session_id,
        });
        emitOpsAlert({
          severity: 'P2',
          code: 'notify_dedupe_cas_conflict',
          message: 'Handoff notify HTTP succeeded but notify dedupe CAS failed',
          tenant_id: begin.tenant_id,
          channel: payload.channel,
          phase: 'notify',
          message_trace_id: payload.message_trace_id ?? null,
          request_id: payload.request_id ?? null,
          context: {
            event_type: begin.event_type,
            idempotency_key_fp: observabilityFingerprint(begin.idempotency_key),
            notify: 'handoff',
          },
        });
        // eslint-disable-next-line no-console
        console.error('[HandoffNotify] dedupe CAS conflict while completing notify record');
        return { sent: false, http_status: 409 };
      }
      logNotifyDispatchStep({
        notify_kind: 'handoff',
        outcome: 'dedupe_marked_completed',
        tenant_id: begin.tenant_id,
        channel: payload.channel,
        event_type: begin.event_type,
        idempotency_key: idemKeyForLog,
        http_status: 200,
        request_id: payload.request_id ?? null,
        message_trace_id: payload.message_trace_id ?? null,
        session_id: payload.session_id,
      });
    }
    return { sent: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // eslint-disable-next-line no-console
    console.error(`[HandoffNotify] request failed: ${msg}`);
    return { sent: false };
  }
}
