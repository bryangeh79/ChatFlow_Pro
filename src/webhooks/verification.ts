import { handleTelegramWebhook } from './telegram';
import { handleWebsiteWebhook } from './website';
import { handleWhatsAppWebhook } from './whatsapp';
import { handleMessengerWebhook } from './messenger';
import { handleLineWebhook } from './line';
import { handleZaloWebhook } from './zalo';
import { telegramMockWebhookBody } from './telegram.mock';

declare const require: any;
declare const module: any;

export async function runMinimalInboundVerification() {
  const telegramResult = await handleTelegramWebhook(telegramMockWebhookBody);
  const telegramHelpResult = await handleTelegramWebhook({
    ...telegramMockWebhookBody,
    text: '/start',
  });
  const websiteResult = await handleWebsiteWebhook({
    id: 'w-upd-001',
    user_id: 'w-user-1',
    session_id: 'w-session-1',
    text: 'Need pricing info',
    language: 'en',
    timestamp: '2026-04-03T10:57:00.000Z',
  });

  const whatsappResult = await handleWhatsAppWebhook({
    from: 'wa-user-1',
    conversation_id: 'wa-thread-1',
    id: 'wa-msg-1',
    text: 'Hello from WhatsApp',
    timestamp: '2026-04-03T10:57:00.000Z',
  });

  const whatsappSkippedResult = await handleWhatsAppWebhook({
    object: 'whatsapp_business_account',
    entry: [{ id: '0', changes: [{ value: { metadata: {} }, field: 'messages' }] }],
  });

  const messengerResult = await handleMessengerWebhook({
    sender: { id: 'fb-user-1', name: 'Test User' },
    thread: { id: 'fb-thread-1' },
    text: 'Hello from Messenger',
    timestamp: '2026-04-03T10:57:00.000Z',
  });

  const messengerGraphResult = await handleMessengerWebhook({
    entry: [{
      id: '0',
      time: 1703275200,
      messaging: [{
        sender: { id: 'fb-user-2' },
        recipient: { id: 'page-id' },
        timestamp: 1703275200,
        message: {
          mid: 'msg-123',
          text: 'Hello from Graph API',
        },
      }],
    }],
  });

  const messengerSkippedResult = await handleMessengerWebhook({
    entry: [{
      id: '0',
      time: 1703275200,
      messaging: [{
        sender: { id: 'fb-user-3' },
        recipient: { id: 'page-id' },
        timestamp: 1703275200,
        delivery: { mids: ['msg-456'], watermark: 1703275200 },
      }],
    }],
  });

  const lineResult = await handleLineWebhook({
    userId: 'line-user-1',
    conversationId: 'line-conv-1',
    text: 'Hello from Line flat format',
    timestamp: '2026-04-03T10:57:00.000Z',
  });

  const lineWebhookResult = await handleLineWebhook({
    destination: 'U1234567890abcdef1234567890abcdef',
    events: [{
      type: 'message',
      message: {
        type: 'text',
        text: 'Hello from Line webhook',
      },
      source: {
        userId: 'line-user-2',
        type: 'user',
      },
      replyToken: 'nHuyWiB7yP5Zw52FIkcQobQuGDXCTA',
      timestamp: 1703275200000,
    }],
  });

  const lineSkippedResult = await handleLineWebhook({
    destination: 'U1234567890abcdef1234567890abcdef',
    events: [{
      type: 'follow',
      source: {
        userId: 'line-user-3',
        type: 'user',
      },
      timestamp: 1703275200000,
    }],
  });

  const zaloResult = await handleZaloWebhook({
    user_id: 'zalo-user-1',
    thread_id: 'zalo-conv-1',
    text: 'Hello from Zalo flat format',
    timestamp: '2026-04-03T10:57:00.000Z',
  });

  const zaloWebhookResult = await handleZaloWebhook({
    event_name: 'user_send_text',
    sender: { id: 'zalo-user-2' },
    recipient: { id: 'zalo-oa-1' },
    message: { text: 'Hello from Zalo webhook' },
    timestamp: '2026-04-03T10:57:00.000Z',
  });

  const zaloNestedWebhookResult = await handleZaloWebhook({
    data: {
      event_name: 'user_send_text',
      sender: { id: 'zalo-user-3' },
      oa_id: 'zalo-oa-2',
      message: { text: 'Hello from nested Zalo webhook' },
      timestamp: '2026-04-03T10:57:00.000Z',
    },
  });

  const zaloSkippedResult = await handleZaloWebhook({
    event_name: 'user_follow',
    sender: { id: 'zalo-user-4' },
    timestamp: '2026-04-03T10:57:00.000Z',
  });

  return {
    telegram:
      telegramResult.ok && 'message' in telegramResult
        ? {
            ok: true,
            inbound_result: telegramResult.message,
            channel: telegramResult.message?.channel ?? null,
            session_id: telegramResult.session?.session_id ?? null,
            response_channel: telegramResult.response?.channel ?? null,
            outbound_payload: telegramResult.outboundPayload ?? null,
            outbound_channel: telegramResult.outboundPayload?.kind ?? null,
            send_result: telegramResult.sendResult ?? null,
            send_result_channel: telegramResult.sendResult?.result.channel ?? null,
            transport_step: telegramResult.sendResult?.result.debug_steps ?? null,
            transport_result: telegramResult.transport_step,
            provider_message_id: telegramResult.sendResult?.result.provider_message_id ?? null,
            trigger: telegramResult.trigger,
          }
        : { ok: false, error: 'error' in telegramResult ? telegramResult.error : undefined },
    telegram_help:
      telegramHelpResult.ok && 'message' in telegramHelpResult
        ? {
            ok: true,
            trigger: telegramHelpResult.trigger,
            response_text: telegramHelpResult.response?.reply_text ?? null,
            outbound_text: telegramHelpResult.outboundPayload?.text ?? null,
          }
        : { ok: false, error: 'error' in telegramHelpResult ? telegramHelpResult.error : undefined },
    website:
      websiteResult.ok && 'message' in websiteResult
        ? {
            ok: true,
            channel: websiteResult.message?.channel ?? null,
            session_id: websiteResult.session?.session_id ?? null,
            response_channel: websiteResult.response?.channel ?? null,
            outbound_channel: websiteResult.outboundPayload?.kind ?? null,
            send_result_channel: websiteResult.sendResult?.result.channel ?? null,
          }
        : { ok: false, error: 'error' in websiteResult ? websiteResult.error : undefined },
    whatsapp:
      whatsappResult.ok && 'message' in whatsappResult && whatsappResult.message
        ? {
            ok: true,
            skipped: false,
            channel: whatsappResult.message.channel,
            session_id: whatsappResult.session?.session_id ?? null,
            send_result_channel: whatsappResult.sendResult?.result.channel ?? null,
          }
        : whatsappResult.ok
          ? { ok: true, skipped: true, reason: 'skipped' in whatsappResult ? whatsappResult.reason : null }
          : { ok: false, error: whatsappResult.error },
    whatsapp_skipped:
      whatsappSkippedResult.ok && 'skipped' in whatsappSkippedResult && whatsappSkippedResult.skipped
        ? { ok: true, skipped: true, reason: whatsappSkippedResult.reason ?? null }
        : whatsappSkippedResult.ok
          ? { ok: true, skipped: false }
          : { ok: false, error: whatsappSkippedResult.error },
    messenger:
      messengerResult.ok && 'message' in messengerResult && messengerResult.message
        ? {
            ok: true,
            skipped: false,
            channel: messengerResult.message.channel,
            session_id: messengerResult.session?.session_id ?? null,
            send_result_channel: messengerResult.sendResult?.result.channel ?? null,
          }
        : messengerResult.ok
          ? { ok: true, skipped: true, reason: 'skipped' in messengerResult ? messengerResult.reason : null }
          : { ok: false, error: messengerResult.error },
    messenger_graph:
      messengerGraphResult.ok && 'message' in messengerGraphResult && messengerGraphResult.message
        ? {
            ok: true,
            skipped: false,
            channel: messengerGraphResult.message.channel,
            session_id: messengerGraphResult.session?.session_id ?? null,
          }
        : messengerGraphResult.ok
          ? { ok: true, skipped: true }
          : { ok: false, error: messengerGraphResult.error },
    messenger_skipped:
      messengerSkippedResult.ok && 'skipped' in messengerSkippedResult && messengerSkippedResult.skipped
        ? { ok: true, skipped: true, reason: messengerSkippedResult.reason ?? null }
        : messengerSkippedResult.ok
          ? { ok: true, skipped: false }
          : { ok: false, error: messengerSkippedResult.error },
    line:
      lineResult.ok && 'message' in lineResult && lineResult.message
        ? {
            ok: true,
            skipped: false,
            channel: lineResult.message.channel,
            session_id: lineResult.session?.session_id ?? null,
            send_result_channel: lineResult.sendResult?.result.channel ?? null,
          }
        : lineResult.ok
          ? { ok: true, skipped: true, reason: 'skipped' in lineResult ? lineResult.reason : null }
          : { ok: false, error: lineResult.error },
    line_webhook:
      lineWebhookResult.ok && 'message' in lineWebhookResult && lineWebhookResult.message
        ? {
            ok: true,
            skipped: false,
            channel: lineWebhookResult.message.channel,
            session_id: lineWebhookResult.session?.session_id ?? null,
          }
        : lineWebhookResult.ok
          ? { ok: true, skipped: true }
          : { ok: false, error: lineWebhookResult.error },
    line_skipped:
      lineSkippedResult.ok && 'skipped' in lineSkippedResult && lineSkippedResult.skipped
        ? { ok: true, skipped: true, reason: lineSkippedResult.reason ?? null }
        : lineSkippedResult.ok
          ? { ok: true, skipped: false }
          : { ok: false, error: lineSkippedResult.error },
    zalo:
      zaloResult.ok && 'message' in zaloResult && zaloResult.message
        ? {
            ok: true,
            skipped: false,
            channel: zaloResult.message.channel,
            session_id: zaloResult.session?.session_id ?? null,
            send_result_channel: zaloResult.sendResult?.result.channel ?? null,
          }
        : zaloResult.ok
          ? { ok: true, skipped: true, reason: 'skipped' in zaloResult ? zaloResult.reason : null }
          : { ok: false, error: zaloResult.error },
    zalo_webhook:
      zaloWebhookResult.ok && 'message' in zaloWebhookResult && zaloWebhookResult.message
        ? {
            ok: true,
            skipped: false,
            channel: zaloWebhookResult.message.channel,
            session_id: zaloWebhookResult.session?.session_id ?? null,
          }
        : zaloWebhookResult.ok
          ? { ok: true, skipped: true }
          : { ok: false, error: zaloWebhookResult.error },
    zalo_nested:
      zaloNestedWebhookResult.ok && 'message' in zaloNestedWebhookResult && zaloNestedWebhookResult.message
        ? {
            ok: true,
            skipped: false,
            channel: zaloNestedWebhookResult.message.channel,
            session_id: zaloNestedWebhookResult.session?.session_id ?? null,
          }
        : zaloNestedWebhookResult.ok
          ? { ok: true, skipped: true }
          : { ok: false, error: zaloNestedWebhookResult.error },
    zalo_skipped:
      zaloSkippedResult.ok && 'skipped' in zaloSkippedResult && zaloSkippedResult.skipped
        ? { ok: true, skipped: true, reason: zaloSkippedResult.reason ?? null }
        : zaloSkippedResult.ok
          ? { ok: true, skipped: false }
          : { ok: false, error: zaloSkippedResult.error },
  };
}

if (typeof require !== 'undefined' && require.main === module) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(runMinimalInboundVerification(), null, 2));
}
