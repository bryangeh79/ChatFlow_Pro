import { parseWhatsAppInbound } from '../channels/adapters/whatsapp';
import { mapWhatsAppOutboundPayload } from '../channels/adapters/whatsapp/outbound';
import { createChannelSender } from '../channels/outbound-sender';
import { createOrUpdateSessionContext, commitSessionContext } from '../channels/session-context';
import { runUnifiedInboundPipeline } from '../channels/unified-inbound-pipeline';
import { createMinimalTraceContext } from '../channels/errors/observability';
import { createSafeFallbackResponse } from '../channels/errors';
import type { WebhookHandlerOptions } from './telegram';
import { webhookObservabilityPhases } from './webhook-timing';

export async function handleWhatsAppWebhook(rawRequestBody: unknown, opts?: WebhookHandlerOptions) {
  try {
    const wall0 = Date.now();
    const message = parseWhatsAppInbound(rawRequestBody);
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
      ...(opts?.faqEntries !== undefined ? { faqEntries: opts.faqEntries } : {}),
      ...(opts?.tenantRuntimeSettings !== undefined
        ? { tenantRuntimeSettings: opts.tenantRuntimeSettings }
        : {}),
      ...(opts?.tenantPostSignatureSaasControl !== undefined
        ? { tenantPostSignatureSaasControl: opts.tenantPostSignatureSaasControl }
        : {}),
    });
    commitSessionContext(result.session);

    const trace = createMinimalTraceContext({
      channel: 'whatsapp',
      session_id: result.session.session_id,
      httpRequestId: opts?.httpRequestId,
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
    const prepare_ms = Date.now() - wall0;
    const tSend = Date.now();
    const sendResult = await sender.send({
      channel: 'whatsapp',
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
