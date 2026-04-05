import type { UnifiedInboundMessage } from '../../../../shared/types/unified-inbound-message';

export interface ZaloRawInboundEvent {
  id?: string;
  user_id?: string;
  thread_id?: string;
  text?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export function normalizeZaloInbound(rawEvent: ZaloRawInboundEvent): UnifiedInboundMessage {
  return {
    channel: 'zalo',
    external_user_id: String(rawEvent.user_id ?? 'unknown'),
    external_session_id: String(rawEvent.thread_id ?? 'unknown'),
    message_id: String(rawEvent.id ?? 'zalo-generated-id'),
    message_type: rawEvent.text ? 'text' : 'event',
    text: rawEvent.text ?? null,
    timestamp: rawEvent.timestamp ?? new Date().toISOString(),
    raw_payload: rawEvent,
  };
}
