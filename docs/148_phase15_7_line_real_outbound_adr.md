# Phase 15.7 — Line real outbound ADR

## Overview

Adds real Line Messaging API outbound transport, following the same pattern as Telegram (Phase 15.1), WhatsApp Cloud (Phase 15.5), and Messenger Graph (Phase 15.6). This ADR defines the architecture; implementation will follow in a separate phase.

## Environment Variables

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `LINE_CHANNEL_ACCESS_TOKEN` | Line Messaging API channel access token | – | Required for real send; never logged |
| `LINE_CHANNEL_SECRET` | Line channel secret (for inbound signature) | – | Already used for POST signature validation (Phase 15.4b) |
| `LINE_API_BASE_URL` | Line API base URL | `https://api.line.me` | Optional override for testing |
| `LINE_SANDBOX` | Disable real send (use synthetic) | – | `true`/`1` to force synthetic sender |
| `LINE_MESSAGING_DISABLED` | Alternative disable flag | – | `true`/`1` to force synthetic sender |

### Synthetic Fallback Conditions
Real send is **disabled** when any of:
- `LINE_SANDBOX` is `true` or `1`
- `LINE_MESSAGING_DISABLED` is `true` or `1`
- `LINE_CHANNEL_ACCESS_TOKEN` is missing/empty

Otherwise, real Line Messaging API calls are made.

## API Endpoint

```
POST https://api.line.me/v2/bot/message/push
```

### Headers
```
Authorization: Bearer {LINE_CHANNEL_ACCESS_TOKEN}
Content-Type: application/json
```

### Minimal Request Body
```json
{
  "to": "{userId}",
  "messages": [
    {
      "type": "text",
      "text": "{message_text}"
    }
  ]
}
```

**Note**: Line push API (`/v2/bot/message/push`) is used instead of reply API (`/v2/bot/message/reply`) because reply tokens expire quickly (typically 30 seconds) and our session-based architecture doesn't guarantee immediate response. Push API uses `userId` which we already have in session ID.

## Session ID Mapping and Reply Token Challenge

Current Line session ID format (from `normalizeLineInbound`):
```
line:{userId}:{session_id}
```

**Challenge**: Line's reply API requires a `replyToken` which is only valid for a short time (typically 30 seconds). Our session-based architecture doesn't preserve reply tokens across requests.

**Potential solutions**:
1. **Store reply token in session**: Add `line_reply_token` to session state, use it for next outbound
2. **Push message alternative**: Use `POST /v2/bot/message/push` with `userId` instead of reply token
3. **Hybrid approach**: Try reply with token if available, fallback to push

**Recommended approach**: Use **push messages** for consistency:
- Session mapping: `line:{userId}:{session}` → extract `{userId}` as recipient
- Use push API: `POST https://api.line.me/v2/bot/message/push`
- Request body: `{ "to": "{userId}", "messages": [...] }`

## Implementation Pattern (Following Telegram/WhatsApp/Messenger)

### Configuration Module (`src/config/line-messaging.ts`)
```typescript
interface LineMessagingConfig {
  channelAccessToken: string;
  apiBaseUrl: string; // default "https://api.line.me"
}

function loadLineMessagingConfig(): LineMessagingConfig | null {
  // Check sandbox/disabled flags
  // Validate required env vars
  // Return config or null for synthetic
}
```

### Real Send Module (`src/channels/adapters/line/real-send.ts`)
```typescript
async function sendLineTextMessage(
  config: LineMessagingConfig,
  sessionId: string,
  text: string | null | undefined
): Promise<SendResult> {
  // 1. Parse recipient userId from sessionId
  // 2. Build Line push API request
  // 3. Call with timeout + single retry on 5xx/429
  // 4. Map success/failure to SendResult
}
```

### Outbound Sender Integration (`src/channels/outbound-sender/index.ts`)
```typescript
// In Line branch:
if (shouldSendLineReal) {
  const config = loadLineMessagingConfig();
  if (config) {
    return await sendLineTextMessage(config, session_id, reply_text);
  }
}
// Fallback to synthetic sender
```

## Timeout and Retry Strategy

**Align with existing real transports**:
- **Timeout**: 10 seconds (AbortSignal.timeout)
- **Retry**: Single retry after 1 second for:
  - HTTP 5xx status codes
  - HTTP 429 (Rate Limited)
  - Network errors
- **No retry** for:
  - HTTP 4xx (client errors)
  - Invalid token

## Failure Handling

Use existing `createSendFailureResult` pattern:
```typescript
return createSendFailureResult({
  transport: 'line_real',
  error: 'line_api_error',
  description: safeDescription, // redacted
  debug_steps: [...],
});
```

