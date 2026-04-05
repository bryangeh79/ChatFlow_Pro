import { fetch as undiciFetch } from 'undici';
import type { WhatsAppCloudConfig } from '../../../config/whatsapp-cloud';
import { redactWhatsAppTokenInMessage } from '../../../config/whatsapp-cloud';

const GRAPH_API_BASE = 'https://graph.facebook.com';
const MAX_MESSAGE_LENGTH = 4096;

/**
 * Parses recipient phone number from WhatsApp session ID.
 * Session ID format: whatsapp:{user_id}:{session_id}
 * Returns user_id (phone number) or null if format invalid.
 */
export function parseWhatsAppRecipientFromSessionId(sessionId: string): string | null {
  const parts = sessionId.split(':');
  if (parts[0] !== 'whatsapp' || parts.length < 3) {
    return null;
  }
  const recipient = parts[1];
  return recipient && recipient !== 'unknown' ? recipient : null;
}

interface WhatsAppApiResponse {
  messaging_product?: 'whatsapp';
  contacts?: Array<{ input: string; wa_id: string }>;
  messages?: Array<{ id: string }>;
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

function shouldRetryWhatsAppSend(status: number): boolean {
  return status >= 500 || status === 429;
}

async function postSendMessageOnce(
  config: WhatsAppCloudConfig,
  recipient: string,
  text: string,
): Promise<{ ok: true; messageId: string } | { ok: false; status: number; description: string; retryable: boolean }> {
  const url = `${GRAPH_API_BASE}/${config.apiVersion}/${config.phoneNumberId}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to: recipient,
    type: 'text',
    text: {
      body: text.length > MAX_MESSAGE_LENGTH ? text.slice(0, MAX_MESSAGE_LENGTH - 1) + '…' : text,
    },
  };

  try {
    const res = await undiciFetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json().catch(() => ({}))) as WhatsAppApiResponse;
    if (res.ok && data.messages?.[0]?.id) {
      return { ok: true, messageId: data.messages[0].id };
    }
    const desc = data.error?.message ?? `http_${res.status}`;
    return {
      ok: false,
      status: res.status,
      description: desc,
      retryable: shouldRetryWhatsAppSend(res.status),
    };
  } catch {
    return {
      ok: false,
      status: 0,
      description: 'whatsapp_network_error',
      retryable: true,
    };
  }
}

async function postSendMessage(
  config: WhatsAppCloudConfig,
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

export async function sendWhatsAppTextMessage(
  config: WhatsAppCloudConfig,
  sessionId: string,
  text: string | null | undefined,
): Promise<{
  transport: 'whatsapp_real';
  skipped?: boolean;
  reason?: string;
  messageId?: string;
  error?: string;
  debug_steps: string[];
}> {
  const debug_steps: string[] = ['whatsapp_real_start'];

  const trimmed = text?.trim() ?? '';
  if (!trimmed) {
    debug_steps.push('whatsapp_real_skipped_empty_text');
    return { transport: 'whatsapp_real', skipped: true, reason: 'empty_text', debug_steps };
  }

  const recipient = parseWhatsAppRecipientFromSessionId(sessionId);
  if (!recipient) {
    debug_steps.push('whatsapp_real_skipped_no_recipient');
    return { transport: 'whatsapp_real', skipped: true, reason: 'no_recipient', debug_steps };
  }

  debug_steps.push('whatsapp_real_api_call');
  try {
    const result = await postSendMessage(config, recipient, trimmed);

    if (result.ok) {
      debug_steps.push('whatsapp_real_success');
      return {
        transport: 'whatsapp_real',
        messageId: result.messageId,
        debug_steps,
      };
    }

    const safeDesc = redactWhatsAppTokenInMessage(result.description, config.accessToken);
    // eslint-disable-next-line no-console
    console.error('[WhatsApp] sendMessage failed:', { status: result.status, description: safeDesc });
    debug_steps.push('whatsapp_real_failed');
    return {
      transport: 'whatsapp_real',
      error: safeDesc,
      debug_steps,
    };
  } catch (error) {
    const safeError = redactWhatsAppTokenInMessage(String(error), config.accessToken);
    debug_steps.push('whatsapp_real_exception');
    return {
      transport: 'whatsapp_real',
      error: safeError,
      debug_steps,
    };
  }
}
