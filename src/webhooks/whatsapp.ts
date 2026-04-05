import { parseWhatsAppInbound } from '../channels/adapters/whatsapp';
import { mapWhatsAppOutboundPayload } from '../channels/adapters/whatsapp/outbound';
import { createChannelSender } from '../channels/outbound-sender';
import { createOrUpdateSessionContext, commitSessionContext } from '../channels/session-context';
import { runUnifiedInboundPipeline } from '../channels/unified-inbound-pipeline';
import { createMinimalTraceContext } from '../channels/errors/observability';
import { createSafeFallbackResponse } from '../channels/errors';

export async function handleWhatsAppWebhook(rawRequestBody: unknown) {
  try {
    const message = parseWhatsAppInbound(rawRequestBody);
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
      channel: 'whatsapp',
      session_id: result.session.session_id,
    });

    const outboundPayload = mapWhatsAppOutboundPayload({
      ...result.response,
      debug_metadata: {
        trace_id: trace.trace_id,
        request_id: trace.request_id,
        message_trace_id: trace.message_trace_id,
      },
    });

    const sender = createChannelSender('whatsapp');
    const sendResult = await sender.send({
      channel: 'whatsapp',
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
