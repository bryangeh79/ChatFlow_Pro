# Phase 17.0 — Website outbound push (real transport)

## Purpose

Extend real outbound transport to **Website** channel, enabling ChatFlow Pro to actively POST replies to a customer-configured HTTPS callback endpoint, completing the seventh channel's real transport capability.

## Scope

| Component | Description |
|-----------|-------------|
| **Outbound endpoint** | Customer-provided HTTPS URL (`WEBSITE_OUTBOUND_URL`) |
| **Request body** | Minimal fields: `session_id`, `reply_text`, plus existing unified trace fields (`debug_metadata.request_id`) |
| **Signature** | HMAC-SHA256 hex header (consistent with inbound `docs/145` style) |
| **Timeout & retry** | 10s timeout + single retry on 5xx/429/network errors |
| **Failure handling** | Webhook still returns 200, errors logged (redacted) |
| **Security** | No secret logging; signature optional when secret configured |

## Design

### 1. Environment variables

```bash
# Website outbound push (Phase 17.0)
WEBSITE_OUTBOUND_URL=https://customer.example.com/webhook/reply
WEBSITE_OUTBOUND_SIGNING_SECRET=your_shared_secret_here
WEBSITE_OUTBOUND_DISABLED=0
WEBSITE_OUTBOUND_SANDBOX=0
```

- `WEBSITE_OUTBOUND_URL`: **Required** for real send. If not set or empty → fallback to synthetic (direct response).
- `WEBSITE_OUTBOUND_SIGNING_SECRET`: Optional. When set, outbound requests include `X-Webhook-Signature: sha256=<hex>` header (same format as inbound `docs/145`).
- `WEBSITE_OUTBOUND_DISABLED`: `1` to force synthetic (bypass real send).
- `WEBSITE_OUTBOUND_SANDBOX`: `1` to skip real send (for development).

### 2. Request format

```json
{
  "session_id": "website:user123:session456",
  "reply_text": "Hello! How can I help you today?",
  "debug_metadata": {
    "request_id": "req_abc123"
  }
}
```

**Headers:**
- `Content-Type: application/json`
- `User-Agent: ChatFlow-Pro/1.7.18`
- `X-Request-Id: <same as debug_metadata.request_id>`
- `X-Webhook-Signature: sha256=<hex>` (when `WEBSITE_OUTBOUND_SIGNING_SECRET` configured)

### 3. Signature generation

Same algorithm as inbound (`docs/145`):

```javascript
const signature = 'sha256=' + crypto
  .createHmac('sha256', secret)
  .update(rawBody)
  .digest('hex');
```

### 4. Integration with existing pipeline

- **Config module**: `src/config/website-outbound.ts` (parallel to `telegram.ts`, `whatsapp-cloud.ts`, etc.)
- **Adapter**: `src/channels/adapters/website/real-send.ts` (undici fetch, timeout+retry)
- **Sender integration**: `src/channels/outbound-sender/index.ts` → `createWebsiteRealChannelSender()`
- **Fallback behavior**: If real send fails or disabled → synthetic (direct response) as today

### 5. Error handling

- **Timeout**: 10 seconds (configurable via `WEBSITE_OUTBOUND_TIMEOUT_MS` if needed later)
- **Retry**: Single retry on 5xx, 429, or network errors
- **Logging**: Redacted errors (no secrets), `debug_steps` naming consistent with other adapters
- **Webhook response**: Always 200 OK (preserve inbound contract)

## Implementation steps

1. **Config module** (`src/config/website-outbound.ts`):
   - `loadWebsiteOutboundConfig()`: reads env, validates URL format
   - `isWebsiteOutboundSandboxOrDisabled()`: check flags
   - `redactWebsiteSecretInMessage()`: for logging safety

2. **Adapter** (`src/channels/adapters/website/real-send.ts`):
   - `sendWebsiteTextMessage()`: undici fetch, timeout, retry, signature header
   - Consistent `debug_steps` naming: `website_real_send`, `website_real_retry`, etc.

3. **Integration** (`src/channels/outbound-sender/index.ts`):
   - `createWebsiteRealChannelSender()`: returns `ChannelSender` interface
   - Update `createChannelSender('website')` to use real sender when configured

4. **Environment** (`.env.example`):
   - Add Website outbound block with variable descriptions

## Local E2E (built-in echo)

Repo ships `scripts/website-outbound-echo.mjs` — minimal receiver on **127.0.0.1** (default port **3847**, override with `WEBSITE_OUTBOUND_ECHO_PORT`).

1. Terminal A: `npm run dev:website-outbound-echo`  
2. Terminal B (same machine): set `WEBSITE_OUTBOUND_URL=http://127.0.0.1:3847` and optional `WEBSITE_OUTBOUND_SIGNING_SECRET` / `WEBSITE_OUTBOUND_ECHO_SECRET` (same value) to verify `X-Webhook-Signature`.  
3. Terminal C: `npm run build && npm run start` (ChatFlow Pro, default **3030**).  
4. Terminal D: `curl` or `npm run smoke:webhooks` — expect echo terminal to log JSON body and `X-Request-Id`.

Optional: set `WEBSITE_OUTBOUND_ECHO_SECRET` when starting the echo server to enable constant-time signature check (must match `WEBSITE_OUTBOUND_SIGNING_SECRET` on ChatFlow).

## Acceptance test (optional)

Customer callback endpoint simulation:

```bash
# Start a test server to receive callbacks
nc -l 8080

# Configure ChatFlow Pro with:
# WEBSITE_OUTBOUND_URL=http://localhost:8080/webhook
# WEBSITE_OUTBOUND_SIGNING_SECRET=test123

# Send a message to POST /webhooks/website
curl -X POST http://localhost:3030/webhooks/website \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-1",
    "user_id": "user123",
    "session_id": "website:user123:session1",
    "text": "Hello",
    "language": "en",
    "timestamp": "2026-04-05T10:00:00Z"
  }'

# Expect callback on port 8080 with signed payload
```

## Notes

- **No breaking changes**: Inbound webhook contract unchanged
- **Backward compatibility**: No URL configured → synthetic (as today)
- **Security**: Signature optional; customer can validate if secret provided
- **Observability**: `X-Request-Id` propagated, `phases_ms` includes `outbound_send_ms`
- **Consistency**: Follows same patterns as Telegram/WhatsApp/Messenger/Line/Zalo real transports

## References

- `docs/145_phase15_4d_website_post_signature_design.md` — inbound signature format
- `docs/138_phase15_0_real_transport_design.md` — real transport architecture
- `docs/129_phase13_0_pro_seven_channel_acceptance_checklist.md` — acceptance tests