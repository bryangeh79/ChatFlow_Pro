import { fetch as undiciFetch } from 'undici';
import type { MessengerGraphConfig } from '../../../config/messenger-graph';
import { redactMessengerTokenInMessage } from '../../../config/messenger-graph';

const GRAPH_API_BASE = 'https://graph.facebook.com';
const MAX_MESSAGE_LENGTH = 2000; // Messenger text message limit

/**
 * Parses recipient PSID from Messenger session ID.
 * Session ID format: messenger:{psid}:{session_id}
 * Returns the PSID (second segment) or null if format is invalid.
 */
export function parseMessengerRecipientFromSessionId(sessionId: string): string | null {
  const parts = sessionId.split(':');
  if (parts.length >= 2 && parts[0] === 'messenger') {
    return parts[1] || null;
  }
  return null;
}

interface SendResult {
  transport: 'messenger_real';
  skipped?: boolean;
  reason?: string;
  messageId?: string;
  error?: string;
  debug_steps: string[];
}

async function postSendMessageOnce(
  config: MessengerGraphConfig,
  recipient: string,
  text: string,
): Promise<{ ok: true; messageId: string } | { ok: false; status: number; description: string; retryable: boolean }> {
  const url = `${GRAPH_API_BASE}/${config.apiVersion}/${config.pageId}/messages`;
  
  // Messenger Send API requires messaging_type field
  const body = {
    recipient: {
      id: recipient,
    },
    message: {
      text: text.length > MAX_MESSAGE_LENGTH ? text.slice(0, MAX_MESSAGE_LENGTH - 1) + '…' : text,
    },
    messaging_type: 'RESPONSE', // Required for non-promotional messages
  };

  try {
    const res = await undiciFetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.pageAccessToken}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });

    const status = res.status;
    const responseText = await res.text();

    if (status >= 200 && status < 300) {
      try {
        const json = JSON.parse(responseText);
        const messageId = json.message_id as string | undefined;
        if (messageId) {
          return { ok: true, messageId };
        }
        return {
          ok: false,
          status,
          description: 'Response missing message_id',
          retryable: false,
        };
      } catch {
        return {
          ok: false,
          status,
          description: 'Invalid JSON response',
          retryable: false,
        };
      }
    }

    const retryable = status >= 500 || status === 429;
    return {
      ok: false,
      status,
      description: responseText || `HTTP ${status}`,
      retryable,
    };
  } catch (error) {
    const description = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      status: 0,
      description,
      retryable: true, // Network/timeout errors are retryable
    };
  }
}

async function postSendMessage(
  config: MessengerGraphConfig,
  recipient: string,
  text: string,
): Promise<{ ok: true; messageId: string } | { ok: false; status: number; description: string }> {
  const first = await postSendMessageOnce(config, recipient, text);
  if (first.ok) return first;
  if (first.retryable) {
    await new Promise((r) => setTimeout(r, 1000));
    const second = await postSendMessageOnce(config, recipient, text);
    if (second.ok) return second;
    return { ok: false, status: second.status, description: second.description };
  }
  return { ok: false, status: first.status, description: first.description };
}

/**
 * Sends a text message via Messenger Graph API.
 * Follows the same pattern as Telegram and WhatsApp real senders.
 */
export async function sendMessengerTextMessage(
  config: MessengerGraphConfig,
  sessionId: string,
  text: string | null | undefined,
): Promise<SendResult> {
  const debug_steps: string[] = ['messenger_real_start'];

  const trimmed = text?.trim() ?? '';
  if (!trimmed) {
    debug_steps.push('messenger_real_skipped_empty_text');
    return { transport: 'messenger_real', skipped: true, reason: 'empty_text', debug_steps };
  }

  const recipient = parseMessengerRecipientFromSessionId(sessionId);
  if (!recipient) {
    debug_steps.push('messenger_real_skipped_invalid_session');
    return { transport: 'messenger_real', skipped: true, reason: 'invalid_session_format', debug_steps };
  }

  debug_steps.push('messenger_real_api_call');
  try {
    const result = await postSendMessage(config, recipient, trimmed);

    if (result.ok) {
      debug_steps.push('messenger_real_success');
      return {
        transport: 'messenger_real',
        messageId: result.messageId,
        debug_steps,
      };
    }

    const safeDesc = redactMessengerTokenInMessage(result.description, config.pageAccessToken);
    // eslint-disable-next-line no-console
    console.error('[Messenger] sendMessage failed:', { status: result.status, description: safeDesc });
    debug_steps.push('messenger_real_failed');
    return {
      transport: 'messenger_real',
      error: safeDesc,
      debug_steps,
    };
  } catch (error) {
    const safeDesc = redactMessengerTokenInMessage(
      error instanceof Error ? error.message : String(error),
      config.pageAccessToken,
    );
    // eslint-disable-next-line no-console
    console.error('[Messenger] sendMessage exception:', safeDesc);
    debug_steps.push('messenger_real_exception');
    return {
      transport: 'messenger_real',
      error: safeDesc,
      debug_steps,
    };
  }
}
