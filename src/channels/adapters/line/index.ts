import type { UnifiedInboundMessage } from '../../../../shared/types/unified-inbound-message';

export interface LineRawInboundEvent {
  id?: string;
  userId?: string;
  conversationId?: string;
  text?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export function normalizeLineInbound(rawEvent: LineRawInboundEvent): UnifiedInboundMessage {
  return {
    channel: 'line',
    external_user_id: String(rawEvent.userId ?? 'unknown'),
    external_session_id: String(rawEvent.conversationId ?? 'unknown'),
    message_id: String(rawEvent.id ?? 'line-generated-id'),
    message_type: rawEvent.text ? 'text' : 'event',
    text: rawEvent.text ?? null,
    timestamp: rawEvent.timestamp ?? new Date().toISOString(),
    raw_payload: rawEvent,
  };
}
