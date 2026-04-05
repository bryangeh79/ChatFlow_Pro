# Phase 17.2 — Meta (WhatsApp Cloud + Messenger) in-process token refresh — **spec only**

## Status

**Specification / planning.** No runtime implementation in this document. Implement only after **staging** can exercise real Graph errors and token exchange (see `docs/151` option **C**, `docs/154` patterns).

## Goals

- On **expired / invalid** outbound credentials for **WhatsApp Cloud** and/or **Messenger Graph**, refresh **in process** (single-flight + one retry) similar to Zalo Phase **17.1**.
- Reuse global switch **`CHATFLOW_INPROCESS_TOKEN_REFRESH=1`** (same as `docs/154`) unless a separate Meta-only flag is later required.

## Detection (to confirm against live Graph responses)

| Signal | Notes |
|--------|--------|
| HTTP **401** on Graph send | Candidate trigger (same idea as Zalo). |
| HTTP **403** with OAuth error body | May indicate permission or token class issues — **do not** auto-refresh blindly; map per **current** Meta error reference. |
| JSON `error` with `code` / `error_subcode` | WhatsApp/Messenger send already parse `error` (`real-send.ts`). Extend with a small allowlist of codes that mean **“refresh may help”** — **must be verified in staging**. |

## Refresh mechanics (outline)

Meta’s token model depends on **how** the Page / System User token was created (long-lived vs short-lived, app type, etc.). Implementation must follow **current** Meta documentation for:

- Exchanging or extending Page / system user access tokens using **`META_APP_ID`** + **`META_APP_SECRET`** (or existing split secrets already used for webhook verification).
- WhatsApp Cloud may use the **same** or a **different** token type than Messenger, depending on app configuration — code paths may be **shared** or **split** after staging proves one token updates both sends.

**Never** log `access_token`, `client_secret`, or full Graph error payloads containing secrets.

## Proposed modules (future)

| Piece | Role |
|-------|------|
| `meta-token-cache.ts` | In-memory overrides for `WHATSAPP_ACCESS_TOKEN` / `MESSENGER_PAGE_ACCESS_TOKEN` after refresh. |
| `meta-token-refresh.ts` | Single-flight OAuth exchange; reads secrets from env only. |
| `whatsapp-cloud.ts` / `messenger-graph.ts` | Resolve “effective” token = cache override ?? `process.env`. |
| `real-send.ts` (WA + Messenger) | After allowlisted failure, call refresh once, retry send once. |

## Preconditions before coding

1. Staging (or dedicated Meta test app) where tokens can be **forced** to expire or rotate.  
2. Captured **raw** Graph error JSON for each failure mode you intend to handle.  
3. Security review: app secret in env, no persistence of new tokens to disk unless product explicitly requires it.

## References

- `docs/151_phase16_meta_zalo_token_refresh_adr.md` — options A/B/C.  
- `docs/154_phase17_inprocess_token_refresh.md` — Zalo 17.1 implementation pattern.  
- `docs/146`, `docs/147` — outbound ADRs.  
- `src/channels/adapters/whatsapp/real-send.ts`, `src/channels/adapters/messenger/real-send.ts`.
