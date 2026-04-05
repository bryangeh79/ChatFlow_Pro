import { fetch } from 'undici';
import type { LineMessagingConfig } from '../../../config/line-messaging';
import { redactLineTokenInMessage } from '../../../config/line-messaging';

const LINE_TEXT_MAX_LENGTH = 5000; // Line text message limit

interface SendResult {
  transport: 'line_real';
  skipped?: boolean;
  reason?: string;
  messageId?: string;
  error?: string;
  debug_steps: string[];
}

/**
 * Parse recipient userId from Line session ID.
 * Format: line:{userId}:{session_id}
 * Returns userId or 'unknown' if parsing fails.
 */
export function parseLineRecipientFromSessionId(sessionId: string): string {
  const parts = sessionId.split(':');
  if (parts.length >= 3 && parts[0] === 'line') {
    return parts[1]; // userId
  }
  return 'unknown';
}

/**
 * Send a text message via Line Messaging API push endpoint.
 */
export async function sendLineTextMessage(
  config: LineMessagingConfig,
  sessionId: string,
  text: string | null | undefined
): Promise<SendResult> {
  const debugSteps: string[] = [];
  
  try {
    // 1. Parse recipient
    const recipient = parseLineRecipientFromSessionId(sessionId);
    if (recipient === 'unknown') {
      debugSteps.push('parseLineRecipientFromSessionId: unknown format, skipped');
      return { 
        transport: 'line_real', 
        skipped: true, 
        reason: 'invalid_session_format', 
        debug_steps: debugSteps 
      };
    }
    
    debugSteps.push(`parseLineRecipientFromSessionId: ${recipient}`);
    
    // 2. Validate text
    const trimmed = text?.trim() ?? '';
    if (!trimmed) {
      debugSteps.push('sendLineTextMessage: empty text, skipped');
      return { 
        transport: 'line_real', 
        skipped: true, 
        reason: 'empty_text', 
        debug_steps: debugSteps 
      };
    }
    
    // 3. Truncate if needed
    const messageText = trimmed.length > LINE_TEXT_MAX_LENGTH 
      ? trimmed.substring(0, LINE_TEXT_MAX_LENGTH - 3) + '...'
      : trimmed;
    
    if (trimmed.length > LINE_TEXT_MAX_LENGTH) {
      debugSteps.push(`sendLineTextMessage: truncated from ${trimmed.length} to ${LINE_TEXT_MAX_LENGTH} chars`);
    }
    
    // 4. Build request
    const url = `${config.apiBaseUrl}/v2/bot/message/push`;
    const body = JSON.stringify({
      to: recipient,
      messages: [
        {
          type: 'text',
          text: messageText,
        },
      ],
    });
    
    debugSteps.push(`sendLineTextMessage: POST ${url}`);
    
    // 5. Send with timeout and retry
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds
    
    let attempt = 0;
    const maxAttempts = 2;
    
    while (attempt < maxAttempts) {
      attempt++;
      debugSteps.push(`sendLineTextMessage: attempt ${attempt}/${maxAttempts}`);
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.channelAccessToken}`,
            'Content-Type': 'application/json',
          },
          body,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          await response.json(); // Consume response but we don't need it
          debugSteps.push(`sendLineTextMessage: success (${response.status})`);
          
          // Line push API doesn't return message IDs in the same way as reply API
          // Use a stable placeholder for messageId
          const messageId = `line_push_${Date.now()}`;
          
          return {
            transport: 'line_real',
            messageId,
            debug_steps: debugSteps,
          };
        }
        
        // Handle errors
        const status = response.status;
        const responseText = await response.text().catch(() => '');
        
        debugSteps.push(`sendLineTextMessage: HTTP ${status} - ${responseText.substring(0, 200)}`);
        
        // Determine if retryable
        const isRetryable = status >= 500 || status === 429;
        
        if (!isRetryable || attempt >= maxAttempts) {
          // Final failure
          const safeDesc = redactLineTokenInMessage(`Line API error: ${status} ${responseText.substring(0, 100)}`);
          console.error('[Line] sendMessage failed:', { status, description: safeDesc });
          debugSteps.push('line_real_failed');
          
          return {
            transport: 'line_real',
            error: status === 401 ? 'invalid_token' : 
                   status === 429 ? 'rate_limited' : 
                   status >= 500 ? 'line_server_error' : 'line_api_error',
            debug_steps: debugSteps,
          };
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        const errorName = error.name || 'unknown';
        const errorMessage = error.message || 'unknown';
        const safeMessage = redactLineTokenInMessage(errorMessage);
        
        debugSteps.push(`sendLineTextMessage: ${errorName} - ${safeMessage}`);
        
        // Determine if retryable (network/timeout)
        const isRetryable = errorName === 'AbortError' || 
                           errorName.includes('Network') || 
                           errorName.includes('timeout') ||
                           error.code === 'ECONNRESET' ||
                           error.code === 'ETIMEDOUT';
        
        if (!isRetryable || attempt >= maxAttempts) {
          console.error('[Line] sendMessage exception:', safeMessage);
          debugSteps.push('line_real_exception');
          
          return {
            transport: 'line_real',
            error: 'network_error',
            debug_steps: debugSteps,
          };
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Should not reach here
    debugSteps.push('line_real_unexpected_end');
    return {
      transport: 'line_real',
      error: 'unknown_error',
      debug_steps: debugSteps,
    };
    
  } catch (error: any) {
    const errorMessage = error.message || 'unknown';
    const safeMessage = redactLineTokenInMessage(errorMessage);
    
    console.error('[Line] sendMessage unexpected error:', safeMessage);
    debugSteps.push(`sendLineTextMessage: unexpected error - ${safeMessage}`);
    
    return {
      transport: 'line_real',
      error: 'unexpected_error',
      debug_steps: debugSteps,
    };
  }
}