**Webhook response**: Always returns HTTP 200 (as per existing contract), even when Line API call fails.

## Security Requirements

1. **No token logging**: `LINE_CHANNEL_ACCESS_TOKEN` never appears in logs, even in error messages
2. **Redaction helper**: Create `redactLineTokenInMessage()` similar to other transports
3. **HTTP client**: Use `undici` `fetch` (project convention)
4. **Environment only**: Tokens read from env, not hardcoded or config files

## Error Mapping

| Line API Error | Mapped Result |
|----------------|---------------|
| Success (200) | `{ transport: 'line_real', messageId: string }` (Note: Line push API doesn't return message IDs; implementation uses stable placeholder `line_push_{timestamp}`) |
| Invalid token (401) | `{ transport: 'line_real', error: 'invalid_token' }` |
| Rate limit (429) | `{ transport: 'line_real', error: 'rate_limited' }` (retried once) |
| Server error (5xx) | `{ transport: 'line_real', error: 'line_server_error' }` (retried once) |
| Network/timeout | `{ transport: 'line_real', error: 'network_error' }` (retried once) |

## Out-of-Scope for This ADR

✅ **Already implemented** (Phase 15.4b):
- Line POST signature validation (`X‑Line‑Signature`)
- Inbound webhook parsing and normalization

❌ **Not in this phase**:
- Line message types beyond text
- Line Flex Messages, templates, stickers
- Line user profile API
- Any changes to inbound processing

## Version Impact

- **Current**: Pro_v1.07.9 (`package.json` 1.7.9)
- **No version bump** in this ADR phase
- Version will increment when implementation is delivered

## Next Steps After ADR Approval

1. Create `src/config/line-messaging.ts` (configuration loading)
2. Create `src/channels/adapters/line/real-send.ts` (API client)
3. Update `src/channels/outbound-sender/index.ts` (integration)
4. Add `.env.example` variables (placeholder in this ADR)
5. Test with sandbox token, then production
6. Bump version when implementation is delivered

## Comparison with Existing Real Transports

| Aspect | Telegram | WhatsApp Cloud | Messenger Graph | Line |
|--------|----------|---------------|----------------|------|
| Config loading | `loadTelegramConfig()` | `loadWhatsAppCloudConfig()` | `loadMessengerGraphConfig()` | `loadLineMessagingConfig()` |
| Sandbox flag | `TELEGRAM_SANDBOX` | `WHATSAPP_SANDBOX` | `MESSENGER_SANDBOX` | `LINE_SANDBOX` |
| Token env | `TELEGRAM_BOT_TOKEN` | `WHATSAPP_ACCESS_TOKEN` | `MESSENGER_PAGE_ACCESS_TOKEN` | `LINE_CHANNEL_ACCESS_TOKEN` |
| API endpoint | `api.telegram.org` | `graph.facebook.com` | `graph.facebook.com` | `api.line.me` |
| Session mapping | `telegram:{chat}:{user}` → chat ID | `whatsapp:{phone}:{session}` → phone | `messenger:{psid}:{session}` → PSID | `line:{userId}:{session}` → userId |
| Message type | `sendMessage` | `messages` (text) | `messages` (text) | `message/push` (text) |
| Retry logic | Single retry on 5xx/429 | Single retry on 5xx/429 | Single retry on 5xx/429 | Single retry on 5xx/429 |
| Timeout | 10 seconds | 10 seconds | 10 seconds | 10 seconds |

This symmetry ensures consistent behavior across all real transport implementations.

## Push vs Reply Decision

**Decision**: Use **push messages** (`/v2/bot/message/push`) instead of reply messages (`/v2/bot/message/reply`) because:
1. **Reply tokens expire quickly** (30 seconds) and our session-based architecture doesn't guarantee immediate response
2. **Push API uses userId** which we already have in session ID
3. **Simpler implementation** - no need to store and manage reply tokens
4. **Consistent with other platforms** - all use recipient ID rather than ephemeral tokens

**Limitation**: Push messages may have different rate limits than reply messages, but this aligns with our timeout/retry strategy.

## Implementation Notes

1. **Session ID parsing**: Extract `userId` from `line:{userId}:{session}` format
2. **Push API endpoint**: `POST https://api.line.me/v2/bot/message/push`
3. **Request body**: `{ "to": "{userId}", "messages": [{ "type": "text", "text": "..." }] }`
4. **Error handling**: Map Line-specific error codes to our standard error types
5. **Token security**: Same redaction pattern as other transports