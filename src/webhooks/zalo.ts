import { normalizeZaloInbound, type ZaloRawInboundEvent } from '../channels/adapters/zalo';
import { mapZaloOutboundPayload } from '../channels/adapters/zalo/outbound';
import { createChannelSender } from '../channels/outbound-sender';
import { createOrUpdateSessionContext, commitSessionContext } from '../channels/session-context';
import { runUnifiedInboundPipeline } from '../channels/unified-inbound-pipeline';
import { createMinimalTraceContext } from '../channels/errors/observability';
import { createSafeFallbackResponse } from '../channels/errors';
import type { WebhookHandlerOptions } from './telegram';
import { webhookObservabilityPhases } from './webhook-timing';

/**
 * 解析 Zalo Webhook 载荷
 * 支持两种格式：
 * 1. 扁平测试格式：{ user_id, thread_id, text, timestamp, ... }
 * 2. Zalo OA Webhook 格式：{ event_name: 'user_send_text', sender: { id }, recipient: { id }, message: { text }, timestamp }
 */
function parseZaloInbound(rawRequestBody: unknown): ReturnType<typeof normalizeZaloInbound> | null {
  if (!rawRequestBody || typeof rawRequestBody !== 'object') {
    return null;
  }

  const body = rawRequestBody as Record<string, unknown>;
  
  // 格式1: 扁平测试格式（已有 normalizeZaloInbound 支持）
  if (body.user_id !== undefined || body.thread_id !== undefined) {
    const flatEvent = body as ZaloRawInboundEvent;
    return normalizeZaloInbound(flatEvent);
  }
  
  // 格式2: Zalo OA Webhook 格式
  if (body.event_name === 'user_send_text' && body.sender && typeof body.sender === 'object') {
    const sender = body.sender as Record<string, unknown>;
    const recipient = body.recipient as Record<string, unknown>;
    const message = body.message as Record<string, unknown>;
    
    const zaloEvent: ZaloRawInboundEvent = {
      id: body.message_id as string || `zalo-${Date.now()}`,
      user_id: sender.id as string,
      thread_id: recipient.id as string || sender.id as string,
      text: message.text as string,
      timestamp: body.timestamp as string,
    };
    return normalizeZaloInbound(zaloEvent);
  }
  
  // 格式3: Zalo Webhook 另一种常见格式
  if (body.data && typeof body.data === 'object') {
    const data = body.data as Record<string, unknown>;
    if (data.event_name === 'user_send_text' && data.sender && typeof data.sender === 'object') {
      const sender = data.sender as Record<string, unknown>;
      const message = data.message as Record<string, unknown>;
      
      const zaloEvent: ZaloRawInboundEvent = {
        id: data.message_id as string || `zalo-${Date.now()}`,
        user_id: sender.id as string,
        thread_id: data.oa_id as string || sender.id as string,
        text: message.text as string,
        timestamp: data.timestamp as string,
      };
      return normalizeZaloInbound(zaloEvent);
    }
  }
  
  // 没有可处理的消息
  return null;
}

export async function handleZaloWebhook(rawRequestBody: unknown, opts?: WebhookHandlerOptions) {
  try {
    const wall0 = Date.now();
    const message = parseZaloInbound(rawRequestBody);
    if (message === null) {
      return {
        ok: true,
        skipped: true,
        reason: 'no_processable_message',
        ...webhookObservabilityPhases(Date.now() - wall0),
      };
    }

    const session = createOrUpdateSessionContext(message);
    const result = runUnifiedInboundPipeline(message, session, {
      traceContext: {
        request_id: opts?.httpRequestId,
      },
    });
    commitSessionContext(result.session);

    const trace = createMinimalTraceContext({
      channel: 'zalo',
      session_id: result.session.session_id,
      httpRequestId: opts?.httpRequestId,
    });

    const outboundPayload = mapZaloOutboundPayload({
      ...result.response,
      debug_metadata: {
        trace_id: trace.trace_id,
        request_id: trace.request_id,
        message_trace_id: trace.message_trace_id,
      },
    });

    const sender = createChannelSender('zalo');
    const prepare_ms = Date.now() - wall0;
    const tSend = Date.now();
    const sendResult = await sender.send({
      channel: 'zalo',
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