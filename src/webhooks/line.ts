import { normalizeLineInbound, type LineRawInboundEvent } from '../channels/adapters/line';
import { mapLineOutboundPayload } from '../channels/adapters/line/outbound';
import { createChannelSender } from '../channels/outbound-sender';
import { createOrUpdateSessionContext, commitSessionContext } from '../channels/session-context';
import { runUnifiedInboundPipeline } from '../channels/unified-inbound-pipeline';
import { createMinimalTraceContext } from '../channels/errors/observability';
import { createSafeFallbackResponse } from '../channels/errors';

/**
 * 解析 Line Webhook 载荷
 * 支持两种格式：
 * 1. 扁平测试格式：{ userId, conversationId, text, timestamp, ... }
 * 2. Line Webhook 格式：{ destination, events: [{ type: 'message', message: { type: 'text', text }, source: { userId }, timestamp }] }
 */
function parseLineInbound(rawRequestBody: unknown): ReturnType<typeof normalizeLineInbound> | null {
  if (!rawRequestBody || typeof rawRequestBody !== 'object') {
    return null;
  }

  const body = rawRequestBody as Record<string, unknown>;
  
  // 格式1: 扁平测试格式（已有 normalizeLineInbound 支持）
  if (body.userId !== undefined || body.conversationId !== undefined) {
    const flatEvent = body as LineRawInboundEvent;
    return normalizeLineInbound(flatEvent);
  }
  
  // 格式2: Line Webhook 格式
  if (body.events && Array.isArray(body.events)) {
    for (const event of body.events as Array<Record<string, unknown>>) {
      // 只处理文本消息事件
      if (event.type === 'message' && 
          event.message && typeof event.message === 'object' &&
          (event.message as Record<string, unknown>).type === 'text') {
        
        const message = event.message as Record<string, unknown>;
        const source = event.source as Record<string, unknown>;
        
        const lineEvent: LineRawInboundEvent = {
          id: event.messageId as string || event.replyToken as string,
          userId: source.userId as string,
          conversationId: source.groupId as string || source.roomId as string || source.userId as string,
          text: message.text as string,
          timestamp: event.timestamp as string,
        };
        return normalizeLineInbound(lineEvent);
      }
      // 也可以处理其他类型事件，但这里只处理文本消息
    }
  }
  
  // 没有可处理的消息
  return null;
}

export async function handleLineWebhook(rawRequestBody: unknown) {
  try {
    const message = parseLineInbound(rawRequestBody);
    if (message === null) {
      return {
        ok: true,
        skipped: true,
        reason: 'no_processable_message',
      };
    }

    const session = createOrUpdateSessionContext(message);
    const result = runUnifiedInboundPipeline(message, session);
    commitSessionContext(result.session);

    const trace = createMinimalTraceContext({
      channel: 'line',
      session_id: result.session.session_id,
    });

    const outboundPayload = mapLineOutboundPayload({
      ...result.response,
      debug_metadata: {
        trace_id: trace.trace_id,
        request_id: trace.request_id,
        message_trace_id: trace.message_trace_id,
      },
    });

    const sender = createChannelSender('line');
    const sendResult = await sender.send({
      channel: 'line',
      session_id: result.session.session_id,
      kind: result.response.kind,
      reply_text: result.response.reply_text,
      attachments: [],
      should_send: true,
      debug_metadata: {
        trace_id: trace.trace_id,
        request_id: trace.request_id,
        message_trace_id: trace.message_trace_id,
      },
    });

    return {
      ok: true,
      message,
      session: result.session,
      response: result.response,
      outboundPayload,
      sendResult: { result: sendResult.result },
    };
  } catch (error) {
    const fallback = createSafeFallbackResponse(String(error));
    return {
      ok: false,
      error: fallback,
    };
  }
}