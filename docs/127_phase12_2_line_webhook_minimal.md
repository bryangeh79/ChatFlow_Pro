# Phase 12.2 Line Webhook (Minimal)

## Scope

### Delivered
- `POST /webhooks/line` – same pattern as Website/Telegram/WhatsApp/Messenger: parse → session → `runUnifiedInboundPipeline` → `commitSessionContext` → outbound map → sender.
- `parseLineInbound` accepts:
  - **Flat test/dev shape** (`userId`, `conversationId`, `text`, `timestamp`) – matches existing adapter normalization.
  - **Line Webhook shape** (`events: [{ type: 'message', message: { type: 'text', text }, source: { userId }, timestamp }]`) – extracts first text message from Line webhook.
  - Non‑text / no‑message events → parser returns `null`, handler returns `{ ok: true, skipped: true }` with HTTP 200.
- `/verification` extended with Line happy path + webhook format + skipped follow‑event payload.

### Not in this phase
- Line webhook verification (signature validation) – configure when wiring production.
- Real Line Messaging API send – transport remains synthetic like other channels.
- Zalo live route – follow‑up phase.

## Implementation Details

### Parser Logic (`parseLineInbound`)
**Flat format** (test/dev):
```json
{
  "userId": "line-user-1",
  "conversationId": "line-conv-1",
  "text": "Hello from Line flat format",
  "timestamp": "2026-04-03T10:57:00.000Z"
}
```

**Line Webhook format** (production):
```json
{
  "destination": "U1234567890abcdef1234567890abcdef",
  "events": [{
    "type": "message",
    "message": {
      "type": "text",
      "text": "Hello from Line webhook"
    },
    "source": {
      "userId": "line-user-2",
      "type": "user"
    },
    "replyToken": "nHuyWiB7yP5Zw52FIkcQobQuGDXCTA",
    "timestamp": 1703275200000
  }]
}
```

**Skipped events** (follow, unfollow, join, leave, etc.):
```json
{
  "destination": "U1234567890abcdef1234567890abcdef",
  "events": [{
    "type": "follow",
    "source": {
      "userId": "line-user-3",
      "type": "user"
    },
    "timestamp": 1703275200000
  }]
}
```

### Handler Flow (`handleLineWebhook`)
1. Parse inbound payload
2. If `null` → return `{ ok: true, skipped: true, reason: 'no_processable_message' }`
3. `createOrUpdateSessionContext(message)`
4. `runUnifiedInboundPipeline(message, session)`
5. `commitSessionContext(result.session)`
6. `mapLineOutboundPayload(result.response)`
7. `createChannelSender('line').send(...)`
8. Return result with HTTP 200 (or 400 on error)

### Integration Points
- **Session store**: Line sessions stored in same Map (1000 cap, FIFO eviction)
- **Lead capture**: Line messages trigger lead detection/merging/persistence
- **FAQ**: Line messages run through FAQ matching (gate fixed)
- **i18n**: Uses `session.current_language` for prompts (zh/en/vi/ms‑MY)
- **Outbound**: `reply_text` includes merged prompts, `mapLineOutboundPayload` formats

## Files Changed
1. `src/webhooks/line.ts` – New handler with dual‑format parser
2. `src/server.ts` – Added `POST /webhooks/line` route registration
3. `src/webhooks/verification.ts` – Added Line test cases (flat, webhook, skipped)
4. `src/channels/adapters/line/index.ts` – Fixed `channel` field from `'messenger'` to `'line'`
5. `docs/127_phase12_2_line_webhook_minimal.md` – This document

## Verification
- ✅ `npm run build` passes
- ✅ Six‑route baseline intact: Telegram, Website, WhatsApp, Messenger, Line all 200 OK
- ✅ Line parser handles flat + webhook formats
- ✅ Skipped events return `{ ok: true, skipped: true }`
- ✅ `/verification` includes Line test cases
- ✅ Unified pipeline integration (lead+FAQ) works for Line

## Regression
- Telegram & Website & WhatsApp & Messenger routes unchanged
- Unified pipeline and session store shared; `channel: 'line'` flows through lead + FAQ logic
- No breaking changes to existing contracts