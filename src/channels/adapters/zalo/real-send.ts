import { fetch } from 'undici';
import type { ZaloOpenApiConfig } from '../../../config/zalo-openapi';
import { redactZaloTokenInMessage } from '../../../config/zalo-openapi';
import { getZaloAccessTokenResolved } from '../../../tokens/zalo-token-cache';
import { refreshZaloOaAccessTokenSingleFlight } from '../../../tokens/zalo-refresh';

const ZALO_TEXT_MAX_LENGTH = 5000; // Zalo text message limit (assume similar to Line)

interface SendResult {
  transport: 'zalo_real';
  skipped?: boolean;
  reason?: string;
  messageId?: string;
  error?: string;
  debug_steps: string[];
}

/**
 * Parse recipient user_id from Zalo session ID.
 * Format: zalo:{user_id}:{session_id}
 * Returns user_id or null if parsing fails.
 */
export function parseZaloRecipientFromSessionId(sessionId: string): string | null {
  const parts = sessionId.split(':');
  if (parts.length >= 3 && parts[0] === 'zalo') {
    const userId = parts[1];
    return userId && userId !== 'unknown' && userId.trim() !== '' ? userId : null;
  }
  return null;
}

/**
 * Send a text message via Zalo Open API.
 */
export async function sendZaloTextMessage(
  config: ZaloOpenApiConfig,
  sessionId: string,
  text: string | null | undefined
): Promise<SendResult> {
  const debugSteps: string[] = [];
  
  try {
    // 1. Parse recipient
    const recipient = parseZaloRecipientFromSessionId(sessionId);
    if (!recipient) {
      debugSteps.push('parseZaloRecipientFromSessionId: invalid format, skipped');
      return { 
        transport: 'zalo_real', 
        skipped: true, 
        reason: 'invalid_session_format', 
        debug_steps: debugSteps 
      };
    }
    
    debugSteps.push(`parseZaloRecipientFromSessionId: ${recipient}`);
    
    // 2. Validate text
    const trimmed = text?.trim() ?? '';
    if (!trimmed) {
      debugSteps.push('sendZaloTextMessage: empty text, skipped');
      return { 
        transport: 'zalo_real', 
        skipped: true, 
        reason: 'empty_text', 
        debug_steps: debugSteps 
      };
    }
    
    // 3. Truncate if needed
    const messageText = trimmed.length > ZALO_TEXT_MAX_LENGTH 
      ? trimmed.substring(0, ZALO_TEXT_MAX_LENGTH - 3) + '...'
      : trimmed;
    
    if (trimmed.length > ZALO_TEXT_MAX_LENGTH) {
      debugSteps.push(`sendZaloTextMessage: truncated from ${trimmed.length} to ${ZALO_TEXT_MAX_LENGTH} chars`);
    }
    
    // 4. Build request (based on Zalo Open API v2.0 documentation)
    const url = `${config.apiBaseUrl}/v2.0/oa/message`;
    const body = JSON.stringify({
      recipient: {
        user_id: recipient,
      },
      message: {
        text: messageText,
      },
    });
    
    debugSteps.push(`sendZaloTextMessage: POST ${url}`);
    
    // 5. Send with timeout and retry (each attempt gets its own timeout)
    let attempt = 0;
    const maxAttempts = 2;
    let authRefreshAttempted = false;

    const accessHeader = () => getZaloAccessTokenResolved() ?? config.accessToken;
    const redact = (msg: string) => redactZaloTokenInMessage(msg, accessHeader());

    while (attempt < maxAttempts) {
      attempt++;
      debugSteps.push(`sendZaloTextMessage: attempt ${attempt}/${maxAttempts}`);

      // Each attempt gets its own AbortController and timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            access_token: accessHeader(),
            'Content-Type': 'application/json',
          },
          body,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const responseData = await response.json() as any;
          debugSteps.push(`sendZaloTextMessage: success (${response.status})`);

          // Zalo API may or may not return message ID
          // Use a stable placeholder similar to Line
          const messageId = responseData.data?.message_id || `zalo_push_${Date.now()}`;

          return {
            transport: 'zalo_real',
            messageId,
            debug_steps: debugSteps,
          };
        }

        // Handle errors
        const status = response.status;
        const responseText = await response.text().catch(() => '');

        debugSteps.push(`sendZaloTextMessage: HTTP ${status} - ${responseText.substring(0, 200)}`);

        if (status === 401 && !authRefreshAttempted) {
          authRefreshAttempted = true;
          const refreshed = await refreshZaloOaAccessTokenSingleFlight();
          if (refreshed) {
            debugSteps.push('zalo_real_token_refresh_retry');
            attempt--;
            continue;
          }
        }

        // Determine if retryable (transport)
        const isRetryable = status >= 500 || status === 429;

        if (!isRetryable || attempt >= maxAttempts) {
          // Final failure
          const safeDesc = redact(`Zalo API error: ${status} ${responseText.substring(0, 100)}`);
          console.error('[Zalo] sendMessage failed:', { status, description: safeDesc });
          debugSteps.push('zalo_real_failed');

          return {
            transport: 'zalo_real',
            error:
              status === 401
                ? 'invalid_token'
                : status === 429
                  ? 'rate_limited'
                  : status >= 500
                    ? 'zalo_server_error'
                    : 'zalo_api_error',
            debug_steps: debugSteps,
          };
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        const errorName = error.name || 'unknown';
        const errorMessage = error.message || 'unknown';
        const safeMessage = redactZaloTokenInMessage(errorMessage, accessHeader());
        
        debugSteps.push(`sendZaloTextMessage: ${errorName} - ${safeMessage}`);
        
        // Determine if retryable (network/timeout)
        const isRetryable = errorName === 'AbortError' || 
                           errorName.includes('Network') || 
                           errorName.includes('timeout') ||
                           error.code === 'ECONNRESET' ||
                           error.code === 'ETIMEDOUT';
        
        if (!isRetryable || attempt >= maxAttempts) {
          console.error('[Zalo] sendMessage exception:', safeMessage);
          debugSteps.push('zalo_real_exception');
          
          return {
            transport: 'zalo_real',
            error: 'network_error',
            debug_steps: debugSteps,
          };
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Should not reach here
    debugSteps.push('zalo_real_unexpected_end');
    return {
      transport: 'zalo_real',
      error: 'unknown_error',
      debug_steps: debugSteps,
    };
    
  } catch (error: any) {
    const errorMessage = error.message || 'unknown';
    const safeMessage = redactZaloTokenInMessage(errorMessage, getZaloAccessTokenResolved() ?? config.accessToken);
    
    console.error('[Zalo] sendMessage unexpected error:', safeMessage);
    debugSteps.push(`sendZaloTextMessage: unexpected error - ${safeMessage}`);
    
    return {
      transport: 'zalo_real',
      error: 'unexpected_error',
      debug_steps: debugSteps,
    };
  }
}