import type { UnifiedResponse } from '../../../shared/types/unified-response';
import { mapUnifiedResponseToOutboundPayload } from '../outbound-mapping';
import { sendTelegramTextMessage } from '../adapters/telegram/real-send';
import { sendWhatsAppTextMessage } from '../adapters/whatsapp/real-send';
import { sendMessengerTextMessage } from '../adapters/messenger/real-send';
import { sendLineTextMessage } from '../adapters/line/real-send';
import { sendZaloTextMessage } from '../adapters/zalo/real-send';
import { sendWebsiteTextMessage } from '../adapters/website/real-send';
import {
  resolveTelegramConfigForOutbound,
  resolveWhatsAppCloudConfigForOutbound,
  resolveMessengerGraphConfigForOutbound,
  resolveLineMessagingConfigForOutbound,
  resolveZaloOpenApiConfigForOutbound,
  resolveWebsiteOutboundConfigForOutbound,
} from '../../saas/tenant-channel-config';
import { getTenantIdOrNull } from '../../saas/tenant-context';
import { getSaaSDbDriver } from '../../saas/db-adapter';
import {
  getTenantDeliveryState,
  upsertTenantDeliveryStateWithCas,
} from '../../saas/delivery-state-repository';
import {
  beginOutboundDedupe,
  completeOutboundDedupeWithCas,
} from '../../saas/outbound-dedupe-repository';
import { emitOpsAlert } from '../../observability/ops-alert';
import { observabilityFingerprint, writeStructuredLog } from '../../observability/structured-log';
import { createSendFailureResult, createSendSuccessResult, createSendFallbackResult, toUnifiedErrorInfo } from '../send-results';
import type { UnifiedSendResult } from '../../../shared/types/unified-send-result';

export interface ChannelSender {
  send(response: UnifiedResponse): Promise<{
    result: ReturnType<typeof createSendSuccessResult> | ReturnType<typeof createSendFailureResult>;
    duplicate?: true;
    dedupe_status?: 'completed' | 'processing';
    http_status?: 200 | 202 | 409;
  }>;
}

async function persistDeliveryStateIfNeeded(result: UnifiedSendResult): Promise<void> {
  const tenantId = getTenantIdOrNull();
  if (!tenantId) return;
  if (getSaaSDbDriver() !== 'postgres') return;
  const existing = await getTenantDeliveryState(tenantId, result.session_id);
  const saved = await upsertTenantDeliveryStateWithCas({
    tenant_id: tenantId,
    session_id: result.session_id,
    channel: result.channel,
    delivery_status: result.status,
    state: {
      status: result.status,
      retryable: Boolean(result.retryable),
      provider_message_id: result.provider_message_id ?? null,
      error_code: result.error?.code ?? null,
      request_id: result.request_id ?? null,
      message_trace_id: result.message_trace_id,
      completed_at: result.completed_at,
    },
    expected_version: existing?.version ?? null,
  });
  if (!saved.ok) {
    throw new Error('delivery_state_cas_conflict');
  }
}

function createSyntheticChannelSender(channel: UnifiedResponse['channel']): ChannelSender {
  return {
    async send(response: UnifiedResponse) {
      try {
        const outbound = mapUnifiedResponseToOutboundPayload({ ...response, channel });
        void outbound;
        const providerMessageId = `provider-${channel}-${Date.now().toString(36)}`;
        const debugSteps = ['mapped', 'transported', 'synthetic'];

        return {
          result: createSendSuccessResult({
            channel,
            session_id: response.session_id,
            message_trace_id: response.debug_metadata?.message_trace_id as string | undefined ?? `msg-${Date.now().toString(36)}`,
            provider_message_id: providerMessageId,
            retryable: false,
            error: null,
            sent_at: new Date().toISOString(),
            debug_steps: debugSteps,
            trace_id: response.debug_metadata?.trace_id as string | undefined ?? null,
            request_id: response.debug_metadata?.request_id as string | undefined ?? null,
          }),
        };
      } catch (error) {
        return {
          result: createSendFailureResult({
            channel,
            session_id: response.session_id,
            message_trace_id: response.debug_metadata?.message_trace_id as string | undefined ?? `msg-${Date.now().toString(36)}`,
            provider_message_id: null,
            retryable: true,
            error: toUnifiedErrorInfo('outbound_mapping_error', String(error), true),
            failed_at: new Date().toISOString(),
            debug_steps: ['failed'],
            trace_id: response.debug_metadata?.trace_id as string | undefined ?? null,
            request_id: response.debug_metadata?.request_id as string | undefined ?? null,
          }),
        };
      }
    },
  };
}

