import {
  coerceTelegramWebhookBody,
  normalizeTelegramInbound,
  type TelegramRawInboundEvent,
} from '../channels/adapters/telegram';
import { mapTelegramOutboundPayload } from '../channels/adapters/telegram/outbound';
import { createChannelSender } from '../channels/outbound-sender';
import { createOrUpdateSessionContext, commitSessionContext } from '../channels/session-context';
import type { UnifiedFaqSeedEntry } from '../channels/unified-inbound-pipeline/faq-seed';
import { runUnifiedInboundPipeline } from '../channels/unified-inbound-pipeline';
import { createMinimalTraceContext } from '../channels/errors/observability';
import { createSafeFallbackResponse } from '../channels/errors';
import { webhookObservabilityPhases } from './webhook-timing';
import { guardInboundDedupe } from './inbound-dedupe';
import type { TenantRuntimeSettings } from '../saas/tenant-runtime-settings';

function isTelegramStartOrHelp(text: string | null | undefined): boolean {
  const normalized = String(text ?? '').trim().toLowerCase();
  return normalized === '/start' || normalized === 'start' || normalized === '/help' || normalized === 'help';
}

function createTelegramHelpText(): string {
  return 'Telegram is connected. Send a message, or use /start or /help to see this guide.';
}

export type WebhookHandlerOptions = {
  httpRequestId?: string;
  /** Multi-tenant SaaS: FAQ rows from DB (omit = use built-in seed). */
  faqEntries?: UnifiedFaqSeedEntry[];
  /** Phase 22B: parsed tenant_settings (tenant webhooks only). */
  tenantRuntimeSettings?: TenantRuntimeSettings;
  /** Phase 22D: tenant POST signature gate passed (WA / Messenger / Line / Website only). */
  tenantPostSignatureSaasControl?: {
    tenant_post_secret_present: boolean;
    tenant_post_env_fallback_blocked: boolean;
  };
};

export async function handleTelegramWebhook(rawRequestBody: unknown, opts?: WebhookHandlerOptions) {
  try {
    const wall0 = Date.now();
    const telegramEvent: TelegramRawInboundEvent = coerceTelegramWebhookBody(rawRequestBody);
    const message = normalizeTelegramInbound(telegramEvent);
    const inboundDedupe = await guardInboundDedupe(message);
    if (inboundDedupe.duplicateResponse) {
      return inboundDedupe.duplicateResponse;
    }
    const session = await createOrUpdateSessionContext(message);

    const isHelpTrigger = isTelegramStartOrHelp(message.text);
    const inboundMessage = isHelpTrigger
      ? {
          ...message,
          text: createTelegramHelpText(),
          message_type: 'event' as const,
          handoff_flag: false,
        }
      : message;

    const result = await runUnifiedInboundPipeline(inboundMessage, session, {
      traceContext: {
        request_id: opts?.httpRequestId,
      },
      ...(opts?.faqEntries !== undefined ? { faqEntries: opts.faqEntries } : {}),
      ...(opts?.tenantRuntimeSettings !== undefined
        ? { tenantRuntimeSettings: opts.tenantRuntimeSettings }
        : {}),
    });
    
    // 提交 session 到进程内存储（使跨请求 lead 合并生效）
    await commitSessionContext(result.session);
    await inboundDedupe.completeIfAccepted();
    
    const trace = createMinimalTraceContext({
      channel: 'telegram',
      session_id: result.session.session_id,
      httpRequestId: opts?.httpRequestId,
    });

    const outboundPayload = mapTelegramOutboundPayload({
      ...result.response,
      debug_metadata: {
        trace_id: trace.trace_id,
        request_id: trace.request_id,
        message_trace_id: trace.message_trace_id,
      },
    });

    const sender = createChannelSender('telegram');
    const prepare_ms = Date.now() - wall0;
    const tSend = Date.now();
    const sendResult = await sender.send({
      channel: 'telegram',
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
      message: inboundMessage,
      session: result.session,
      response: result.response,
      outboundPayload,
      sendResult: { result: sendResult.result },
      trace,
      transport_step: 'mapped-transported',
      trigger: isHelpTrigger ? 'help-start' : 'normal',
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
