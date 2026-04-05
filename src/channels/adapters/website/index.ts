import type { UnifiedInboundMessage } from '../../../../shared/types/unified-inbound-message';

export interface WebsiteRawInboundEvent {
  id?: string;
  user_id?: string;
  session_id?: string;
  text?: string;
  language?: 'zh' | 'en' | 'vi' | 'ms-MY';
  attachments?: Array<{
    type: string;
    url?: string;
    name?: string;
    mime_type?: string;
    size?: number;
  }>;
  timestamp?: string;
  [key: string]: unknown;
}

export function normalizeWebsiteInbound(rawEvent: WebsiteRawInboundEvent): UnifiedInboundMessage {
  return {
    channel: 'website',
    external_user_id: String(rawEvent.user_id ?? 'unknown'),
    external_session_id: String(rawEvent.session_id ?? 'unknown'),
    message_id: String(rawEvent.id ?? 'website-generated-id'),
    message_type: rawEvent.attachments?.length ? 'file' : 'text',
    text: rawEvent.text ?? null,
    attachments: rawEvent.attachments,
    language: rawEvent.language ?? null,
    timestamp: rawEvent.timestamp ?? new Date().toISOString(),
    raw_payload: rawEvent,
  };
}

export function parseWebsiteInbound(rawEvent: unknown): UnifiedInboundMessage {
  if (!rawEvent || typeof rawEvent !== 'object') {
    throw new Error('normalize_error: invalid website payload');
  }

  const event = rawEvent as WebsiteRawInboundEvent;
  if (!event.user_id || !event.session_id) {
    throw new Error('missing_required_field: user_id or session_id');
  }

  return normalizeWebsiteInbound(event);
}
