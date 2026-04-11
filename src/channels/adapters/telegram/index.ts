import type { UnifiedInboundMessage } from '../../../../shared/types/unified-inbound-message';

export interface TelegramRawInboundEvent {
  update_id?: string;
  from?: { id?: string; username?: string; language_code?: string };
  chat?: { id?: string };
  text?: string;
  timestamp?: string;
  /** Present when event originated from an inline keyboard button click (callback_query). */
  callback_query_id?: string;
  [key: string]: unknown;
}

/**
 * Telegram Bot API sends an `Update` with nested `message` / `edited_message` / `channel_post`.
 * Tests and smoke scripts use a flat shape; normalize both.
 */
export function coerceTelegramWebhookBody(body: unknown): TelegramRawInboundEvent {
  if (!body || typeof body !== 'object') {
    throw new Error('normalize_error: invalid telegram payload');
  }
  const r = body as Record<string, unknown>;

  // ── callback_query: inline keyboard button click ──────────────────────────
  const cbq = r.callback_query as Record<string, unknown> | undefined;
  if (cbq && typeof cbq === 'object') {
    const from = cbq.from as Record<string, unknown> | undefined;
    const cbqMsg = cbq.message as Record<string, unknown> | undefined;
    const chat = cbqMsg?.chat as Record<string, unknown> | undefined;
    const dateRaw = cbqMsg?.date;
    let timestamp = new Date().toISOString();
    if (typeof dateRaw === 'number' && Number.isFinite(dateRaw)) {
      timestamp = new Date(dateRaw < 1e12 ? dateRaw * 1000 : dateRaw).toISOString();
    }
    return {
      update_id: String(r.update_id ?? 'telegram'),
      callback_query_id: String(cbq.id ?? ''),
      from: from
        ? {
            id: String(from.id ?? ''),
            username: from.username != null ? String(from.username) : undefined,
            language_code: from.language_code != null ? String(from.language_code) : undefined,
          }
        : undefined,
      chat: chat ? { id: String(chat.id ?? '') } : undefined,
      text: typeof cbq.data === 'string' && cbq.data.length > 0 ? cbq.data : undefined,
      timestamp,
    };
  }

  // ── regular message / edited_message / channel_post ──────────────────────
  const nested = (r.message ?? r.edited_message ?? r.channel_post) as Record<string, unknown> | undefined;
  if (nested && typeof nested === 'object') {
    const from = nested.from as Record<string, unknown> | undefined;
    const chat = nested.chat as Record<string, unknown> | undefined;
    const dateRaw = nested.date;
    let timestamp = new Date().toISOString();
    if (typeof dateRaw === 'number' && Number.isFinite(dateRaw)) {
      timestamp = new Date(dateRaw < 1e12 ? dateRaw * 1000 : dateRaw).toISOString();
    }
    return {
      update_id: String(r.update_id ?? nested.message_id ?? 'telegram'),
      from: from
        ? {
            id: String(from.id ?? ''),
            username: from.username != null ? String(from.username) : undefined,
            language_code: from.language_code != null ? String(from.language_code) : undefined,
          }
        : undefined,
      chat: chat ? { id: String(chat.id ?? '') } : undefined,
      text: typeof nested.text === 'string' ? nested.text : undefined,
      timestamp,
    };
  }
  return r as TelegramRawInboundEvent;
}

/**
 * Normalize Telegram IETF language_code to our 4 supported codes.
 * Telegram sends: "zh-hans", "zh-hant", "zh-TW", "ms", "ms-MY", "en-US", "vi", etc.
 */
export function normalizeTelegramLanguageCode(code: string | undefined): UnifiedInboundMessage['language'] {
  if (!code) return null;
  const lc = code.toLowerCase();
  if (lc.startsWith('zh')) return 'zh';
  if (lc.startsWith('ms')) return 'ms-MY';
  if (lc.startsWith('vi')) return 'vi';
  if (lc.startsWith('en')) return 'en';
  return null; // unsupported — LLM will naturally follow user text language
}

export function normalizeTelegramInbound(rawEvent: TelegramRawInboundEvent): UnifiedInboundMessage {
  return {
    channel: 'telegram',
    external_user_id: String(rawEvent.from?.id ?? 'unknown'),
    external_session_id: String(rawEvent.chat?.id ?? 'unknown'),
    message_id: String(rawEvent.update_id ?? 'telegram-generated-id'),
    message_type: rawEvent.text ? 'text' : 'event',
    text: rawEvent.text ?? null,
    language: normalizeTelegramLanguageCode(rawEvent.from?.language_code),
    timestamp: rawEvent.timestamp ?? new Date().toISOString(),
    raw_payload: rawEvent,
  };
}

export { mapTelegramOutboundPayload } from './outbound';