function createTelegramRealChannelSender(): ChannelSender {
  return {
    async send(response: UnifiedResponse) {
      const messageTraceId =
        (response.debug_metadata?.message_trace_id as string | undefined) ?? `msg-${Date.now().toString(36)}`;
      const traceId = response.debug_metadata?.trace_id as string | undefined ?? null;
      const requestId = response.debug_metadata?.request_id as string | undefined ?? null;

      if (response.should_send === false) {
        return {
          result: createSendFallbackResult({
            channel: 'telegram',
            session_id: response.session_id,
            message_trace_id: messageTraceId,
            provider_message_id: null,
            retryable: false,
            error: null,
            sent_at: null,
            debug_steps: ['mapped', 'telegram_real_skipped_should_send_false'],
            trace_id: traceId,
            request_id: requestId,
          }),
        };
      }

      const config = await resolveTelegramConfigForOutbound();
      if (!config) {
        return createSyntheticChannelSender('telegram').send(response);
      }

      try {
        const outbound = mapUnifiedResponseToOutboundPayload({ ...response, channel: 'telegram' });
        void outbound;

        const sendResult = await sendTelegramTextMessage(
          config,
          response.session_id,
          response.reply_text,
          response.quick_reply_buttons,
        );

        if (sendResult.skipped) {
          return {
            result: createSendFallbackResult({
              channel: 'telegram',
              session_id: response.session_id,
              message_trace_id: messageTraceId,
              provider_message_id: null,
              retryable: false,
              error: null,
              sent_at: null,
              debug_steps: sendResult.debug_steps,
              trace_id: traceId,
              request_id: requestId,
            }),
          };
        }

        if (sendResult.messageId) {
          return {
            result: createSendSuccessResult({
              channel: 'telegram',
              session_id: response.session_id,
              message_trace_id: messageTraceId,
              provider_message_id: sendResult.messageId,
              retryable: false,
              error: null,
              sent_at: new Date().toISOString(),
              debug_steps: sendResult.debug_steps,
              trace_id: traceId,
              request_id: requestId,
            }),
          };
        }

        return {
          result: createSendFailureResult({
            channel: 'telegram',
            session_id: response.session_id,
            message_trace_id: messageTraceId,
            provider_message_id: null,
            retryable: true,
            error: toUnifiedErrorInfo('telegram_api_error', sendResult.error ?? 'unknown', true),
            failed_at: new Date().toISOString(),
            debug_steps: sendResult.debug_steps,
            trace_id: traceId,
            request_id: requestId,
          }),
        };
      } catch (error) {
        return {
          result: createSendFailureResult({
            channel: 'telegram',
            session_id: response.session_id,
            message_trace_id: messageTraceId,
            provider_message_id: null,
            retryable: true,
            error: toUnifiedErrorInfo('telegram_transport_error', String(error), true),
            failed_at: new Date().toISOString(),
            debug_steps: ['telegram_real_exception'],
            trace_id: traceId,
            request_id: requestId,
          }),
        };
      }
    },
  };
}

