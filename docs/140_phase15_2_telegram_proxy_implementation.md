# Phase 15.2 — Telegram outbound HTTP(S) proxy

Extends [138_phase15_0_real_transport_design.md](./138_phase15_0_real_transport_design.md) optional proxy envs and [139](./139_phase15_1_telegram_real_transport_implementation.md) real send path.

## Environment

| Variable | Role |
|----------|------|
| `TELEGRAM_PROXY_URL` | `http://` or `https://` proxy base URL (required to enable proxy) |
| `TELEGRAM_PROXY_USERNAME` | Optional; merged into proxy URL userinfo when set |
| `TELEGRAM_PROXY_PASSWORD` | Optional; paired with username |

Invalid URL or non-http(s) scheme: proxy is **skipped** (error logged), Bot API calls go **direct** with undici `fetch` (same as no proxy).

## Implementation

- **`src/config/telegram.ts`**: `buildTelegramProxyConnectUriFromEnv()` → `TelegramConfig.proxyConnectUri` (never log this field).
- **`src/channels/adapters/telegram/real-send.ts`**: `undici` `fetch` + `ProxyAgent` when `proxyConnectUri` set; `debug_steps` includes `telegram_real_proxy`; `ProxyAgent.close()` in `finally`.
- **Dependency**: runtime `undici` (Node’s global `fetch` does not accept `dispatcher` in all versions; undici keeps one supported path).

## Boundaries

- Seven webhook routes and contracts unchanged.
- Other channels unchanged (synthetic).
- No proxy credentials in logs.
