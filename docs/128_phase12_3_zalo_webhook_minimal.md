# Phase 12.3 Zalo Webhook (Minimal)

## Scope

### Delivered
- `POST /webhooks/zalo` – same pattern as Website/Telegram/WhatsApp/Messenger/Line: parse → session → `runUnifiedInboundPipeline` → `commitSessionContext` → outbound map → sender.
- `parseZaloInbound` accepts:
  - **Flat test/dev shape** (`user_id`, `thread_id`, `text`, `timestamp`) – matches existing adapter normalization.
  - **Zalo OA Webhook shape** (`event_name: 'user_send_text', sender: { id }, recipient: { id }, message: { text }`) – extracts text message from Zalo webhook.
  - **Nested Zalo Webhook shape** (`data: { event_name: 'user_send_text', sender: { id }, oa_id, message: { text } }`) – extracts from nested payload.
  - Non‑text / no‑message events → parser returns `null`, handler returns `{ ok: true, skipped: true }` with HTTP 200.
- `/verification` extended with Zalo happy path + webhook formats + skipped follow‑event payload.

### Not in this phase
- Zalo webhook verification (signature validation) – configure when wiring production.
- Real Zalo OA API send – transport remains synthetic like other channels.
- Additional Zalo message types (images, stickers, locations).

## Implementation Details

### Parser Logic (`parseZaloInbound`)
**Flat format** (test/dev):
```json
{
  "user_id": "zalo-user-1",
  "thread_id": "zalo-conv-1",
  "text": "Hello from Zalo flat format",
  "timestamp": "2026-04-03T10:57:00.000Z"
}
```

**Zalo OA Webhook format** (production):
```json
{
  "event_name": "user_send_text",
  "sender": { "id": "zalo-user-2" },
  "recipient": { "id": "zalo-oa-1" },
  "message": { "text": "Hello from Zalo webhook" },
  "timestamp": "2026-04-03T10:57:00.000Z"
}
```

**Nested Zalo Webhook format** (alternative):
```json
{
  "data": {
    "event_name": "user_send_text",
    "sender": { "id": "zalo-user-3" },
    "oa_id": "zalo-oa-2",
    "message": { "text": "Hello from nested Zalo webhook" },
    "timestamp": "2026-04-03T10:57:00.000Z"
  }
}
```

**Skipped events** (follow, unfollow, etc.):
```json
{
  "event_name": "user_follow",
  "sender": { "id": "zalo-user-4" },
  "timestamp": "2026-04-03T10:57:00.000Z"
}
```

### Handler Flow (`handleZaloWebhook`)
1. Parse inbound payload
2. If `null` → return `{ ok: true, skipped: true, reason: 'no_processable_message' }`
3. `createOrUpdateSessionContext(message)`
4. `runUnifiedInboundPipeline(message, session)`
5. `commitSessionContext(result.session)`
6. `mapZaloOutboundPayload(result.response)`
7. `createChannelSender('zalo').send(...)`
8. Return result with HTTP 200 (or 400 on error)

### Integration Points
- **Session store**: Zalo sessions stored in same Map (1000 cap, FIFO eviction)
- **Lead capture**: Zalo messages trigger lead detection/merging/persistence
- **FAQ**: Zalo messages run through FAQ matching (gate fixed)
- **i18n**: Uses `session.current_language` for prompts (zh/en/vi/ms‑MY)
- **Outbound**: `reply_text` includes merged prompts, `mapZaloOutboundPayload` formats

## Files Changed
1. `src/webhooks/zalo.ts` – New handler with three‑format parser
2. `src/server.ts` – Added `POST /webhooks/zalo` route registration
3. `src/webhooks/verification.ts` – Added Zalo test cases (flat, webhook, nested, skipped)
4. `src/channels/adapters/zalo/index.ts` – Fixed `channel` field from `'messenger'` to `'zalo'`
5. `docs/128_phase12_3_zalo_webhook_minimal.md` – This document

## Verification
- ✅ `npm run build` passes
- ✅ **Seven‑route baseline intact**: Telegram, Website, WhatsApp, Messenger, Line, Zalo all 200 OK
- ✅ Zalo parser handles flat + webhook + nested formats
- ✅ Skipped events return `{ ok: true, skipped: true }`
- ✅ `/verification` includes Zalo test cases
- ✅ Unified pipeline integration (lead+FAQ) works for Zalo

## Regression
- Telegram & Website & WhatsApp & Messenger & Line routes unchanged
- Unified pipeline and session store shared; `channel: 'zalo'` flows through lead + FAQ logic
- No breaking changes to existing contracts

## Milestone: Pro Channel Suite Complete
With Zalo webhook added, ChatFlow Pro now has **seven unified inbound channels**:
1. `POST /webhooks/telegram`
2. `POST /webhooks/website`
3. `POST /webhooks/whatsapp`
4. `POST /webhooks/messenger`
5. `POST /webhooks/line`
6. `POST /webhooks/zalo`

All channels share the same unified inbound pipeline with:
- Lead capture detection/merging/persistence
- FAQ matching (gate fixed)
- In‑memory session store (1000 cap)
- Four‑language i18n (zh/en/vi/ms‑MY)
- File‑based lead persistence (JSONL with rotation)

**Pro_v1.06** now has a complete channel suite ready for acceptance.