function createWhatsAppRealChannelSender(): ChannelSender {
  return {
    async send(response: UnifiedResponse) {
      const messageTraceId =
        (response.debug_metadata?.message_trace_id as string | undefined) ?? `msg-${Date.now().toString(36)}`;
      const traceId = response.debug_metadata?.trace_id as string | undefined ?? null;
      const requestId = response.debug_metadata?.request_id as string | undefined ?? null;

      if (response.should_send === false) {
        return {
          result: createSendFallbackResult({
            channel: 'whatsapp',
            session_id: response.session_id,
            message_trace_id: messageTraceId,
            provider_message_id: null,
            retryable: false,
            error: null,
            sent_at: null,
            debug_steps: ['mapped', 'whatsapp_real_skipped_should_send_false'],
            trace_id: traceId,
            request_id: requestId,
          }),
        };
      }

      const config = await resolveWhatsAppCloudConfigForOutbound();
      if (!config) {
        return createSyntheticChannelSender('whatsapp').send(response);
      }

      try {
        const outbound = mapUnifiedResponseToOutboundPayload({ ...response, channel: 'whatsapp' });
        void outbound;

        const sendResult = await sendWhatsAppTextMessage(config, response.session_id, response.reply_text);

        if (sendResult.skipped) {
          return {
            result: createSendFallbackResult({
              channel: 'whatsapp',
              session_id: response.session_id,
              message_trace_id: messageTraceId,
              provider_message_id: null,
              retryable: false,
              error: null,
              sent_at: null,
              debug_steps: sendResult.debug_steps,
              trace_id: traceId,
              request_id: requestId,
            }),
          };
        }

        if (sendResult.messageId) {
          return {
            result: createSendSuccessResult({
              channel: 'whatsapp',
              session_id: response.session_id,
              message_trace_id: messageTraceId,
              provider_message_id: sendResult.messageId,
              retryable: false,
              error: null,
              sent_at: new Date().toISOString(),
              debug_steps: sendResult.debug_steps,
              trace_id: traceId,
              request_id: requestId,
            }),
          };
        }

        return {
          result: createSendFailureResult({
            channel: 'whatsapp',
            session_id: response.session_id,
            message_trace_id: messageTraceId,
            provider_message_id: null,
            retryable: true,
            error: toUnifiedErrorInfo('whatsapp_api_error', sendResult.error ?? 'unknown', true),
            failed_at: new Date().toISOString(),
            debug_steps: sendResult.debug_steps,
            trace_id: traceId,
            request_id: requestId,
          }),
        };
      } catch (error) {
        return {
          result: createSendFailureResult({
            channel: 'whatsapp',
            session_id: response.session_id,
            message_trace_id: messageTraceId,
            provider_message_id: null,
            retryable: true,
            error: toUnifiedErrorInfo('whatsapp_transport_error', String(error), true),
            failed_at: new Date().toISOString(),
            debug_steps: ['whatsapp_real_exception'],
            trace_id: traceId,
            request_id: requestId,
          }),
        };
      }
    },
  };
}

