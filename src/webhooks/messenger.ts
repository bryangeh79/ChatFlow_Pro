import { normalizeMessengerInbound, type MessengerRawInboundEvent } from '../channels/adapters/messenger';
import { mapMessengerOutboundPayload } from '../channels/adapters/messenger/outbound';
import { createChannelSender } from '../channels/outbound-sender';
import { createOrUpdateSessionContext, commitSessionContext } from '../channels/session-context';
import { runUnifiedInboundPipeline } from '../channels/unified-inbound-pipeline';
import { createMinimalTraceContext } from '../channels/errors/observability';
import { createSafeFallbackResponse } from '../channels/errors';
import type { WebhookHandlerOptions } from './telegram';
import { webhookObservabilityPhases } from './webhook-timing';
import { guardInboundDedupe } from './inbound-dedupe';

/**
 * 解析 Facebook Messenger Webhook 载荷
 * 支持两种格式：
 * 1. 扁平测试格式：{ sender: { id }, thread: { id }, text, timestamp, ... }
 * 2. Graph API 格式：{ entry: [{ messaging: [{ sender, recipient, message, timestamp }] }] }
 */
function parseMessengerInbound(rawRequestBody: unknown): ReturnType<typeof normalizeMessengerInbound> | null {
  if (!rawRequestBody || typeof rawRequestBody !== 'object') {
    return null;
  }

  const body = rawRequestBody as Record<string, unknown>;
  
  // 格式1: 扁平测试格式（已有 normalizeMessengerInbound 支持）
  if (body.sender && typeof body.sender === 'object') {
    const flatEvent = body as MessengerRawInboundEvent;
    return normalizeMessengerInbound(flatEvent);
  }
  
  // 格式2: Facebook Graph API 格式
  if (body.entry && Array.isArray(body.entry)) {
    for (const entry of body.entry as Array<Record<string, unknown>>) {
      if (entry.messaging && Array.isArray(entry.messaging)) {
        for (const messaging of entry.messaging as Array<Record<string, unknown>>) {
          // 只处理包含文本消息的事件
          if (messaging.message && typeof messaging.message === 'object') {
            const message = messaging.message as Record<string, unknown>;
            if (message.text && typeof message.text === 'string') {
              const event: MessengerRawInboundEvent = {
                mid: (messaging.message_id as string) || (message.mid as string) || undefined,
                sender: messaging.sender as { id?: string; name?: string },
                thread: { id: (messaging.recipient as { id?: string })?.id || 'unknown' },
                text: message.text as string,
                timestamp: messaging.timestamp as string,
              };
              return normalizeMessengerInbound(event);
            }
          }
          // 也可以处理其他类型事件（如送达、已读），但这里只处理文本消息
        }
      }
    }
  }
  
  // 没有可处理的消息
  return null;
}

export async function handleMessengerWebhook(rawRequestBody: unknown, opts?: WebhookHandlerOptions) {
  try {
    const wall0 = Date.now();
    const message = parseMessengerInbound(rawRequestBody);
    if (message === null) {
      return {
        ok: true,
        skipped: true,
        reason: 'no_processable_message',
        ...webhookObservabilityPhases(Date.now() - wall0),
      };
    }

    const inboundDedupe = await guardInboundDedupe(message);
    if (inboundDedupe.duplicateResponse) {
      return inboundDedupe.duplicateResponse;
    }
    const session = await createOrUpdateSessionContext(message);
    const result = await runUnifiedInboundPipeline(message, session, {
      traceContext: {
        request_id: opts?.httpRequestId,
      },
      ...(opts?.faqEntries !== undefined ? { faqEntries: opts.faqEntries } : {}),
      ...(opts?.tenantRuntimeSettings !== undefined
        ? { tenantRuntimeSettings: opts.tenantRuntimeSettings }
        : {}),
      ...(opts?.tenantPostSignatureSaasControl !== undefined
        ? { tenantPostSignatureSaasControl: opts.tenantPostSignatureSaasControl }
        : {}),
    });
    await commitSessionContext(result.session);
    await inboundDedupe.completeIfAccepted();

    const trace = createMinimalTraceContext({
      channel: 'messenger',
      session_id: result.session.session_id,
      httpRequestId: opts?.httpRequestId,
    });

    const outboundPayload = mapMessengerOutboundPayload({
      ...result.response,
      debug_metadata: {
        trace_id: trace.trace_id,
        request_id: trace.request_id,
        message_trace_id: trace.message_trace_id,
      },
    });

    const sender = createChannelSender('messenger');
    const prepare_ms = Date.now() - wall0;
    const tSend = Date.now();
    const sendResult = await sender.send({
      channel: 'messenger',
      session_id: result.session.session_id,
      kind: result.response.kind,
      reply_text: result.response.reply_text,
      attachments: [],
      should_send: result.response.should_send,
      debug_metadata: {
        trace_id: trace.trace_id,
        request_id: trace.request_id,
        message_trace_id: trace.message_trace_id,
      },
    });
    const outbound_send_ms = Date.now() - tSend;

    return {
      ok: true,
      message,
      session: result.session,
      response: result.response,
      outboundPayload,
      sendResult: { result: sendResult.result },
      ...webhookObservabilityPhases(prepare_ms, outbound_send_ms),
    };
  } catch (error) {
    const fallback = createSafeFallbackResponse(String(error));
    return {
      ok: false,
      error: fallback,
    };
  }
}