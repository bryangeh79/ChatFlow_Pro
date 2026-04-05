# Phase 15.8 — Zalo real outbound ADR

## Overview

Adds real Zalo Open API outbound transport, following the same pattern as Telegram (Phase 15.1), WhatsApp Cloud (Phase 15.5), Messenger Graph (Phase 15.6), and Line (Phase 15.7). This ADR defines the architecture; implementation will follow in a separate phase.

## Security Context (引用 docs/144)

**Inbound security (already implemented)**:
- **No official POST signature**: Zalo does not provide standard HMAC signature headers for webhook payloads (per Phase 15.4c research)
- **IP Whitelisting**: Primary security mechanism - requires configuring server IP addresses in Zalo OA Console
- **OAuth 2.0**: Used for outbound API calls (access tokens)

**Implication**: Zalo inbound webhook (`POST /webhooks/zalo`) remains without signature validation, relying on IP whitelisting as per Zalo's documented security model.

## Environment Variables

Based on Zalo Open API documentation:

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `ZALO_ACCESS_TOKEN` | Zalo Open API access token (OAuth 2.0) | – | Required for real send; never logged |
| `ZALO_OA_ID` | Zalo Official Account ID | – | Required; numeric ID of the Zalo OA |
| `ZALO_API_BASE_URL` | Zalo API base URL | `https://openapi.zalo.me` | Optional override for testing |
| `ZALO_SANDBOX` | Disable real send (use synthetic) | – | `true`/`1` to force synthetic sender |
| `ZALO_MESSAGING_DISABLED` | Alternative disable flag | – | `true`/`1` to force synthetic sender |

### Synthetic Fallback Conditions
Real send is **disabled** when any of:
- `ZALO_SANDBOX` is `true` or `1`
- `ZALO_MESSAGING_DISABLED` is `true` or `1`
- `ZALO_ACCESS_TOKEN` is missing/empty
- `ZALO_OA_ID` is missing/empty

Otherwise, real Zalo Open API calls are made.

## API Endpoint

Based on Zalo Open API v2.0 documentation:

```
POST https://openapi.zalo.me/v2.0/oa/message
```

### Headers
```
access_token: {ZALO_ACCESS_TOKEN}
Content-Type: application/json
```

**Note**: Zalo uses `access_token` header (not `Authorization: Bearer`).

### Minimal Request Body
```json
{
  "recipient": {
    "user_id": "{user_id}"
  },
  "message": {
    "text": "{message_text}"
  }
}
```

**Note**: Zalo OA ID (`ZALO_OA_ID`) is used for configuration validation but does not appear in the request body. The access token already contains OA identity.

## Session ID Mapping

Current Zalo session ID format (from `normalizeZaloInbound`):
```
zalo:{user_id}:{session_id}
```

**Mapping rule**: Extract `{user_id}` (second segment) as the recipient for outbound.

Example:
- Session ID: `zalo:123456789012345:session-abc`
- Recipient: `123456789012345`

This matches the inbound normalization where `user_id` is the Zalo user ID.

## Implementation Pattern (Following Other Transports)

### Configuration Module (`src/config/zalo-openapi.ts`)
```typescript
interface ZaloOpenApiConfig {
  accessToken: string;
  oaId: string;
  apiBaseUrl: string; // default "https://openapi.zalo.me"
}

function loadZaloOpenApiConfig(): ZaloOpenApiConfig | null {
  // Check sandbox/disabled flags
  // Validate required env vars
  // Return config or null for synthetic
}
```

### Real Send Module (`src/channels/adapters/zalo/real-send.ts`)
```typescript
async function sendZaloTextMessage(
  config: ZaloOpenApiConfig,
  sessionId: string,
  text: string | null | undefined
): Promise<SendResult> {
  // 1. Parse recipient from sessionId
  // 2. Build Zalo Open API request
  // 3. Call with timeout + single retry on 5xx/429
  // 4. Map success/failure to SendResult
}
```