function createMessengerRealChannelSender(): ChannelSender {
  return {
    async send(response: UnifiedResponse) {
      const messageTraceId =
        (response.debug_metadata?.message_trace_id as string | undefined) ?? `msg-${Date.now().toString(36)}`;
      const traceId = response.debug_metadata?.trace_id as string | undefined ?? null;
      const requestId = response.debug_metadata?.request_id as string | undefined ?? null;

      if (response.should_send === false) {
        return {
          result: createSendFallbackResult({
            channel: 'messenger',
            session_id: response.session_id,
            message_trace_id: messageTraceId,
            provider_message_id: null,
            retryable: false,
            error: null,
            sent_at: null,
            debug_steps: ['mapped', 'messenger_real_skipped_should_send_false'],
            trace_id: traceId,
            request_id: requestId,
          }),
        };
      }

      const config = await resolveMessengerGraphConfigForOutbound();
      if (!config) {
        return createSyntheticChannelSender('messenger').send(response);
      }

      try {
        const outbound = mapUnifiedResponseToOutboundPayload({ ...response, channel: 'messenger' });
        void outbound;

        const sendResult = await sendMessengerTextMessage(config, response.session_id, response.reply_text);

        if (sendResult.skipped) {
          return {
            result: createSendFallbackResult({
              channel: 'messenger',
              session_id: response.session_id,
              message_trace_id: messageTraceId,
              provider_message_id: null,
              retryable: false,
              error: null,
              sent_at: null,
              debug_steps: sendResult.debug_steps,
              trace_id: traceId,
              request_id: requestId,
            }),
          };
        }

        if (sendResult.messageId) {
          return {
            result: createSendSuccessResult({
              channel: 'messenger',
              session_id: response.session_id,
              message_trace_id: messageTraceId,
              provider_message_id: sendResult.messageId,
              retryable: false,
              error: null,
              sent_at: new Date().toISOString(),
              debug_steps: sendResult.debug_steps,
              trace_id: traceId,
              request_id: requestId,
            }),
          };
        }

        return {
          result: createSendFailureResult({
            channel: 'messenger',
            session_id: response.session_id,
            message_trace_id: messageTraceId,
            provider_message_id: null,
            retryable: true,
            error: toUnifiedErrorInfo('messenger_api_error', sendResult.error ?? 'unknown', true),
            failed_at: new Date().toISOString(),
            debug_steps: sendResult.debug_steps,
            trace_id: traceId,
            request_id: requestId,
          }),
        };
      } catch (error) {
        return {
          result: createSendFailureResult({
            channel: 'messenger',
            session_id: response.session_id,
            message_trace_id: messageTraceId,
            provider_message_id: null,
            retryable: true,
            error: toUnifiedErrorInfo('messenger_transport_error', String(error), true),
            failed_at: new Date().toISOString(),
            debug_steps: ['messenger_real_exception'],
            trace_id: traceId,
            request_id: requestId,
          }),
        };
      }
    },
  };
}

function createLineRealChannelSender(): ChannelSender {
  return {
    async send(response: UnifiedResponse) {
      const messageTraceId =
        (response.debug_metadata?.message_trace_id as string | undefined) ?? `msg-${Date.now().toString(36)}`;
      const traceId = response.debug_metadata?.trace_id as string | undefined ?? null;
      const requestId = response.debug_metadata?.request_id as string | undefined ?? null;

      if (response.should_send === false) {
        return {
          result: createSendFallbackResult({
            channel: 'line',
            session_id: response.session_id,
            message_trace_id: messageTraceId,
            provider_message_id: null,
            retryable: false,
            error: null,
            sent_at: null,
            debug_steps: ['mapped', 'line_real_skipped_should_send_false'],
            trace_id: traceId,
            request_id: requestId,
          }),
        };
      }

      const config = await resolveLineMessagingConfigForOutbound();
      if (!config) {
        return createSyntheticChannelSender('line').send(response);
      }

      try {
        const outbound = mapUnifiedResponseToOutboundPayload({ ...response, channel: 'line' });
        void outbound;

        const sendResult = await sendLineTextMessage(
          config,
          response.session_id,
          response.reply_text,
          response.quick_reply_buttons,
        );

        if (sendResult.skipped) {
          return {
            result: createSendFallbackResult({
              channel: 'line',
              session_id: response.session_id,
              message_trace_id: messageTraceId,
              provider_message_id: null,
              retryable: false,
              error: null,
              sent_at: null,
              debug_steps: sendResult.debug_steps,
              trace_id: traceId,
              request_id: requestId,
            }),
          };
        }

        if (sendResult.messageId) {
          return {
            result: createSendSuccessResult({
              channel: 'line',
              session_id: response.session_id,
              message_trace_id: messageTraceId,
              provider_message_id: sendResult.messageId,
              retryable: false,
              error: null,
              sent_at: new Date().toISOString(),
              debug_steps: sendResult.debug_steps,
              trace_id: traceId,
              request_id: requestId,
            }),
          };
        }

        return {
          result: createSendFailureResult({
            channel: 'line',
            session_id: response.session_id,
            message_trace_id: messageTraceId,
            provider_message_id: null,
            retryable: true,
            error: toUnifiedErrorInfo('line_api_error', sendResult.error ?? 'unknown', true),
            failed_at: new Date().toISOString(),
            debug_steps: sendResult.debug_steps,
            trace_id: traceId,
            request_id: requestId,
          }),
        };
      } catch (error) {
        return {
          result: createSendFailureResult({
            channel: 'line',
            session_id: response.session_id,
            message_trace_id: messageTraceId,
            provider_message_id: null,
            retryable: true,
            error: toUnifiedErrorInfo('line_transport_error', String(error), true),
            failed_at: new Date().toISOString(),
            debug_steps: ['line_real_exception'],
            trace_id: traceId,
            request_id: requestId,
          }),
        };
      }
    },
  };
}

