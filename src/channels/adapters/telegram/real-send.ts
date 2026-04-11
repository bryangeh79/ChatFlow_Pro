import { fetch as undiciFetch, ProxyAgent } from 'undici';
import type { Dispatcher } from 'undici';
import type { TelegramConfig } from '../../../config/telegram';
import { redactTelegramTokenInMessage } from '../../../config/telegram';

const TELEGRAM_API = 'https://api.telegram.org';
const MAX_MESSAGE_LENGTH = 4096;

export function parseTelegramChatIdFromSessionId(sessionId: string): string | null {
  const parts = sessionId.split(':');
  // SaaS multi-tenant format: {tenant_id}:telegram:{user_id}:{chat_id}
  if (parts[1] === 'telegram' && parts.length >= 4) {
    const chatId = parts[3];
    return chatId && chatId !== 'unknown' ? chatId : null;
  }
  // Legacy format: telegram:{user_id}:{chat_id}
  if (parts[0] === 'telegram' && parts.length >= 3) {
    const chatId = parts[2];
    return chatId && chatId !== 'unknown' ? chatId : null;
  }
  return null;
}

interface TelegramApiResponse {
  ok?: boolean;
  result?: { message_id?: number };
  description?: string;
  error_code?: number;
}

function shouldRetryTelegramSend(status: number): boolean {
  return status >= 500 || status === 429;
}

async function postSendMessageOnce(
  botToken: string,
  chatId: string,
  text: string,
  dispatcher?: Dispatcher,
  inlineKeyboard?: string[][],
): Promise<{ ok: true; messageId: string } | { ok: false; status: number; description: string; retryable: boolean }> {
  const url = `${TELEGRAM_API}/bot${botToken}/sendMessage`;
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text: text.length > MAX_MESSAGE_LENGTH ? text.slice(0, MAX_MESSAGE_LENGTH - 1) + '…' : text,
  };
  if (inlineKeyboard && inlineKeyboard.length > 0) {
    body.reply_markup = {
      inline_keyboard: inlineKeyboard.map((row) =>
        row.map((label) => ({ text: label, callback_data: label })),
      ),
    };
  }

  try {
    const res = await undiciFetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
      ...(dispatcher ? { dispatcher } : {}),
    });
    const data = (await res.json().catch(() => ({}))) as TelegramApiResponse;
    if (res.ok && data.ok && data.result?.message_id != null) {
      return { ok: true, messageId: String(data.result.message_id) };
    }
    const desc = data.description ?? `http_${res.status}`;
    return {
      ok: false,
      status: res.status,
      description: desc,
      retryable: shouldRetryTelegramSend(res.status),
    };
  } catch {
    return {
      ok: false,
      status: 0,
      description: 'telegram_network_error',
      retryable: true,
    };
  }
}

async function postSendMessage(
  botToken: string,
  chatId: string,
  text: string,
  dispatcher?: Dispatcher,
  inlineKeyboard?: string[][],
): Promise<{ ok: true; messageId: string } | { ok: false; status: number; description: string }> {
  const first = await postSendMessageOnce(botToken, chatId, text, dispatcher, inlineKeyboard);
  if (first.ok) return first;
  if (first.retryable) {
    await new Promise((r) => setTimeout(r, 1000));
    const second = await postSendMessageOnce(botToken, chatId, text, dispatcher, inlineKeyboard);
    if (second.ok) return second;
    return { ok: false, status: second.status, description: second.description };
  }
  return { ok: false, status: first.status, description: first.description };
}

/**
 * Acknowledge a Telegram inline keyboard callback_query.
 * Must be called after every callback_query to clear the button loading state.
 * Fire-and-forget safe — errors are swallowed.
 */
export async function answerTelegramCallbackQuery(
  botToken: string,
  callbackQueryId: string,
): Promise<void> {
  if (!callbackQueryId) return;
  const url = `${TELEGRAM_API}/bot${botToken}/answerCallbackQuery`;
  try {
    await undiciFetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    // ignore — non-critical
  }
}

export async function sendTelegramTextMessage(
  config: TelegramConfig,
  sessionId: string,
  text: string | null | undefined,
  /** Optional quick-reply buttons rendered as Telegram inline keyboard (one row per button). */
  quickReplyButtons?: string[],
): Promise<{
  transport: 'telegram_real';
  skipped?: boolean;
  reason?: string;
  messageId?: string;
  error?: string;
  debug_steps: string[];
}> {
  const debug_steps: string[] = ['telegram_real_start'];

  const trimmed = text?.trim() ?? '';
  if (!trimmed) {
    debug_steps.push('telegram_real_skipped_empty_text');
    return { transport: 'telegram_real', skipped: true, reason: 'empty_text', debug_steps };
  }

  const chatId = parseTelegramChatIdFromSessionId(sessionId);
  if (!chatId) {
    debug_steps.push('telegram_real_skipped_no_chat_id');
    return { transport: 'telegram_real', skipped: true, reason: 'no_chat_id', debug_steps };
  }

  const proxyAgent = config.proxyConnectUri ? new ProxyAgent(config.proxyConnectUri) : undefined;
  if (proxyAgent) {
    debug_steps.push('telegram_real_proxy');
  }

  // Build inline keyboard from quick-reply button labels (each label = one row of one button)
  const inlineKeyboard: string[][] | undefined =
    quickReplyButtons && quickReplyButtons.length > 0
      ? quickReplyButtons.map((label) => [label])
      : undefined;

  debug_steps.push('telegram_real_api_call');
  try {
    const result = await postSendMessage(config.botToken, chatId, trimmed, proxyAgent, inlineKeyboard);

    if (result.ok) {
      debug_steps.push('telegram_real_success');
      return {
        transport: 'telegram_real',
        messageId: result.messageId,
        debug_steps,
      };
    }

    const safeDesc = redactTelegramTokenInMessage(result.description, config.botToken);
    // eslint-disable-next-line no-console
    console.error('[Telegram] sendMessage failed:', { status: result.status, description: safeDesc });
    debug_steps.push('telegram_real_failed');
    return {
      transport: 'telegram_real',
      error: safeDesc,
      debug_steps,
    };
  } finally {
    if (proxyAgent) {
      await proxyAgent.close().catch(() => undefined);
    }
  }
}