### Outbound Sender Integration (`src/channels/outbound-sender/index.ts`)
```typescript
// In Zalo branch:
if (shouldSendZaloReal) {
  const config = loadZaloOpenApiConfig();
  if (config) {
    return await sendZaloTextMessage(config, session_id, reply_text);
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
  - Invalid token/OA ID

## Failure Handling

Use existing pattern:
```typescript
return {
  transport: 'zalo_real',
  error: 'zalo_api_error',
  debug_steps: [...],
};
```

**Webhook response**: Always returns HTTP 200 (as per existing contract), even when Zalo API call fails.

## Security Requirements

1. **No token logging**: `ZALO_ACCESS_TOKEN` never appears in logs, even in error messages
2. **Redaction helper**: Create `redactZaloTokenInMessage()` similar to other transports
3. **HTTP client**: Use `undici` `fetch` (project convention)
4. **Environment only**: Tokens read from env, not hardcoded or config files

## Error Mapping

| Zalo API Error | Mapped Result |
|----------------|---------------|
| Success (200) | `{ transport: 'zalo_real', messageId: string }` |
| Invalid token (401) | `{ transport: 'zalo_real', error: 'invalid_token' }` |
| Rate limit (429) | `{ transport: 'zalo_real', error: 'rate_limited' }` (retried once) |
| Server error (5xx) | `{ transport: 'zalo_real', error: 'zalo_server_error' }` (retried once) |
| Network/timeout | `{ transport: 'zalo_real', error: 'network_error' }` (retried once) |

## Official Documentation References

Key Zalo Open API documentation sections:

1. **Authentication**: OAuth 2.0 access tokens for API calls
2. **Send Message API**: `POST /v2.0/oa/message` endpoint
3. **Message Types**: Text message format
4. **Error Codes**: HTTP status codes and error responses
5. **Rate Limits**: Request limits and throttling

**Note**: Zalo documentation may require Vietnamese language access. Implementation should verify the latest API version and endpoint structure.

## Out-of-Scope for This ADR

✅ **Already implemented** (Phase 15.4c):
- Zalo inbound webhook parsing and normalization
- No POST signature validation (per research findings)

❌ **Not in this phase**:
- Zalo message types beyond text
- Zalo templates, media, attachments
- Zalo user profile API
- Any changes to inbound processing

## Version Impact

- **Current**: Pro_v1.07.10 (`package.json` 1.7.10)
- **No version bump** in this ADR phase
- Version will increment when implementation is delivered

## Next Steps After ADR Approval

1. Create `src/config/zalo-openapi.ts` (configuration loading)
2. Create `src/channels/adapters/zalo/real-send.ts` (API client)
3. Update `src/channels/outbound-sender/index.ts` (integration)
4. Add `.env.example` variables (placeholder in this ADR)
5. Test with sandbox token, then production
6. Bump version when implementation is delivered

## Comparison with Existing Real Transports

| Aspect | Telegram | WhatsApp | Messenger | Line | Zalo |
|--------|----------|----------|-----------|------|------|
| Config loading | `loadTelegramConfig()` | `loadWhatsAppCloudConfig()` | `loadMessengerGraphConfig()` | `loadLineMessagingConfig()` | `loadZaloOpenApiConfig()` |
| Sandbox flag | `TELEGRAM_SANDBOX` | `WHATSAPP_SANDBOX` | `MESSENGER_SANDBOX` | `LINE_SANDBOX` | `ZALO_SANDBOX` |
| Token env | `TELEGRAM_BOT_TOKEN` | `WHATSAPP_ACCESS_TOKEN` | `MESSENGER_PAGE_ACCESS_TOKEN` | `LINE_CHANNEL_ACCESS_TOKEN` | `ZALO_ACCESS_TOKEN` |
| ID env | – | `WHATSAPP_PHONE_NUMBER_ID` | `MESSENGER_PAGE_ID` | – | `ZALO_OA_ID` |
| API endpoint | `api.telegram.org` | `graph.facebook.com` | `graph.facebook.com` | `api.line.me` | `openapi.zalo.me` |
| Auth header | `Authorization: Bearer` | `Authorization: Bearer` | `Authorization: Bearer` | `Authorization: Bearer` | `access_token` |
| Session mapping | `telegram:{chat}:{user}` → chat ID | `whatsapp:{phone}:{session}` → phone | `messenger:{psid}:{session}` → PSID | `line:{userId}:{session}` → userId | `zalo:{user_id}:{session}` → user_id |
| Retry logic | Single retry on 5xx/429 | Single retry on 5xx/429 | Single retry on 5xx/429 | Single retry on 5xx/429 | Single retry on 5xx/429 |
| Timeout | 10 seconds | 10 seconds | 10 seconds | 10 seconds | 10 seconds |

This symmetry ensures consistent behavior across all real transport implementations.

## Implementation Notes

1. **Session ID parsing**: Extract `user_id` from `zalo:{user_id}:{session}` format
2. **API endpoint**: `POST https://openapi.zalo.me/v2.0/oa/message`
3. **Request headers**: `access_token` header (not `Authorization`)
4. **Request body**: `{ "recipient": { "user_id": "..." }, "message": { "text": "..." } }`
5. **Error handling**: Map Zalo-specific error codes to our standard error types
6. **Token security**: Same redaction pattern as other transports

## Field Consistency Note

Zalo inbound webhook uses `user_id_by_app` field. Our normalization extracts this as `user_id` (second segment in session ID). Outbound must use the same `user_id` value for consistency.