function createZaloRealChannelSender(): ChannelSender {
  return {
    async send(response: UnifiedResponse) {
      const messageTraceId =
        (response.debug_metadata?.message_trace_id as string | undefined) ?? `msg-${Date.now().toString(36)}`;
      const traceId = response.debug_metadata?.trace_id as string | undefined ?? null;
      const requestId = response.debug_metadata?.request_id as string | undefined ?? null;

      if (response.should_send === false) {
        return {
          result: createSendFallbackResult({
            channel: 'zalo',
            session_id: response.session_id,
            message_trace_id: messageTraceId,
            provider_message_id: null,
            retryable: false,
            error: null,
            sent_at: null,
            debug_steps: ['mapped', 'zalo_real_skipped_should_send_false'],
            trace_id: traceId,
            request_id: requestId,
          }),
        };
      }

      const config = await resolveZaloOpenApiConfigForOutbound();
      if (!config) {
        return createSyntheticChannelSender('zalo').send(response);
      }

      try {
        const outbound = mapUnifiedResponseToOutboundPayload({ ...response, channel: 'zalo' });
        void outbound;

        const sendResult = await sendZaloTextMessage(config, response.session_id, response.reply_text);

        if (sendResult.skipped) {
          return {
            result: createSendFallbackResult({
              channel: 'zalo',
              session_id: response.session_id,
              message_trace_id: messageTraceId,
              provider_message_id: null,
              retryable: false,
              error: null,
              sent_at: null,
              debug_steps: sendResult.debug_steps,
              trace_id: traceId,
              request_id: requestId,
            }),
          };
        }

        if (sendResult.messageId) {
          return {
            result: createSendSuccessResult({
              channel: 'zalo',
              session_id: response.session_id,
              message_trace_id: messageTraceId,
              provider_message_id: sendResult.messageId,
              retryable: false,
              error: null,
              sent_at: new Date().toISOString(),
              debug_steps: sendResult.debug_steps,
              trace_id: traceId,
              request_id: requestId,
            }),
          };
        }

        return {
          result: createSendFailureResult({
            channel: 'zalo',
            session_id: response.session_id,
            message_trace_id: messageTraceId,
            provider_message_id: null,
            retryable: true,
            error: toUnifiedErrorInfo('zalo_api_error', sendResult.error ?? 'unknown', true),
            failed_at: new Date().toISOString(),
            debug_steps: sendResult.debug_steps,
            trace_id: traceId,
            request_id: requestId,
          }),
        };
      } catch (error) {
        return {
          result: createSendFailureResult({
            channel: 'zalo',
            session_id: response.session_id,
            message_trace_id: messageTraceId,
            provider_message_id: null,
            retryable: true,
            error: toUnifiedErrorInfo('zalo_transport_error', String(error), true),
            failed_at: new Date().toISOString(),
            debug_steps: ['zalo_real_exception'],
            trace_id: traceId,
            request_id: requestId,
          }),
        };
      }
    },
  };
}

