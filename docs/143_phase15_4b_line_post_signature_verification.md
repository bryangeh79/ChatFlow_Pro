# Phase 15.4b — Line POST signature verification

Implements Line `X‑Line‑Signature` validation for Line webhooks.

## Behavior

- **When channel secret is configured** (`LINE_CHANNEL_SECRET`):
  - Incoming `POST /webhooks/line` **must** include a valid `X‑Line‑Signature` header.
  - Validation uses the **raw request body** (Buffer) before JSON parsing, as required by Line's HMAC‑SHA256 algorithm.
  - Invalid signature → **HTTP 403** with `{ ok:false, error:'signature_invalid' }`.
  - **Missing, empty, or malformed signature header** (when secret is set) → also 403.
- **When no channel secret is configured**:
  - No signature verification performed (backward compatibility with existing dev/test setups).
  - A warning is logged at startup: `[LineWebhook] No LINE_CHANNEL_SECRET configured; signature verification disabled`.
  - All existing curl acceptance tests continue to pass unchanged.

## Environment

| Variable | Purpose |
|----------|---------|
| `LINE_CHANNEL_SECRET` | Line channel secret for HMAC‑SHA256 signature validation |

**Security**: Secrets are never logged, not even in error messages.

## Implementation

- **`src/config/line‑webhook.ts`**:
  - `getLineChannelSecret()` reads env.
  - `verifyLineSignature(rawBody, signatureHeader, channelSecret)` performs constant‑time HMAC‑SHA256 comparison (`crypto.timingSafeEqual`).
  - `warnIfNoLineChannelSecret()` logs startup warning.
- **`src/server.ts`**:
  - Line POST handler verifies signature before calling business logic.
  - Invalid signature → immediate 403 response, pipeline not entered.
- **`.env.example`**: Updated with Line secret variable.

## Signature algorithm

Line's documented format: `X‑Line‑Signature: <base64‑hmac‑sha256>`

1. Compute `HMAC‑SHA256(rawRequestBody, channelSecret)`.
2. Encode result as base64.
3. Compare with header value using `crypto.timingSafeEqual` (constant‑time).
4. Reject if header missing, empty, or mismatch.

## Compatibility

- **No secret** → same behavior as before (200/400 based on pipeline, no signature check).
- **Secret present + valid signature** → pipeline runs normally.
- **Secret present + invalid/missing signature** → 403, pipeline not invoked.

This ensures existing dev/test setups (which typically don't set secrets) continue to work, while production deployments can enable verification by setting the secret.

## Remaining channels

Zalo and Website POST endpoints do **not** have signature verification in this phase. They remain as before (no signature check). Future phases can add platform‑specific validation if needed.

## Version

- **Pro_v1.07.5** (`package.json` 1.7.5)
- Build passes: `npm run build` successful
- All seven‑route contracts unchanged (GET verification from Phase 15.3 still works)
- Meta POST signature (15.4a) security tightening preserved
