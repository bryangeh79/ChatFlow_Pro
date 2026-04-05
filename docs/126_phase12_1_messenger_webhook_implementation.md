# Phase 12.1 Messenger Webhook Implementation

## Scope

### Delivered
- `POST /webhooks/messenger` – same pattern as Website/Telegram/WhatsApp: parse → session → `runUnifiedInboundPipeline` → `commitSessionContext` → outbound map → sender.
- `parseMessengerInbound` accepts:
  - **Flat test/dev shape** (`sender`, `thread`, `text`, `timestamp`) – matches existing adapter normalization.
  - **Facebook Graph API shape** (`entry[].messaging[]`) – extracts first text message from Graph webhook.
  - Non‑text / no‑message events → parser returns `null`, handler returns `{ ok: true, skipped: true }` with HTTP 200.
- `/verification` extended with Messenger happy path + Graph API + skipped delivery‑event payload.

### Not in this phase
- Facebook webhook verification (GET `hub.verify_token`, `hub.challenge`) – configure when wiring production.
- Real Messenger Platform send – transport remains synthetic like other channels.
- Line, Zalo live routes – follow‑up phases.

## Implementation Details

### Parser Logic (`parseMessengerInbound`)
**Flat format** (test/dev):
```json
{
  "sender": { "id": "fb-user-1", "name": "Test User" },
  "thread": { "id": "fb-thread-1" },
  "text": "Hello from Messenger",
  "timestamp": "2026-04-03T10:57:00.000Z"
}
```

**Graph API format** (production):
```json
{
  "entry": [{
    "id": "0",
    "time": 1703275200,
    "messaging": [{
      "sender": { "id": "fb-user-2" },
      "recipient": { "id": "page-id" },
      "timestamp": 1703275200,
      "message": {
        "mid": "msg-123",
        "text": "Hello from Graph API"
      }
    }]
  }]
}
```

**Skipped events** (delivery, read, etc.):
```json
{
  "entry": [{
    "messaging": [{
      "sender": { "id": "fb-user-3" },
      "recipient": { "id": "page-id" },
      "delivery": { "mids": ["msg-456"], "watermark": 1703275200 }
    }]
  }]
}
```

### Handler Flow (`handleMessengerWebhook`)
1. Parse inbound payload
2. If `null` → return `{ ok: true, skipped: true, reason: 'no_processable_message' }`
3. `createOrUpdateSessionContext(message)`
4. `runUnifiedInboundPipeline(message, session)`
5. `commitSessionContext(result.session)`
6. `mapMessengerOutboundPayload(result.response)`
7. `createChannelSender('messenger').send(...)`
8. Return result with HTTP 200 (or 400 on error)

### Integration Points
- **Session store**: Messenger sessions stored in same Map (1000 cap, FIFO eviction)
- **Lead capture**: Messenger messages trigger lead detection/merging/persistence
- **FAQ**: Messenger messages run through FAQ matching (gate fixed)
- **i18n**: Uses `session.current_language` for prompts (zh/en/vi/ms‑MY)
- **Outbound**: `reply_text` includes merged prompts, `mapMessengerOutboundPayload` formats

## Files Changed
1. `src/webhooks/messenger.ts` – New handler with dual‑format parser
2. `src/server.ts` – Added `POST /webhooks/messenger` route registration
3. `src/webhooks/verification.ts` – Added Messenger test cases (flat, Graph, skipped)
4. `docs/126_phase12_1_messenger_webhook_implementation.md` – This document

## Verification
- ✅ `npm run build` passes
- ✅ Four‑route baseline intact: Telegram, Website, WhatsApp, Messenger all 200 OK
- ✅ Messenger parser handles flat + Graph API formats
- ✅ Skipped events return `{ ok: true, skipped: true }`
- ✅ `/verification` includes Messenger test cases
- ✅ Unified pipeline integration (lead+FAQ) works for Messenger

## Regression
- Telegram & Website & WhatsApp routes unchanged
- Unified pipeline and session store shared; `channel: 'messenger'` flows through lead + FAQ logic
- No breaking changes to existing contracts