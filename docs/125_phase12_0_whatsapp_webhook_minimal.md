# Phase 12.0 WhatsApp Webhook (Minimal)

## Scope

### Delivered
- `POST /webhooks/whatsapp` — same pattern as Website/Telegram: parse → session → `runUnifiedInboundPipeline` → `commitSessionContext` → outbound map → sender.
- `parseWhatsAppInbound` accepts:
  - **Meta Cloud API** shape (`entry[].changes[].value.messages[]`) — first text message; status-only / no messages → parser returns `null`, handler returns `{ ok: true, skipped: true }` with HTTP 200.
  - **Flat test / dev shape** (`from`, optional `conversation_id`, `id`, `text`, `timestamp`) — unchanged from adapter v1.
- `/verification` extended with WhatsApp happy path + skipped Cloud-style payload.

### Not in this phase
- Meta webhook verification (GET `hub.challenge`) — configure when wiring production.
- Real WhatsApp Cloud API send — transport remains synthetic like other channels.
- Facebook Messenger, Line, Zalo live routes — follow-up phases.

## Files
- `src/channels/adapters/whatsapp/index.ts` — `parseWhatsAppInbound`
- `src/webhooks/whatsapp.ts` — handler
- `src/server.ts` — route registration
- `src/webhooks/verification.ts` — checks

## Regression
- Telegram & Website routes unchanged.
- Unified pipeline and session store shared; `channel: 'whatsapp'` flows through lead + FAQ logic.
