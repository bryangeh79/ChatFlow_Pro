# Phase 15.5 — WhatsApp Cloud API real outbound ADR

## Overview

Adds real WhatsApp Cloud API outbound transport, following the same pattern as Telegram real transport (Phase 15.0–15.1). This ADR defines the architecture; implementation will follow in a separate phase.

## Environment Variables

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp Cloud API access token | – | Required for real send; never logged |
| `WHATSAPP_PHONE_NUMBER_ID` | Business phone number ID | – | Required; format: numeric ID from Meta Business Manager |
| `WHATSAPP_API_VERSION` | Graph API version | `v19.0` | Optional; follows Meta's current stable version |
| `WHATSAPP_SANDBOX` | Disable real send (use synthetic) | – | `true`/`1` to force synthetic sender (like `TELEGRAM_SANDBOX`) |
| `WHATSAPP_CLOUD_DISABLED` | Alternative disable flag | – | `true`/`1` to force synthetic sender |

### Synthetic Fallback Conditions
Real send is **disabled** when any of:
- `WHATSAPP_SANDBOX` is `true` or `1`
- `WHATSAPP_CLOUD_DISABLED` is `true` or `1`
- `WHATSAPP_ACCESS_TOKEN` is missing/empty
- `WHATSAPP_PHONE_NUMBER_ID` is missing/empty

Otherwise, real WhatsApp Cloud API calls are made.

## API Endpoint

```
POST https://graph.facebook.com/v{version}/{phone-number-id}/messages
```

### Headers
```
Authorization: Bearer {WHATSAPP_ACCESS_TOKEN}
Content-Type: application/json
```

### Minimal Request Body
```json
{
  "messaging_product": "whatsapp",
  "to": "{recipient_phone_number}",
  "type": "text",
  "text": {
    "body": "{message_text}"
  }
}
```

## Session ID Mapping

Current WhatsApp session ID format (from `normalizeWhatsAppInbound`):
```
whatsapp:{user_id}:{session_id}
```

**Mapping rule**: Extract `{user_id}` as the recipient phone number for outbound.

Example:
- Session ID: `whatsapp:1234567890:session-abc`
- Recipient: `1234567890`

This matches the inbound normalization where `user_id` is the WhatsApp phone number.

## Implementation Pattern (Following Telegram)

### Configuration Module (`src/config/whatsapp-cloud.ts`)
```typescript
interface WhatsAppCloudConfig {
  accessToken: string;
  phoneNumberId: string;
  apiVersion: string; // e.g., "v19.0"
}

function loadWhatsAppCloudConfig(): WhatsAppCloudConfig | null {
  // Check sandbox/disabled flags
  // Validate required env vars
  // Return config or null for synthetic
}
```

### Real Send Module (`src/channels/adapters/whatsapp/real-send.ts`)
```typescript
async function sendWhatsAppTextMessage(
  config: WhatsAppCloudConfig,
  sessionId: string,
  text: string | null | undefined
): Promise<SendResult> {
  // 1. Parse recipient from sessionId
  // 2. Build Graph API request
  // 3. Call with timeout + single retry on 5xx/429
  // 4. Map success/failure to SendResult
}
```

### Outbound Sender Integration (`src/channels/outbound-sender/index.ts`)
```typescript
// In WhatsApp branch:
if (shouldSendWhatsAppReal) {
  const config = loadWhatsAppCloudConfig();
  if (config) {
    return await sendWhatsAppTextMessage(config, session_id, reply_text);
  }
}
// Fallback to synthetic sender
```

## Timeout and Retry Strategy

**Align with Telegram implementation**:
- **Timeout**: 10 seconds (AbortSignal.timeout)
- **Retry**: Single retry after 1 second for:
  - HTTP 5xx status codes
  - HTTP 429 (Rate Limited)
  - Network errors
- **No retry** for:
  - HTTP 4xx (client errors)
  - Invalid token/phone number

## Failure Handling

Use existing `createSendFailureResult` pattern:
```typescript
return createSendFailureResult({
  transport: 'whatsapp_real',
  error: 'whatsapp_api_error',
  description: safeDescription, // redacted
  debug_steps: [...],
});
```

**Webhook response**: Always returns HTTP 200 (as per existing contract), even when WhatsApp API call fails.

## Security Requirements

1. **No token logging**: `WHATSAPP_ACCESS_TOKEN` never appears in logs, even in error messages
2. **Redaction helper**: Create `redactWhatsAppTokenInMessage()` similar to Telegram's
3. **HTTP client**: Use `undici` `fetch` (project convention), not axios
4. **Environment only**: Tokens read from env, not hardcoded or config files

## Error Mapping

| WhatsApp API Error | Mapped Result |
|-------------------|---------------|
| Success (200) | `{ transport: 'whatsapp_real', messageId: string }` |
| Invalid token (401) | `{ transport: 'whatsapp_real', error: 'invalid_token' }` |
| Rate limit (429) | `{ transport: 'whatsapp_real', error: 'rate_limited' }` (retried once) |
| Server error (5xx) | `{ transport: 'whatsapp_real', error: 'whatsapp_server_error' }` (retried once) |
| Network/timeout | `{ transport: 'whatsapp_real', error: 'network_error' }` (retried once) |

## Out-of-Scope for This ADR

✅ **Already implemented** (Phase 15.4a):
- WhatsApp POST signature validation (`X‑Hub‑Signature‑256`)
- Inbound webhook parsing and normalization

❌ **Not in this phase**:
- WhatsApp inbound message types beyond text
- WhatsApp template messages
- WhatsApp media upload/download
- WhatsApp business profile management
- Any changes to inbound processing

## Version Impact

- **Current**: Pro_v1.07.7 (`package.json` 1.7.7)
- **No version bump** in this ADR phase
- Version will increment when implementation is delivered

## Next Steps After ADR Approval

1. Create `src/config/whatsapp-cloud.ts` (configuration loading)
2. Create `src/channels/adapters/whatsapp/real-send.ts` (API client)
3. Update `src/channels/outbound-sender/index.ts` (integration)
4. Add `.env.example` variables (already placeholder)
5. Test with sandbox token, then production
6. Bump version to 1.7.8 (Pro_v1.07.8)

## Comparison with Telegram Real Transport

| Aspect | Telegram | WhatsApp Cloud |
|--------|----------|---------------|
| Config loading | `loadTelegramConfigForRealSend()` | `loadWhatsAppCloudConfig()` |
| Sandbox flag | `TELEGRAM_SANDBOX` | `WHATSAPP_SANDBOX` |
| Token env | `TELEGRAM_BOT_TOKEN` | `WHATSAPP_ACCESS_TOKEN` |
| API endpoint | `api.telegram.org` | `graph.facebook.com` |
| Session mapping | `telegram:{chat}:{user}` → chat ID | `whatsapp:{phone}:{session}` → phone |
| Retry logic | Single retry on 5xx/429 | Single retry on 5xx/429 |
| Timeout | 10 seconds | 10 seconds |

This symmetry ensures consistent behavior across real transport implementations.