function createWebsiteRealChannelSender(): ChannelSender {
  return {
    async send(response: UnifiedResponse) {
      const messageTraceId = response.debug_metadata?.message_trace_id as string | undefined ?? `msg-${Date.now().toString(36)}`;
      const traceId = response.debug_metadata?.trace_id as string | undefined ?? null;
      const requestId = response.debug_metadata?.request_id as string | undefined ?? null;

      if (response.should_send === false) {
        return {
          result: createSendFallbackResult({
            channel: 'website',
            session_id: response.session_id,
            message_trace_id: messageTraceId,
            provider_message_id: null,
            retryable: false,
            error: null,
            sent_at: null,
            debug_steps: ['mapped', 'website_real_skipped_should_send_false'],
            trace_id: traceId,
            request_id: requestId,
          }),
        };
      }

      const config = await resolveWebsiteOutboundConfigForOutbound();
      const shouldSend = config && !config.disabled && !config.sandbox;

      if (!shouldSend) {
        return {
          result: createSendFallbackResult({
            channel: 'website',
            session_id: response.session_id,
            message_trace_id: messageTraceId,
            provider_message_id: null,
            retryable: false,
            error: null,
            sent_at: null,
            debug_steps: ['website_real_skipped'],
            trace_id: traceId,
            request_id: requestId,
          }),
        };
      }

      try {
        const outbound = mapUnifiedResponseToOutboundPayload({ ...response, channel: 'website' });
        const replyText = (outbound.payload as any).reply_text || response.reply_text || '';
        const sendResult = await sendWebsiteTextMessage(
          config,
          response.session_id,
          replyText,
          requestId ?? `req-${Date.now().toString(36)}`,
        );

        if (sendResult.skipped) {
          return {
            result: createSendFallbackResult({
              channel: 'website',
              session_id: response.session_id,
              message_trace_id: messageTraceId,
              provider_message_id: null,
              retryable: false,
              error: null,
              sent_at: null,
              debug_steps: sendResult.debug_steps,
              trace_id: traceId,
              request_id: requestId,
            }),
          };
        }

        if (!sendResult.error) {
          const providerMessageId = `website-${Date.now().toString(36)}`;
          return {
            result: createSendSuccessResult({
              channel: 'website',
              session_id: response.session_id,
              message_trace_id: messageTraceId,
              provider_message_id: providerMessageId,
              retryable: false,
              error: null,
              sent_at: new Date().toISOString(),
              debug_steps: sendResult.debug_steps,
              trace_id: traceId,
              request_id: requestId,
            }),
          };
        } else {
          return {
            result: createSendFailureResult({
              channel: 'website',
              session_id: response.session_id,
              message_trace_id: messageTraceId,
              provider_message_id: null,
              retryable: true,
              error: toUnifiedErrorInfo('website_api_error', sendResult.error ?? 'unknown', true),
              failed_at: new Date().toISOString(),
              debug_steps: sendResult.debug_steps,
              trace_id: traceId,
              request_id: requestId,
            }),
          };
        }
      } catch (error) {
        return {
          result: createSendFailureResult({
            channel: 'website',
            session_id: response.session_id,
            message_trace_id: messageTraceId,
            provider_message_id: null,
            retryable: true,
            error: toUnifiedErrorInfo('website_transport_error', String(error), true),
            failed_at: new Date().toISOString(),
            debug_steps: ['website_real_exception'],
            trace_id: traceId,
            request_id: requestId,
          }),
        };
      }
    },
  };
}

