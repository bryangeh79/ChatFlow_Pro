import type { UnifiedInboundMessage } from '../../../../shared/types/unified-inbound-message';

export interface TelegramRawInboundEvent {
  update_id?: string;
  from?: { id?: string; username?: string; language_code?: string };
  chat?: { id?: string };
  text?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export function normalizeTelegramInbound(rawEvent: TelegramRawInboundEvent): UnifiedInboundMessage {
  return {
    channel: 'telegram',
    external_user_id: String(rawEvent.from?.id ?? 'unknown'),
    external_session_id: String(rawEvent.chat?.id ?? 'unknown'),
    message_id: String(rawEvent.update_id ?? 'telegram-generated-id'),
    message_type: rawEvent.text ? 'text' : 'event',
    text: rawEvent.text ?? null,
    language: (rawEvent.from?.language_code as UnifiedInboundMessage['language']) ?? null,
    timestamp: rawEvent.timestamp ?? new Date().toISOString(),
    raw_payload: rawEvent,
  };
}

export { mapTelegramOutboundPayload } from './outbound';
