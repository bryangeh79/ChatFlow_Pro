import type { UnifiedInboundMessage } from '../../../../shared/types/unified-inbound-message';

export interface MessengerRawInboundEvent {
  mid?: string;
  sender?: { id?: string; name?: string };
  thread?: { id?: string };
  text?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export function normalizeMessengerInbound(rawEvent: MessengerRawInboundEvent): UnifiedInboundMessage {
  return {
    channel: 'messenger',
    external_user_id: String(rawEvent.sender?.id ?? 'unknown'),
    external_session_id: String(rawEvent.thread?.id ?? 'unknown'),
    message_id: String(rawEvent.mid ?? 'messenger-generated-id'),
    message_type: rawEvent.text ? 'text' : 'event',
    text: rawEvent.text ?? null,
    timestamp: rawEvent.timestamp ?? new Date().toISOString(),
    raw_payload: rawEvent,
  };
}
