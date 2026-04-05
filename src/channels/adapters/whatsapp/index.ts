import type { UnifiedInboundMessage } from '../../../../shared/types/unified-inbound-message';

export interface WhatsAppRawInboundEvent {
  id?: string;
  from?: string;
  conversation_id?: string;
  text?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export function normalizeWhatsAppInbound(rawEvent: WhatsAppRawInboundEvent): UnifiedInboundMessage {
  const from = String(rawEvent.from ?? 'unknown');
  return {
    channel: 'whatsapp',
    external_user_id: from,
    external_session_id: String(rawEvent.conversation_id ?? from),
    message_id: String(rawEvent.id ?? 'whatsapp-generated-id'),
    message_type: rawEvent.text ? 'text' : 'event',
    text: rawEvent.text ?? null,
    timestamp: rawEvent.timestamp ?? new Date().toISOString(),
    raw_payload: rawEvent,
  };
}

/**
 * Parses WhatsApp webhook body: Meta Cloud API shape (entry/changes/value/messages)
 * or flat test shape (WhatsAppRawInboundEvent).
 * Returns null when the payload has no user message to process (e.g. status-only) — respond 200 upstream.
 */
export function parseWhatsAppInbound(body: unknown): UnifiedInboundMessage | null {
  if (!body || typeof body !== 'object') {
    throw new Error('normalize_error: invalid whatsapp payload');
  }

  const o = body as Record<string, unknown>;
  const entry = o.entry;

  if (Array.isArray(entry) && entry.length > 0) {
    const firstEntry = entry[0] as Record<string, unknown>;
    const changes = firstEntry.changes;
    if (Array.isArray(changes) && changes.length > 0) {
      const value = (changes[0] as Record<string, unknown>).value as Record<string, unknown> | undefined;
      const messages = value?.messages;
      if (!Array.isArray(messages) || messages.length === 0) {
        return null;
      }
      const msg = messages[0] as Record<string, unknown>;
      const from = msg.from != null ? String(msg.from) : 'unknown';
      const id = msg.id != null ? String(msg.id) : 'wa-msg';
      const tsRaw = msg.timestamp;
      let ts = new Date().toISOString();
      if (typeof tsRaw === 'string' || typeof tsRaw === 'number') {
        const n = Number(tsRaw);
        if (Number.isFinite(n)) {
          const ms = n < 1e12 ? n * 1000 : n;
          ts = new Date(ms).toISOString();
        }
      }
      const textObj = msg.text as Record<string, unknown> | undefined;
      const bodyText = typeof textObj?.body === 'string' ? textObj.body : null;
      return normalizeWhatsAppInbound({
        id,
        from,
        conversation_id: from,
        text: bodyText ?? undefined,
        timestamp: ts,
      });
    }
  }

  const flat = body as WhatsAppRawInboundEvent;
  if (flat.from === undefined && flat.conversation_id === undefined) {
    throw new Error('normalize_error: whatsapp payload missing identity');
  }
  return normalizeWhatsAppInbound(flat);
}
