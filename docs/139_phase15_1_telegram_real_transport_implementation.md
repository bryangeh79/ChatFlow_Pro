# Phase 15.1 — Telegram real transport (implementation)

Implements [138_phase15_0_real_transport_design.md](./138_phase15_0_real_transport_design.md) for **Telegram outbound only**.

## Behavior

- **`createChannelSender('telegram')`** uses real `sendMessage` when `loadTelegramConfigForRealSend()` returns a config; otherwise the existing **synthetic** path (same as other channels).
- **Sandbox**: `TELEGRAM_SANDBOX=true` or `1` forces synthetic sender (no API calls).
- **Token**: `TELEGRAM_BOT_TOKEN` must match `^\d+:[A-Za-z0-9_-]+$` or config is rejected (logs format error, synthetic fallback).
- **`should_send === false`**: no API call; result status **`fallback`** with `debug_steps` including `telegram_real_skipped_should_send_false`.
- **Empty reply text / missing chat id** in `session_id`: **`fallback`** with reasons in `debug_steps` (see `real-send.ts`).
- **API failure**: **`failed`** with redacted error message; webhook layer still returns **200** per ADR (unchanged here).

## Session id → `chat_id`

`parseTelegramChatIdFromSessionId` uses the **third** colon segment of `telegram:{userId}:{chatId}` (same as inbound normalizer).

## Code map

| Piece | Role |
|--------|------|
| `src/config/telegram.ts` | Env loading, sandbox, token validation, redaction helper |
| `src/channels/adapters/telegram/real-send.ts` | undici `fetch` to Bot API, optional `ProxyAgent`, 10s timeout, one retry on 5xx/429/network |
| `src/channels/outbound-sender/index.ts` | Telegram branch + `should_send` / success / fallback / failure mapping |

## Not in this phase

- Other channels remain synthetic.

Proxy (138) is implemented in **Phase 15.2** — see [140_phase15_2_telegram_proxy_implementation.md](./140_phase15_2_telegram_proxy_implementation.md).