export function createChannelSender(channel: UnifiedResponse['channel']): ChannelSender {
  let baseSender: ChannelSender;
  if (channel === 'telegram') {
    baseSender = createTelegramRealChannelSender();
  } else if (channel === 'whatsapp') {
    baseSender = createWhatsAppRealChannelSender();
  } else if (channel === 'messenger') {
    baseSender = createMessengerRealChannelSender();
  } else if (channel === 'line') {
    baseSender = createLineRealChannelSender();
  } else if (channel === 'zalo') {
    baseSender = createZaloRealChannelSender();
  } else if (channel === 'website') {
    baseSender = createWebsiteRealChannelSender();
  } else {
    baseSender = createSyntheticChannelSender(channel);
  }
  return {
    async send(response: UnifiedResponse) {
      const begin = await beginOutboundDedupe(response);
      if (begin.decision === 'duplicate_completed') {
        const msgTrace =
          (response.debug_metadata?.message_trace_id as string | undefined) ?? `msg-${Date.now().toString(36)}`;
        return {
          result: createSendFallbackResult({
            channel: response.channel,
            session_id: response.session_id,
            message_trace_id: msgTrace,
            provider_message_id: null,
            retryable: false,
            error: null,
            sent_at: null,
            debug_steps: ['outbound_dedupe_duplicate_completed'],
            trace_id: (response.debug_metadata?.trace_id as string | undefined) ?? null,
            request_id: (response.debug_metadata?.request_id as string | undefined) ?? null,
          }),
          duplicate: true,
          dedupe_status: 'completed',
          http_status: 200,
        };
      }
      if (begin.decision === 'duplicate_processing') {
        const msgTrace =
          (response.debug_metadata?.message_trace_id as string | undefined) ?? `msg-${Date.now().toString(36)}`;
        return {
          result: createSendFallbackResult({
            channel: response.channel,
            session_id: response.session_id,
            message_trace_id: msgTrace,
            provider_message_id: null,
            retryable: false,
            error: null,
            sent_at: null,
            debug_steps: ['outbound_dedupe_duplicate_processing'],
            trace_id: (response.debug_metadata?.trace_id as string | undefined) ?? null,
            request_id: (response.debug_metadata?.request_id as string | undefined) ?? null,
          }),
          duplicate: true,
          dedupe_status: 'processing',
          http_status: 202,
        };
      }
      const out = await baseSender.send(response);
      if (begin.decision === 'accepted' && begin.tenant_id && begin.idempotency_key && begin.version !== null) {
        const completed = await completeOutboundDedupeWithCas({
          tenant_id: begin.tenant_id,
          channel: begin.channel,
          idempotency_key: begin.idempotency_key,
          expected_version: begin.version,
        });
        if (!completed.ok) {
          writeStructuredLog({
            type: 'outbound_dedupe_cas_conflict',
            phase: 'outbound',
            outcome: 'cas_conflict',
            tenant_id: begin.tenant_id,
            channel: begin.channel,
            idempotency_key_fp: observabilityFingerprint(begin.idempotency_key),
            session_fp: observabilityFingerprint(response.session_id),
            message_trace_id: (response.debug_metadata?.message_trace_id as string | undefined) ?? null,
            request_id: (response.debug_metadata?.request_id as string | undefined) ?? null,
          });
          emitOpsAlert({
            severity: 'P2',
            code: 'outbound_dedupe_cas_conflict',
            message: 'Outbound provider send path completed but outbound dedupe CAS failed',
            tenant_id: begin.tenant_id,
            channel: begin.channel,
            phase: 'outbound',
            message_trace_id: (response.debug_metadata?.message_trace_id as string | undefined) ?? null,
            request_id: (response.debug_metadata?.request_id as string | undefined) ?? null,
            context: { idempotency_key_fp: observabilityFingerprint(begin.idempotency_key) },
          });
          return {
            result: createSendFailureResult({
              channel: response.channel,
              session_id: response.session_id,
              message_trace_id:
                (response.debug_metadata?.message_trace_id as string | undefined) ??
                `msg-${Date.now().toString(36)}`,
              provider_message_id: null,
              retryable: false,
              error: toUnifiedErrorInfo('outbound_dedupe_cas_conflict', 'outbound_dedupe_cas_conflict', false),
              failed_at: new Date().toISOString(),
              debug_steps: ['outbound_dedupe_cas_conflict'],
              trace_id: (response.debug_metadata?.trace_id as string | undefined) ?? null,
              request_id: (response.debug_metadata?.request_id as string | undefined) ?? null,
            }),
            http_status: 409,
          };
        }
          writeStructuredLog({
            type: 'outbound_milestone',
            phase: 'outbound',
            outcome: 'dedupe_marked_completed',
            tenant_id: begin.tenant_id,
            channel: begin.channel,
            idempotency_key_fp: observabilityFingerprint(begin.idempotency_key),
            session_fp: observabilityFingerprint(response.session_id),
            message_trace_id: (response.debug_metadata?.message_trace_id as string | undefined) ?? null,
            request_id: (response.debug_metadata?.request_id as string | undefined) ?? null,
          });
      }
      await persistDeliveryStateIfNeeded(out.result);
      return out;
    },
  };
}
