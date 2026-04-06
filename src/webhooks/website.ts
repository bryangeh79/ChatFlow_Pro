import { parseWebsiteInbound } from '../channels/adapters/website';
import { mapWebsiteOutboundPayload } from '../channels/adapters/website/outbound';
import { createChannelSender } from '../channels/outbound-sender';
import { createOrUpdateSessionContext, commitSessionContext } from '../channels/session-context';
import { runUnifiedInboundPipeline } from '../channels/unified-inbound-pipeline';
import { createMinimalTraceContext } from '../channels/errors/observability';
import { createSafeFallbackResponse } from '../channels/errors';
import type { WebhookHandlerOptions } from './telegram';
import { webhookObservabilityPhases } from './webhook-timing';

export async function handleWebsiteWebhook(rawRequestBody: unknown, opts?: WebhookHandlerOptions) {
  try {
    const wall0 = Date.now();
    const message = parseWebsiteInbound(rawRequestBody);
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
    
    // 提交 session 到进程内存储（使跨请求 lead 合并生效）
    commitSessionContext(result.session);
    
    const trace = createMinimalTraceContext({
      channel: 'website',
      session_id: result.session.session_id,
      httpRequestId: opts?.httpRequestId,
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
    const prepare_ms = Date.now() - wall0;
    const tSend = Date.now();
    const sendResult = await sender.send({
      channel: 'website',
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
