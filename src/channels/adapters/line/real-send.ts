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
 * SaaS multi-tenant format: {tenant_id}:line:{userId}:{session_id}
 * Legacy format: line:{userId}:{session_id}
 * Returns userId or null if parsing fails.
 */
export function parseLineRecipientFromSessionId(sessionId: string): string | null {
  const parts = sessionId.split(':');
  // SaaS multi-tenant format: {tenant_id}:line:{user_id}:{session_id}
  if (parts[1] === 'line' && parts.length >= 4) {
    const userId = parts[2];
    return userId && userId !== 'unknown' && userId.trim() !== '' ? userId : null;
  }
  // Legacy format: line:{userId}:{session_id}
  if (parts[0] === 'line' && parts.length >= 3) {
    const userId = parts[1];
    return userId && userId !== 'unknown' && userId.trim() !== '' ? userId : null;
  }
  return null;
}

/**
 * Send a text message via Line Messaging API push endpoint.
 */
export async function sendLineTextMessage(
  config: LineMessagingConfig,
  sessionId: string,
  text: string | null | undefined,
  /** Optional quick-reply button labels rendered as LINE quickReply items. */
  quickReplyButtons?: string[],
): Promise<SendResult> {
  const debugSteps: string[] = [];
  
  try {
    // 1. Parse recipient
    const recipient = parseLineRecipientFromSessionId(sessionId);
    if (!recipient) {
      debugSteps.push('parseLineRecipientFromSessionId: invalid format, skipped');
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

    // Build LINE quickReply items if buttons provided (max 13 per LINE spec, we cap at 5)
    const lineMessage: Record<string, unknown> = { type: 'text', text: messageText };
    if (quickReplyButtons && quickReplyButtons.length > 0) {
      lineMessage.quickReply = {
        items: quickReplyButtons.slice(0, 5).map((label) => ({
          type: 'action',
          action: {
            type: 'message',
            label: label.substring(0, 20), // LINE label max 20 chars
            text: label,
          },
        })),
      };
    }

    const body = JSON.stringify({
      to: recipient,
      messages: [lineMessage],
    });
    
    debugSteps.push(`sendLineTextMessage: POST ${url}`);
    
    // 5. Send with timeout and retry (each attempt gets its own timeout)
    let attempt = 0;
    const maxAttempts = 2;
    
    while (attempt < maxAttempts) {
      attempt++;
      debugSteps.push(`sendLineTextMessage: attempt ${attempt}/${maxAttempts}`);
      
      // Each attempt gets its own AbortController and timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds
      
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
          const safeDesc = redactLineTokenInMessage(`Line API error: ${status} ${responseText.substring(0, 100)}`, config.channelAccessToken);
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
        const safeMessage = redactLineTokenInMessage(errorMessage, config.channelAccessToken);
        
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
    const safeMessage = redactLineTokenInMessage(errorMessage, config.channelAccessToken);
    
    console.error('[Line] sendMessage unexpected error:', safeMessage);
    debugSteps.push(`sendLineTextMessage: unexpected error - ${safeMessage}`);
    
    return {
      transport: 'line_real',
      error: 'unexpected_error',
      debug_steps: debugSteps,
    };
  }
}