# Phase 15.3 — Webhook GET verification (seven routes)

Adds **GET** handlers on the same paths as `POST /webhooks/*` for platform URL verification and operator probes. **POST contracts are unchanged.**

## Meta-style verification (WhatsApp, Messenger, Website, optional Line/Zalo)

Used by **Meta** (Facebook Login / Graph webhook setup) and compatible with the same query shape elsewhere.

Query parameters:

- `hub.mode` — must be `subscribe`
- `hub.verify_token` — must equal the configured env token for that route
- `hub.challenge` — echoed back as **plain text** with HTTP **200** on success (Meta requirement)

### Environment variables

| Env | Used for |
|-----|----------|
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | `GET /webhooks/whatsapp` (optional) |
| `MESSENGER_WEBHOOK_VERIFY_TOKEN` | `GET /webhooks/messenger` (optional) |
| `META_WEBHOOK_VERIFY_TOKEN` | Fallback for WhatsApp **and** Messenger if per-channel token unset |
| `WEBHOOK_VERIFY_TOKEN_META` | Alias fallback for the above |
| `WEBSITE_WEBHOOK_VERIFY_TOKEN` | `GET /webhooks/website` |
| `LINE_WEBHOOK_VERIFY_TOKEN` | `GET /webhooks/line` (optional; LINE console typically validates via POST) |
| `ZALO_WEBHOOK_VERIFY_TOKEN` | `GET /webhooks/zalo` (optional) |

If `hub.mode=subscribe` is present but the route’s token is **not** configured → **403** `webhook_verify_not_configured`.  
Wrong token → **403** `verify_token_mismatch`.  
Invalid mode or missing challenge → **400** JSON error.

## GET without hub params (idle / health)

When **no** `hub.mode`, `hub.verify_token`, or `hub.challenge` are present:

- **WhatsApp, Messenger, Website, Line, Zalo**: HTTP **200** JSON `{ ok, channel, verification }` — short note only, **no secrets**.

## Telegram

`GET /webhooks/telegram` always returns **200** JSON explaining that the Bot API delivers updates via **POST** only (setWebhook in BotFather / API). No challenge flow.

## Code

- `src/config/webhook-verify.ts` — token loaders, Meta verification, response helper
- `src/server.ts` — GET branches before existing POST handlers

## Security

- Tokens exist **only** in environment variables.
- Do **not** log verify tokens or hub challenges in application logs.
