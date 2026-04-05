# Phase 15.0 Real Transport Design (ADR)

## Overview
This document outlines the architecture decision for implementing real platform API transports in ChatFlow Pro, moving beyond synthetic senders to actual message delivery via platform APIs.

## Problem Statement
Current system limitations:
- **Synthetic senders only**: All 7 channels use mock senders that don't actually deliver messages
- **No real integration**: Cannot send real messages to Telegram, WhatsApp, Messenger, etc.
- **Limited value**: System works internally but provides no real communication capability
- **Production readiness gap**: Missing critical component for real-world deployment

**Goal**: Implement first real transport (Telegram recommended) as proof-of-concept, establishing patterns for other channels.

## Decision: Telegram as First Real Transport

### Why Telegram?
1. **Simple API**: Well-documented, straightforward REST API
2. **Low barrier**: No business verification required (unlike WhatsApp Business)
3. **Webhook friendly**: Native webhook support aligns with current architecture
4. **Global reach**: Widely used across target markets
5. **Cost effective**: Free for basic messaging (no per-message fees)

### Alternative Considered: WhatsApp
- **Pros**: High business value, official business platform
- **Cons**: Requires business verification, Facebook Business Manager, approval process
- **Decision**: Defer to Phase 16+ due to complexity

## Architecture Design

### 1. Environment Configuration

#### Required Environment Variables
```bash
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ123456789
TELEGRAM_BOT_USERNAME=@YourBotUsername

# Optional Proxy Configuration (for restricted networks)
TELEGRAM_PROXY_URL=http://proxy.example.com:8080
TELEGRAM_PROXY_USERNAME=proxy_user
TELEGRAM_PROXY_PASSWORD=proxy_pass
```

#### Configuration Loading
```typescript
// src/config/telegram.ts
export interface TelegramConfig {
  botToken: string;
  botUsername?: string;
  proxy?: {
    url: string;
    username?: string;
    password?: string;
  };
}

export function loadTelegramConfig(): TelegramConfig {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is required');
  }

  return {
    botToken,
    botUsername: process.env.TELEGRAM_BOT_USERNAME,
    proxy: process.env.TELEGRAM_PROXY_URL ? {
      url: process.env.TELEGRAM_PROXY_URL,
      username: process.env.TELEGRAM_PROXY_USERNAME,
      password: process.env.TELEGRAM_PROXY_PASSWORD,
    } : undefined,
  };
}
```

### 2. Security Considerations

#### Token Security
- **Never log tokens**: Token values must never appear in logs, even when masked
- **Environment variables only**: Tokens only via env vars, not in code or config files
- **Runtime validation**: Validate token format (should match `^\d+:[\w-]+$`)
- **Error messages**: Generic error messages that don't leak token information

#### Secure Logging
```typescript
// BAD: Would leak token
console.error(`Telegram API failed with token: ${config.botToken}`);

// GOOD: Generic error
console.error('Telegram API failed: authentication error');

// BETTER: Masked token for debugging (only in development)
if (process.env.NODE_ENV === 'development') {
  const maskedToken = config.botToken 
    ? `${config.botToken.substring(0, 10)}...` 
    : '[no token]';
  console.debug(`Telegram config loaded, token: ${maskedToken}`);
}
```

### 3. Transport Interface Boundary

#### Current Sender Interface
```typescript
// src/channels/outbound-sender/index.ts (existing)
export interface ChannelSender {
  send(payload: ChannelOutboundPayload): Promise<ChannelSendResult>;
}

export interface ChannelSendResult {
  result: {
    channel: UnifiedChannelCode;
    provider_message_id?: string;
    debug_steps: string[];
    // ... other fields
  };
}
```

