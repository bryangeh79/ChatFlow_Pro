import { fetch, RequestInit, Response } from 'undici';
import { createHmac } from 'node:crypto';
import type { WebsiteOutboundConfig } from '../../../config/website-outbound';

/**
 * Send a text message via Website outbound callback.
 */
export async function sendWebsiteTextMessage(
  config: WebsiteOutboundConfig,
  sessionId: string,
  replyText: string,
  requestId: string,
): Promise<{
  transport: 'website_real';
  skipped?: boolean;
  reason?: string;
  error?: string;
  debug_steps: string[];
}> {
  const debug_steps: string[] = ['website_real_start'];

  const trimmed = replyText?.trim() ?? '';
  if (!trimmed) {
    debug_steps.push('website_real_skipped_empty_text');
    return { transport: 'website_real', skipped: true, reason: 'empty_text', debug_steps };
  }

  try {
    // Prepare request body
    const body = {
      session_id: sessionId,
      reply_text: trimmed,
      debug_metadata: {
        request_id: requestId,
      },
    };

    const bodyJson = JSON.stringify(body);
    
    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'ChatFlow-Pro/1.7.26',
      'X-Request-Id': requestId,
    };

    // Add signature if secret configured
    if (config.signingSecret) {
      const signature = createHmac('sha256', config.signingSecret)
        .update(bodyJson)
        .digest('hex');
      headers['X-Webhook-Signature'] = `sha256=${signature}`;
    }

    let controller: AbortController;
    let timeoutId: NodeJS.Timeout | null = null;

    const fetchOptions: RequestInit = {
      method: 'POST',
      headers,
      body: bodyJson,
    };

    let response: Response | undefined;
    let attempt = 0;
    const maxAttempts = 2;

    debug_steps.push('website_real_api_call');

    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);
        fetchOptions.signal = controller.signal;

        response = await fetch(config.url, fetchOptions);
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = null;

        if (response.status >= 200 && response.status < 300) {
          debug_steps.push('website_real_success');
          return {
            transport: 'website_real',
            debug_steps,
          };
        }

        if (attempt < maxAttempts && shouldRetryHttpStatus(response.status)) {
          await response.text().catch(() => '');
          debug_steps.push('website_real_retry');
          continue;
        }

        const errorText = await response.text().catch(() => '');
        debug_steps.push('website_real_failure');
        return {
          transport: 'website_real',
          error: `HTTP ${response.status}: ${errorText.slice(0, 100)}`,
          debug_steps,
        };
      } catch (error) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = null;

        if (attempt < maxAttempts && shouldRetryFetchError(error)) {
          debug_steps.push('website_real_retry');
          continue;
        }

        throw error;
      }
    }

    debug_steps.push('website_real_failure');
    return {
      transport: 'website_real',
      error: 'No response after retries',
      debug_steps,
    };
  } catch (error) {
    debug_steps.push('website_real_error');
    return {
      transport: 'website_real',
      error: String(error),
      debug_steps,
    };
  }
}

/** ADR docs/153: retry once on 5xx, 429. */
function shouldRetryHttpStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function shouldRetryFetchError(error: unknown): boolean {
  const errorStr = String(error);
  if (errorStr.includes('ECONN') || errorStr.includes('ETIMEDOUT') || errorStr.includes('network')) {
    return true;
  }
  if (errorStr.includes('AbortError') || errorStr.includes('timeout')) {
    return true;
  }
  return false;
}