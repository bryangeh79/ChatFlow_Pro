# Phase 15.6 — Messenger real outbound ADR

## Overview

Adds real Facebook Messenger Graph API outbound transport, following the same pattern as Telegram (Phase 15.1) and WhatsApp Cloud (Phase 15.5). This ADR defines the architecture; implementation will follow in a separate phase.

## Environment Variables

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `MESSENGER_PAGE_ACCESS_TOKEN` | Facebook Page access token | – | Required for real send; never logged |
| `MESSENGER_PAGE_ID` | Facebook Page ID | – | Required; numeric ID of the Facebook Page |
| `MESSENGER_API_VERSION` | Graph API version | `v19.0` | Optional; follows same version strategy as WhatsApp |
| `MESSENGER_SANDBOX` | Disable real send (use synthetic) | – | `true`/`1` to force synthetic sender |
| `MESSENGER_GRAPH_DISABLED` | Alternative disable flag | – | `true`/`1` to force synthetic sender |

### Synthetic Fallback Conditions
Real send is **disabled** when any of:
- `MESSENGER_SANDBOX` is `true` or `1`
- `MESSENGER_GRAPH_DISABLED` is `true` or `1`
- `MESSENGER_PAGE_ACCESS_TOKEN` is missing/empty
- `MESSENGER_PAGE_ID` is missing/empty

Otherwise, real Messenger Graph API calls are made.

## API Endpoint

```
POST https://graph.facebook.com/v{version}/{page-id}/messages
```

### Headers
```
Authorization: Bearer {MESSENGER_PAGE_ACCESS_TOKEN}
Content-Type: application/json
```

### Minimal Request Body
```json
{
  "recipient": {
    "id": "{psid}"
  },
  "message": {
    "text": "{message_text}"
  },
  "messaging_type": "RESPONSE"
}
```

**Note**: The `messaging_type` field is required by Messenger Send API documentation. Use `"RESPONSE"` for non-promotional messages sent in response to user messages.

## Session ID Mapping

Current Messenger session ID format (from `normalizeMessengerInbound`):
```
messenger:{psid}:{session_id}
```

**Mapping rule**: Extract `{psid}` as the recipient ID for outbound.

Example:
- Session ID: `messenger:123456789012345:session-abc`
- Recipient: `123456789012345`

This matches the inbound normalization where `psid` is the user's Page-scoped ID (PSID).

## Implementation Pattern (Following Telegram/WhatsApp)

### Configuration Module (`src/config/messenger-graph.ts`)
```typescript
interface MessengerGraphConfig {
  pageAccessToken: string;
  pageId: string;
  apiVersion: string; // e.g., "v19.0"
}

function loadMessengerGraphConfig(): MessengerGraphConfig | null {
  // Check sandbox/disabled flags
  // Validate required env vars
  // Return config or null for synthetic
}
```

### Real Send Module (`src/channels/adapters/messenger/real-send.ts`)
```typescript
async function sendMessengerTextMessage(
  config: MessengerGraphConfig,
  sessionId: string,
  text: string | null | undefined
): Promise<SendResult> {
  // 1. Parse recipient PSID from sessionId
  // 2. Build Graph API request
  // 3. Call with timeout + single retry on 5xx/429
  // 4. Map success/failure to SendResult
}
```

### Outbound Sender Integration (`src/channels/outbound-sender/index.ts`)
```typescript
// In Messenger branch:
if (shouldSendMessengerReal) {
  const config = loadMessengerGraphConfig();
  if (config) {
    return await sendMessengerTextMessage(config, session_id, reply_text);
  }
}
// Fallback to synthetic sender
```

## Timeout and Retry Strategy

**Align with Telegram/WhatsApp implementation**:
- **Timeout**: 10 seconds (AbortSignal.timeout)
- **Retry**: Single retry after 1 second for:
  - HTTP 5xx status codes
  - HTTP 429 (Rate Limited)
  - Network errors
- **No retry** for:
  - HTTP 4xx (client errors)
  - Invalid token/page ID

## Failure Handling

Use existing `createSendFailureResult` pattern:
```typescript
return createSendFailureResult({
  transport: 'messenger_real',
  error: 'messenger_api_error',
  description: safeDescription, // redacted
  debug_steps: [...],
});
```