#### Telegram Sender Implementation
```typescript
// src/channels/adapters/telegram/real-sender.ts (new)
import type { ChannelSender, ChannelSendResult } from '../../outbound-sender';
import type { TelegramOutboundPayload } from './outbound';
import { TelegramConfig } from '../../../config/telegram';

export class TelegramRealSender implements ChannelSender {
  private config: TelegramConfig;
  private httpClient: AxiosInstance;

  constructor(config: TelegramConfig) {
    this.config = config;
    this.httpClient = createHttpClient(config);
  }

  async send(payload: TelegramOutboundPayload): Promise<ChannelSendResult> {
    const debugSteps: string[] = ['telegram_real_sender_start'];
    
    try {
      // 1. Prepare Telegram API request
      const apiPayload = this.prepareApiPayload(payload);
      debugSteps.push('telegram_api_payload_prepared');
      
      // 2. Send to Telegram API
      const response = await this.sendToTelegramApi(apiPayload);
      debugSteps.push('telegram_api_call_success');
      
      // 3. Parse response
      const providerMessageId = response.data.result.message_id?.toString();
      
      return {
        result: {
          channel: 'telegram',
          provider_message_id: providerMessageId,
          debug_steps: [...debugSteps, 'telegram_send_complete'],
        },
      };
    } catch (error) {
      debugSteps.push('telegram_api_error');
      return this.handleError(error, debugSteps);
    }
  }

  private async sendToTelegramApi(payload: any): Promise<any> {
    const url = `https://api.telegram.org/bot${this.config.botToken}/sendMessage`;
    
    // Implement retry logic (see Failure Strategy section)
    return this.httpClient.post(url, payload, {
      timeout: 10000, // 10 second timeout
    });
  }

  // ... other methods
}
```

### 4. Failure Strategy

#### Retry Logic
```typescript
private async sendWithRetry(
  url: string, 
  payload: any, 
  maxRetries: number = 1
): Promise<any> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.warn(`Telegram API retry attempt ${attempt}/${maxRetries}`);
        // Exponential backoff: 1s, 2s, 4s...
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, attempt - 1) * 1000)
        );
      }
      
      return await this.httpClient.post(url, payload, { timeout: 10000 });
    } catch (error) {
      lastError = error;
      
      // Only retry on network errors or 5xx status codes
      const shouldRetry = this.isRetryableError(error);
      if (!shouldRetry || attempt === maxRetries) {
        break;
      }
    }
  }
  
  throw lastError;
}

private isRetryableError(error: any): boolean {
  // Network errors (no response)
  if (!error.response) {
    return true;
  }
  
  const status = error.response.status;
  // Retry on 5xx server errors, 429 rate limits
  return status >= 500 || status === 429;
}
```

#### Degraded Fallback
```typescript
private handleError(error: any, debugSteps: string[]): ChannelSendResult {
  const errorType = this.classifyError(error);
  debugSteps.push(`telegram_error_${errorType}`);
  
  // Log appropriate level
  if (errorType === 'network' || errorType === 'server') {
    console.error(`Telegram API ${errorType} error:`, {
      message: error.message,
      status: error.response?.status,
    });
  } else if (errorType === 'client') {
    console.warn(`Telegram API client error:`, {
      message: error.message,
      status: error.response?.status,
    });
  }
  
  // Still return 200 OK to webhook (fail silent)
  return {
    result: {
      channel: 'telegram',
      debug_steps: [...debugSteps, 'telegram_send_failed_but_200_ok'],
      error_type: errorType,
      error_message: this.sanitizeErrorMessage(error),
    },
  };
}

private sanitizeErrorMessage(error: any): string {
  // Remove any token information from error messages
  let message = error.message || 'Unknown Telegram API error';
  message = message.replace(this.config.botToken, '[REDACTED]');
  return message;
}
```

### 5. Integration Points

#### Sender Factory Update
```typescript
// src/channels/outbound-sender/index.ts (updated)
import { TelegramRealSender } from '../adapters/telegram/real-sender';
import { TelegramConfig, loadTelegramConfig } from '../../config/telegram';

