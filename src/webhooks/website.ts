import { parseWebsiteInbound } from '../channels/adapters/website';
import { mapWebsiteOutboundPayload } from '../channels/adapters/website/outbound';
import { createChannelSender } from '../channels/outbound-sender';
import { createOrUpdateSessionContext, commitSessionContext } from '../channels/session-context';
import { runUnifiedInboundPipeline } from '../channels/unified-inbound-pipeline';
import { createMinimalTraceContext } from '../channels/errors/observability';
import { createSafeFallbackResponse } from '../channels/errors';

export async function handleWebsiteWebhook(rawRequestBody: unknown) {
  try {
    const message = parseWebsiteInbound(rawRequestBody);
    const session = createOrUpdateSessionContext(message);
    const result = runUnifiedInboundPipeline(message, session);
    
    // 提交 session 到进程内存储（使跨请求 lead 合并生效）
    commitSessionContext(result.session);
    
    const trace = createMinimalTraceContext({
      channel: 'website',
      session_id: result.session.session_id,
    });

    const outboundPayload = mapWebsiteOutboundPayload({
      ...result.response,
      debug_metadata: {
        trace_id: trace.trace_id,
        request_id: trace.request_id,
        message_trace_id: trace.message_trace_id,
      },
    });

    const sender = createChannelSender('website');
    const sendResult = await sender.send({
      channel: 'website',
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
