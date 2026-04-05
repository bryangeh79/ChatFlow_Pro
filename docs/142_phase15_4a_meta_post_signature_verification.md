# Phase 15.4a — Meta POST signature verification (WhatsApp + Messenger)

Implements Meta‑style `X‑Hub‑Signature‑256` validation for WhatsApp and Messenger webhooks.

## Behavior

- **When app secret is configured** (`META_APP_SECRET` or channel‑specific `WHATSAPP_APP_SECRET` / `MESSENGER_APP_SECRET`):
  - Incoming `POST /webhooks/whatsapp` and `POST /webhooks/messenger` **must** include a valid `X‑Hub‑Signature‑256` header.
  - Validation uses the **raw request body** (Buffer) before JSON parsing, as required by Meta's HMAC‑SHA256 algorithm.
  - Invalid signature → **HTTP 403** with `{ ok:false, error:'signature_invalid' }`.
  - **Missing, empty, or malformed signature header** (when secret is set) → also 403.
- **When no app secret is configured**:
  - No signature verification performed (backward compatibility with existing dev/test setups).
  - A single warning is logged at startup: `[MetaWebhook] No app secret configured for …; signature verification disabled`.
  - All existing curl acceptance tests continue to pass unchanged.

**Security tightening (紧急修订)**: Once an app secret is configured, the endpoint **requires** a valid `X‑Hub‑Signature‑256` header. Missing or malformed headers are rejected with 403, ensuring production deployments enforce signature validation.

## Environment

| Variable | Purpose | Fallback |
|----------|---------|----------|
| `META_APP_SECRET` | Shared secret for both WhatsApp and Messenger | – |
| `WHATSAPP_APP_SECRET` | WhatsApp‑specific secret (overrides `META_APP_SECRET`) | `META_APP_SECRET` |
| `MESSENGER_APP_SECRET` | Messenger‑specific secret (overrides `META_APP_SECRET`) | `META_APP_SECRET` |

**Security**: Secrets are never logged, not even in error messages.

## Implementation

- **`src/config/meta‑webhook.ts`**:
  - `loadMetaWebhookConfig()` reads env with fallback logic.
  - `verifyMetaSignature(rawBody, signatureHeader, appSecret)` performs constant‑time HMAC‑SHA256 comparison (`crypto.timingSafeEqual`).
  - `warnIfNoAppSecret()` logs startup warning (once per channel).
- **`src/server.ts`**:
  - `readRequestBody()` now returns `{ raw: Buffer, parsed: unknown }` to keep original body for signature verification.
  - WhatsApp/Messenger POST handlers verify signature before calling business logic.
  - Invalid signature → immediate 403 response, pipeline not entered.
- **`.env.example`**: Updated with new env block and guidance.

## Signature algorithm

Meta's documented format: `X‑Hub‑Signature‑256: sha256=<hex‑digest>`

1. Compute `HMAC‑SHA256(rawRequestBody, appSecret)`.
2. Compare hex digest with header value using `crypto.timingSafeEqual` (constant‑time).
3. Reject if header missing, malformed, or digest mismatch.

## Compatibility

- **No secret** → same behavior as before (200/400 based on pipeline, no signature check).
- **Secret present + valid signature** → pipeline runs normally.
- **Secret present + invalid/missing signature** → 403, pipeline not invoked.

This ensures existing dev/test setups (which typically don't set secrets) continue to work, while production deployments can enable verification by setting the secret.

## Remaining channels

Line, Zalo, and Website POST endpoints do **not** have signature verification in this phase. They remain as before (no signature check). Future phases can add platform‑specific validation if needed.

## Version

- **Pro_v1.07.4** (`package.json` 1.7.4)
- Build passes: `npm run build` successful
- All seven‑route contracts unchanged (GET verification from Phase 15.3 still works)