export function createChannelSender(channel: UnifiedChannelCode): ChannelSender {
  switch (channel) {
    case 'telegram':
      // Feature flag: use real sender if configured, otherwise synthetic
      if (process.env.TELEGRAM_BOT_TOKEN) {
        try {
          const config = loadTelegramConfig();
          return new TelegramRealSender(config);
        } catch (error) {
          console.error('Failed to create Telegram real sender, falling back to synthetic:', error);
          return new TelegramSyntheticSender();
        }
      }
      return new TelegramSyntheticSender();
      
    case 'website':
    case 'whatsapp':
    case 'messenger':
    case 'line':
    case 'zalo':
      // Other channels still use synthetic senders for now
      return createSyntheticSender(channel);
      
    default:
      throw new Error(`Unsupported channel: ${channel}`);
  }
}
```

#### Webhook Response Unchanged
- **HTTP 200 OK always**: Even if Telegram API fails, webhook returns 200
- **Debug metadata includes**: Success/failure status, error type (if any), debug steps
- **No user-facing impact**: Users see normal conversation flow, transport failures are internal

### 6. Telegram API Specifics

#### Message Format Mapping
| Unified Field | Telegram API Field | Notes |
|--------------|-------------------|-------|
| `reply_text` | `text` | Max 4096 characters |
| `session_id` | `chat_id` | Derived from `external_user_id` |
| N/A | `parse_mode` | Optional: "HTML" or "MarkdownV2" |
| N/A | `disable_web_page_preview` | Optional: boolean |
| N/A | `disable_notification` | Optional: boolean |

#### Chat ID Resolution
```typescript
private resolveChatId(payload: TelegramOutboundPayload): string | number {
  // Use external_user_id from session (should be Telegram user ID)
  // Fallback to thread_id if available
  const chatId = payload.session.external_user_id || payload.session.external_session_id;
  
  if (!chatId) {
    throw new Error('Cannot resolve Telegram chat_id: no external_user_id or external_session_id');
  }
  
  // Telegram chat IDs can be numbers (user IDs) or strings (channel usernames)
  return chatId;
}
```

### 7. Testing Strategy

#### Development Testing
1. **Local testing**: Use test bot token, real Telegram API
2. **Sandbox mode**: Environment variable `TELEGRAM_SANDBOX=true` to use synthetic even with token
3. **Mock server**: Optional local mock Telegram API for CI/CD

#### Production Testing
1. **Canary deployment**: Enable real transport for percentage of traffic
2. **A/B testing**: Compare synthetic vs real sender performance
3. **Monitoring**: Track success rates, latency, error types

### 8. Monitoring & Observability

#### Key Metrics
- **Success rate**: Percentage of successful Telegram API calls
- **Latency**: P50, P95, P99 response times
- **Error rate**: By error type (network, auth, rate limit, etc.)
- **Retry rate**: Percentage of calls requiring retry

#### Logging
```typescript
// Structured logging for monitoring
logger.info('Telegram message sent', {
  channel: 'telegram',
  chat_id: chatId,
  message_length: text.length,
  success: true,
  duration_ms: Date.now() - startTime,
  provider_message_id: response.data.result.message_id,
});

logger.error('Telegram message failed', {
  channel: 'telegram',
  chat_id: chatId,
  error_type: errorType,
  retry_attempted: retryAttempted,
  duration_ms: Date.now() - startTime,
});
```

### 9. Rollout Plan

#### Phase 1: Development & Testing
- Implement Telegram real sender
- Unit tests, integration tests
- Local testing with test bot

#### Phase 2: Staging Deployment
- Deploy to staging with real token
- Test with controlled user group
- Monitor metrics, fix issues

#### Phase 3: Production Canary
- Enable for 10% of Telegram traffic
- Monitor closely, compare with synthetic
- Gradually increase percentage

#### Phase 4: Full Production
- 100% real transport for Telegram
- Document learnings for other channels

### 10. Future Channel Expansion

#### Priority Order
1. **Telegram** (Phase 15) - Simple, low barrier
2. **WhatsApp** (Phase 16) - High business value, more complex
3. **Messenger** (Phase 17) - Facebook Graph API
4. **Line** (Phase 18) - Line Messaging API
5. **Zalo** (Phase 19) - Zalo OA API

#### Shared Patterns
- Environment variable configuration
- Retry with exponential backoff
- Fail silent with 200 OK
- Secure token handling
- Monitoring and metrics

## Implementation Notes

### No Breaking Changes
- **Webhook contracts unchanged**: Still 200 OK, same response format
- **Unified message model unchanged**: Same inbound/outbound interfaces
- **Synthetic senders remain**: Fallback if real transport not configured or fails
- **Feature flag controlled**: Real transport opt-in via environment variable

### Code Organization
```
src/
├── channels/
│   ├── adapters/
│   │   └── telegram/
│   │       ├── real-sender.ts      # New: Real Telegram sender
│   │       ├── synthetic-sender.ts # Existing: Synthetic sender
│   │       └── outbound.ts         # Existing: Payload mapping
│   └── outbound-sender/
│       └── index.ts               # Updated: Sender factory
└── config/
    └── telegram.ts                # New: Telegram configuration
```

### Dependencies
- **axios**: HTTP client for Telegram API calls
- **Optional**: Proxy agent if behind corporate firewall
- **No new major dependencies**: Keep lightweight

## Conclusion
This ADR defines the approach for implementing real platform transports, starting with Telegram. The design emphasizes:
1. **Security first**: Secure token handling, no sensitive data in logs
2. **Graceful degradation**: Retry logic, fail silent, synthetic fallback
3. **Incremental rollout**: Canary deployment, monitoring, gradual expansion
4. **Pattern establishment**: Reusable patterns for other channels

Telegram is chosen as the first real transport due to its simplicity and alignment with current architecture. Success with Telegram will validate the approach for subsequent channel implementations.