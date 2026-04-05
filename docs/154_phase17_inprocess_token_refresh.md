# Phase 17 — In-process token refresh (implementation)

## Status

Implements **slice 17.1 — Zalo OA only** (option **C** from `docs/151`). **Meta WhatsApp / Messenger** in-process exchange is **not** implemented here; keep **option A** (platform rotation + restart) until a separate spec lands.

## Feature switch

| Env | Meaning |
|-----|---------|
| `CHATFLOW_INPROCESS_TOKEN_REFRESH` | When `1` / `true` / `yes`, enables refresh attempts. **Default: off** (unset = no OAuth calls). |

## Zalo OA (17.1)

### Preconditions

- Inbound/outbound behavior and `200 OK` degraded policy unchanged from Phase 15.
- `ZALO_ACCESS_TOKEN`, `ZALO_OA_ID`, and real-send enabled as today.

### Additional env (refresh path only)

| Variable | Purpose |
|----------|---------|
| `ZALO_REFRESH_TOKEN` | Refresh token from Zalo OAuth (never log). |
| `ZALO_APP_ID` | Application id from Zalo developer console. |
| `ZALO_APP_SECRET` | Application secret; sent as `secret_key` header to the token endpoint (never log). |

### Behavior

1. On Zalo message API **HTTP 401**, if the feature switch is on and refresh credentials are present, Pro calls **one** OAuth token request (`POST https://oauth.zaloapp.com/v4/oa/access_token`) under **single-flight** (concurrent 401s share one refresh).
2. On success, new `access_token` (and optional new `refresh_token`) are stored **in process memory only** — not written to disk or `process.env`.
3. The failed send is **retried once** with the updated access token (same inbound request; still returns `200` to the webhook caller on downstream failure per existing policy).
4. If refresh fails or is disabled, behavior matches pre–Phase 17 (failure / `invalid_token` path).

**Important:** Confirm request/response shape against **current** [Zalo developer documentation](https://developers.zalo.me/) before relying on this in production. Endpoint and headers are version-sensitive.

## Meta (WhatsApp / Messenger) — future (17.2+)

- Detect Graph **OAuth / expired token** signals (HTTP + `error` body).
- Possible use of app secret + short-lived token exchange per **current** Meta docs.
- Same single-flight and “one retry after refresh” pattern as Zalo.

## Security

- Never log access tokens, refresh tokens, or app secrets.
- Prefer platform secret rotation (docs/152) for high-assurance environments until staging validates in-process refresh.

## References

- `docs/151_phase16_meta_zalo_token_refresh_adr.md` — options A / B / C.
- `docs/152_phase16_ops_token_rotation_runbook.md` — operational rotation.
- `src/tokens/zalo-refresh.ts`, `src/tokens/zalo-token-cache.ts`, `src/channels/adapters/zalo/real-send.ts`.
