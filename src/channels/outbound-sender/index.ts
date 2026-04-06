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
import { createSendFailureResult, createSendSuccessResult, createSendFallbackResult, toUnifiedErrorInfo } from '../send-results';

export interface ChannelSender {
  send(response: UnifiedResponse): Promise<{ result: ReturnType<typeof createSendSuccessResult> | ReturnType<typeof createSendFailureResult> }>;
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

        const sendResult = await sendTelegramTextMessage(config, response.session_id, response.reply_text);

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

        const sendResult = await sendLineTextMessage(config, response.session_id, response.reply_text);

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
  if (channel === 'telegram') {
    return createTelegramRealChannelSender();
  }
  if (channel === 'whatsapp') {
    return createWhatsAppRealChannelSender();
  }
  if (channel === 'messenger') {
    return createMessengerRealChannelSender();
  }
  if (channel === 'line') {
    return createLineRealChannelSender();
  }
  if (channel === 'zalo') {
    return createZaloRealChannelSender();
  }
  if (channel === 'website') {
    return createWebsiteRealChannelSender();
  }
  return createSyntheticChannelSender(channel);
}
