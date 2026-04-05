import type { UnifiedResponse } from '../../../shared/types/unified-response';
import { mapUnifiedResponseToOutboundPayload } from '../outbound-mapping';
import { loadTelegramConfigForRealSend } from '../../config/telegram';
import { sendTelegramTextMessage } from '../adapters/telegram/real-send';
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
  const config = loadTelegramConfigForRealSend();
  if (!config) {
    return createSyntheticChannelSender('telegram');
  }

  return {
    async send(response: UnifiedResponse) {
      const messageTraceId =
        (response.debug_metadata?.message_trace_id as string | undefined) ?? `msg-${Date.now().toString(36)}`;
      const traceId = response.debug_metadata?.trace_id as string | undefined ?? null;
      const requestId = response.debug_metadata?.request_id as string | undefined ?? null;

      try {
        const outbound = mapUnifiedResponseToOutboundPayload({ ...response, channel: 'telegram' });
        void outbound;

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

export function createChannelSender(channel: UnifiedResponse['channel']): ChannelSender {
  if (channel === 'telegram') {
    return createTelegramRealChannelSender();
  }
  return createSyntheticChannelSender(channel);
}
