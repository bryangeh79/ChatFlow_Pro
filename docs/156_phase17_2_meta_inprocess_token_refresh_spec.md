# Phase 17.2 — Meta (WhatsApp Cloud + Messenger) in-process token refresh

## Status

**Implemented (MVP)** in code: `src/tokens/meta-token-cache.ts`, `src/tokens/meta-graph-refresh.ts`, WhatsApp/Messenger `real-send.ts`. Uses Graph **`fb_exchange_token`** when **`CHATFLOW_INPROCESS_TOKEN_REFRESH=1`** and **`META_APP_ID`** + app secret are set.

**Staging still required** to validate token types (system user vs page), error shapes, and whether **190** / **401** cover your deployment.

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

## Implemented modules

| File | Role |
|------|------|
| `src/tokens/meta-token-cache.ts` | In-memory overrides after successful exchange. |
| `src/tokens/meta-graph-refresh.ts` | `fb_exchange_token`, single-flight per channel, `isMetaGraphTokenRefreshCandidate`. |
| `src/config/whatsapp-cloud.ts` / `messenger-graph.ts` | Effective token via cache ?? env. |
| `src/channels/adapters/whatsapp/real-send.ts` / `messenger/real-send.ts` | Bearer uses resolved token; refresh + full send retry. |

## Environment (implemented)

| Variable | Role |
|----------|------|
| `CHATFLOW_INPROCESS_TOKEN_REFRESH` | Same as Zalo 17.1 — must be enabled. |
| `META_APP_ID` | Facebook App ID (`client_id`). |
| `META_APP_SECRET` or `WHATSAPP_APP_SECRET` or `MESSENGER_APP_SECRET` | `client_secret` for exchange (first set wins same as webhook precedence). |

## Behavior

1. After a failed send, if **HTTP 401** or **HTTP 400** with Graph **`error.code === 190`**, Pro attempts **one** `GET .../oauth/access_token?grant_type=fb_exchange_token&...` per channel (**single-flight** per channel).  
2. New access token stored **in memory** only; env on disk unchanged.  
3. Send is **retried once** (full `postSendMessage` again, including existing 5xx/429 retry behavior).

## Preconditions before relying in production

1. Staging (or Meta test app) to confirm **`fb_exchange_token`** accepts your WhatsApp / Messenger token class.  
2. Security review: never log tokens or secrets.

## References

- `docs/151_phase16_meta_zalo_token_refresh_adr.md` — options A/B/C.  
- `docs/154_phase17_inprocess_token_refresh.md` — Zalo 17.1 implementation pattern.  
- `docs/146`, `docs/147` — outbound ADRs.  
- `src/channels/adapters/whatsapp/real-send.ts`, `src/channels/adapters/messenger/real-send.ts`.
