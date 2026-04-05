# Phase 15.4d — Website POST signature design

## Overview

Adds optional HMAC‑SHA256 signature validation for `POST /webhooks/website` to protect against unauthorized requests when the endpoint is exposed to the public internet.

## Signature Specification

### Header Name
`X‑Webhook‑Signature`

### Format
`sha256=<64‑hex‑digest>` (same as Meta's `X‑Hub‑Signature‑256` format)

### Algorithm
1. **Raw body**: The exact bytes of the HTTP request body as received (no trimming, no encoding changes).
2. **HMAC‑SHA256**: Compute `HMAC‑SHA256(rawRequestBody, signingSecret)`.
3. **Hex encoding**: Convert HMAC output to lowercase hexadecimal.
4. **Header value**: Prefix with `sha256=`.

### Client Signing Guidance
Clients must sign the **complete, unmodified HTTP request body**:
- No leading/trailing whitespace removal
- No character encoding changes
- Exact byte sequence as sent over the wire

If the client uses `JSON.stringify()` and sends the result as UTF‑8, sign those UTF‑8 bytes.

## Environment Configuration

| Variable | Purpose | Behavior |
|----------|---------|----------|
| `WEBSITE_WEBHOOK_SIGNING_SECRET` | Signing secret for HMAC‑SHA256 | **Optional**; if set → validation required; if unset → no validation |

### Behavior Matrix

| Secret | Signature Header | Result |
|--------|-----------------|--------|
| Not set | Any/None | ✅ 200/400 (current behavior) |
| Set | Missing/Empty | ❌ 403 `{ ok:false, error:'signature_invalid' }` |
| Set | Malformed format | ❌ 403 `{ ok:false, error:'signature_invalid' }` |
| Set | Valid but mismatch | ❌ 403 `{ ok:false, error:'signature_invalid' }` |
| Set | Valid and matches | ✅ 200/400 (proceed to pipeline) |

## Implementation Plan

### Code Reuse
- Reuse `verifyMetaSignature()` from `src/config/meta‑webhook.ts` (same `sha256=<hex>` format)
- Create `src/config/website‑webhook.ts` with `getWebsiteSigningSecret()` and `verifyWebsiteSignature()` wrapper
- Share constant‑time comparison (`crypto.timingSafeEqual`) and HMAC logic

### Server Changes
1. `readRequestBody()` already returns `{ raw: Buffer, parsed: unknown }` (from Phase 15.4a)
2. `POST /webhooks/website` handler to:
   - Read secret from env
   - If secret set → validate `X‑Webhook‑Signature` header
   - Invalid → return 403 immediately
   - Valid/no secret → call `handleWebsiteWebhook(parsed)`

### Security
- **Never log** the signing secret (env only)
- **Constant‑time comparison** to prevent timing attacks
- **Backward compatibility**: No secret → same behavior as today

## Integration with Existing Pipeline

```
POST /webhooks/website
  ↓
readRequestBody() → { raw: Buffer, parsed: unknown }
  ↓
if (WEBSITE_WEBHOOK_SIGNING_SECRET):
  verifyWebsiteSignature(raw, X‑Webhook‑Signature, secret)
    ↓
    invalid → HTTP 403 { ok:false, error:'signature_invalid' }
    valid → continue
  ↓
handleWebsiteWebhook(parsed) → { ok: true/false, ... }
  ↓
HTTP 200/400 with JSON response
```

## Comparison with Other Channels

| Channel | Header | Format | Env Variable | Implementation |
|---------|--------|--------|--------------|----------------|
| WhatsApp/Messenger | `X‑Hub‑Signature‑256` | `sha256=<hex>` | `META_APP_SECRET` etc. | `verifyMetaSignature()` |
| Line | `X‑Line‑Signature` | Base64 HMAC‑SHA256 | `LINE_CHANNEL_SECRET` | `verifyLineSignature()` |
| **Website** | `X‑Webhook‑Signature` | `sha256=<hex>` | `WEBSITE_WEBHOOK_SIGNING_SECRET` | `verifyWebsiteSignature()` (reuses Meta logic) |

## Version
- **Pro_v1.07.7** (`package.json` 1.7.7)
- Build passes: `npm run build` successful
- All seven‑route contracts unchanged (GET verification still works)

## Completion Criteria
- [ ] `docs/145_phase15_4d_website_post_signature_design.md` (this document)
- [ ] `src/config/website‑webhook.ts` implementation
- [ ] `src/server.ts` website POST handler updated
- [ ] `.env.example` updated with new variable
- [ ] Memory files (01‑07) updated to reflect Phase 15.4d delivery
- [ ] POST signature debt marked as complete (optional enhancements only)