**Webhook response**: Always returns HTTP 200 (as per existing contract), even when Messenger API call fails.

## Security Requirements

1. **No token logging**: `MESSENGER_PAGE_ACCESS_TOKEN` never appears in logs, even in error messages
2. **Redaction helper**: Create `redactMessengerTokenInMessage()` similar to Telegram/WhatsApp
3. **HTTP client**: Use `undici` `fetch` (project convention), not axios
4. **Environment only**: Tokens read from env, not hardcoded or config files

## Error Mapping

| Messenger API Error | Mapped Result |
|-------------------|---------------|
| Success (200) | `{ transport: 'messenger_real', messageId: string }` |
| Invalid token (401) | `{ transport: 'messenger_real', error: 'invalid_token' }` |
| Rate limit (429) | `{ transport: 'messenger_real', error: 'rate_limited' }` (retried once) |
| Server error (5xx) | `{ transport: 'messenger_real', error: 'messenger_server_error' }` (retried once) |
| Network/timeout | `{ transport: 'messenger_real', error: 'network_error' }` (retried once) |

## Naming Conflict Table

| Platform | Token Env | Page/Phone ID Env | API Version Env |
|----------|-----------|-------------------|-----------------|
| **WhatsApp** | `WHATSAPP_ACCESS_TOKEN` | `WHATSAPP_PHONE_NUMBER_ID` | `WHATSAPP_API_VERSION` |
| **Messenger** | `MESSENGER_PAGE_ACCESS_TOKEN` | `MESSENGER_PAGE_ID` | `MESSENGER_API_VERSION` |

**No conflicts**: Each platform uses distinct environment variable names, allowing separate configuration.

## Shared Graph API Infrastructure

Both WhatsApp and Messenger use Facebook Graph API:
- **Same base URL**: `https://graph.facebook.com`
- **Same versioning**: Default `v19.0` (can be overridden per platform)
- **Same authentication**: Bearer tokens
- **Different endpoints**: `/v{version}/{phone-number-id}/messages` vs `/v{version}/{page-id}/messages`

Implementation can share:
- HTTP client configuration (timeout, retry logic)
- Error handling patterns
- Token redaction utilities

## Out-of-Scope for This ADR

✅ **Already implemented** (Phase 15.4a):
- Messenger POST signature validation (`X‑Hub‑Signature‑256`)
- Inbound webhook parsing and normalization

❌ **Not in this phase**:
- Messenger message types beyond text
- Messenger quick replies, templates, attachments
- Messenger user profile API
- Any changes to inbound processing

## Version Impact

- **Current**: Pro_v1.07.8 (`package.json` 1.7.8)
- **No version bump** in this ADR phase
- Version will increment to 1.7.9 when implementation is delivered

## Next Steps After ADR Approval

1. Create `src/config/messenger-graph.ts` (configuration loading)
2. Create `src/channels/adapters/messenger/real-send.ts` (API client)
3. Update `src/channels/outbound-sender/index.ts` (integration)
4. Add `.env.example` variables (placeholder in this ADR)
5. Test with sandbox token, then production
6. Bump version to 1.7.9 (Pro_v1.07.9)

## Comparison with Existing Real Transports

| Aspect | Telegram | WhatsApp Cloud | Messenger Graph |
|--------|----------|---------------|----------------|
| Config loading | `loadTelegramConfigForRealSend()` | `loadWhatsAppCloudConfig()` | `loadMessengerGraphConfig()` |
| Sandbox flag | `TELEGRAM_SANDBOX` | `WHATSAPP_SANDBOX` | `MESSENGER_SANDBOX` |
| Token env | `TELEGRAM_BOT_TOKEN` | `WHATSAPP_ACCESS_TOKEN` | `MESSENGER_PAGE_ACCESS_TOKEN` |
| API endpoint | `api.telegram.org` | `graph.facebook.com` | `graph.facebook.com` |
| Session mapping | `telegram:{chat}:{user}` → chat ID | `whatsapp:{phone}:{session}` → phone | `messenger:{psid}:{session}` → PSID |
| Retry logic | Single retry on 5xx/429 | Single retry on 5xx/429 | Single retry on 5xx/429 |
| Timeout | 10 seconds | 10 seconds | 10 seconds |

This symmetry ensures consistent behavior across all real transport implementations.
