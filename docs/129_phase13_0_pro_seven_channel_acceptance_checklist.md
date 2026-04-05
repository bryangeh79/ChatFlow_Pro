# Phase 13.0 Pro Seven-Channel Acceptance Checklist

## Overview
This document provides acceptance test cases for all seven unified inbound channels in ChatFlow Pro (Pro_v1.06). Each channel has:
- **Minimal curl command** for local testing
- **Example request body** (both test/dev flat format and platform webhook format)
- **Expected response** (200 OK with pipeline evidence or skipped)
- **Pipeline evidence fields** to verify unified pipeline integration
- **Current limitations** (synthetic sender, no production credentials)

## Test Environment
- **Base URL**: `http://localhost:3000` (default ChatFlow Pro server)
- **All routes**: Return HTTP 200 OK for both processed and skipped messages
- **Pipeline integration**: All channels share same unified inbound pipeline (lead capture + FAQ)
- **Sender status**: **Synthetic sender** only – no real platform API credentials configured

## Channel 1: Website Live Chat
**Route**: `POST /webhooks/website`

### Test Case 1.1: Text Message (Processed)
```bash
curl -X POST http://localhost:3000/webhooks/website \
  -H "Content-Type: application/json" \
  -d '{
    "id": "w-upd-001",
    "user_id": "w-user-1",
    "session_id": "w-session-1",
    "text": "Need pricing info",
    "language": "en",
    "timestamp": "2026-04-03T10:57:00.000Z"
  }'
```

**Expected Response**:
- HTTP 200 OK
- `ok: true`
- `skipped: false` (or absent)
- Pipeline evidence: `channel: "website"`, `session_id: "website:w-user-1:w-session-1"`

### Test Case 1.2: Lead Capture Trigger
```bash
curl -X POST http://localhost:3000/webhooks/website \
  -H "Content-Type: application/json" \
  -d '{
    "id": "w-upd-002",
    "user_id": "w-user-2",
    "session_id": "w-session-2",
    "text": "My name is John Doe, phone 123-456-7890",
    "language": "en",
    "timestamp": "2026-04-03T10:58:00.000Z"
  }'
```

**Expected Evidence**:
- Lead capture detection: `lead_capture_state.status: "partial"` or `"captured"`
- Partial prompt or confirmation in `reply_text`

## Channel 2: Telegram
**Route**: `POST /webhooks/telegram`

### Test Case 2.1: Text Message (Processed)
```bash
curl -X POST http://localhost:3000/webhooks/telegram \
  -H "Content-Type: application/json" \
  -d '{
    "update_id": 123456789,
    "message": {
      "message_id": 1,
      "from": {
        "id": 987654321,
        "is_bot": false,
        "first_name": "Test",
        "last_name": "User"
      },
      "chat": {
        "id": 987654321,
        "first_name": "Test",
        "last_name": "User",
        "type": "private"
      },
      "date": 1703275200,
      "text": "Hello from Telegram"
    }
  }'
```

**Expected Response**:
- HTTP 200 OK
- `ok: true`
- `skipped: false`
- Pipeline evidence: `channel: "telegram"`, `session_id: "telegram:987654321:987654321"`

### Test Case 2.2: /start Command (Help Response)
```bash
curl -X POST http://localhost:3000/webhooks/telegram \
  -H "Content-Type: application/json" \
  -d '{
    "update_id": 123456790,
    "message": {
      "message_id": 2,
      "from": { "id": 987654321 },
      "chat": { "id": 987654321 },
      "date": 1703275200,
      "text": "/start"
    }
  }'
```

**Expected Evidence**:
- Trigger detection: `trigger: "help"`
- Help response in `reply_text`

## Channel 3: WhatsApp
**Route**: `POST /webhooks/whatsapp`

### Test Case 3.1: Text Message (Processed) - Flat Format
```bash
curl -X POST http://localhost:3000/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "from": "wa-user-1",
    "conversation_id": "wa-thread-1",
    "id": "wa-msg-1",
    "text": "Hello from WhatsApp",
    "timestamp": "2026-04-03T10:57:00.000Z"
  }'
```

**Expected Response**:
- HTTP 200 OK
- `ok: true`
- `skipped: false`
- Pipeline evidence: `channel: "whatsapp"`, `session_id: "whatsapp:wa-user-1:wa-thread-1"`

### Test Case 3.2: WhatsApp Business Webhook Format (Processed)
```bash
curl -X POST http://localhost:3000/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "0",
      "changes": [{
        "value": {
          "messaging_product": "whatsapp",
          "metadata": {
            "display_phone_number": "1234567890",
            "phone_number_id": "9876543210"
          },
          "contacts": [{
            "profile": { "name": "Test User" },
            "wa_id": "wa-user-2"
          }],
          "messages": [{
            "from": "wa-user-2",
            "id": "wa-msg-2",
            "timestamp": "1703275200",
            "text": { "body": "Hello from WhatsApp Business API" },
            "type": "text"
          }]
        },
        "field": "messages"
      }]
    }]
  }'
```

**Expected Evidence**:
- Same pipeline integration as flat format
- `channel: "whatsapp"` maintained

### Test Case 3.3: Non-Message Event (Skipped)
```bash
curl -X POST http://localhost:3000/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "0",
      "changes": [{
        "value": { "metadata": {} },
        "field": "messages"
      }]
    }]
  }'
```

**Expected Response**:
- HTTP 200 OK
- `ok: true`
- `skipped: true`
- `reason: "no_processable_message"`

## Channel 4: Facebook Messenger
**Route**: `POST /webhooks/messenger`

### Test Case 4.1: Text Message (Processed) - Flat Format
```bash
curl -X POST http://localhost:3000/webhooks/messenger \
  -H "Content-Type: application/json" \
  -d '{
    "sender": { "id": "fb-user-1", "name": "Test User" },
    "thread": { "id": "fb-thread-1" },
    "text": "Hello from Messenger",
    "timestamp": "2026-04-03T10:57:00.000Z"
  }'
```

**Expected Response**:
- HTTP 200 OK
- `ok: true`
- `skipped: false`
- Pipeline evidence: `channel: "messenger"`, `session_id: "messenger:fb-user-1:fb-thread-1"`

### Test Case 4.2: Facebook Graph API Webhook Format
```bash
curl -X POST http://localhost:3000/webhooks/messenger \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

**Expected Evidence**:
- Same pipeline integration
- `channel: "messenger"` maintained

### Test Case 4.3: Delivery Event (Skipped)
```bash
curl -X POST http://localhost:3000/webhooks/messenger \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "id": "0",
      "time": 1703275200,
      "messaging": [{
        "sender": { "id": "fb-user-3" },
        "recipient": { "id": "page-id" },
        "timestamp": 1703275200,
        "delivery": { "mids": ["msg-456"], "watermark": 1703275200 }
      }]
    }]
  }'
```

**Expected Response**:
- HTTP 200 OK
- `ok: true`
- `skipped: true`
- `reason: "no_processable_message"`

## Channel 5: Line
**Route**: `POST /webhooks/line`

### Test Case 5.1: Text Message (Processed) - Flat Format
```bash
curl -X POST http://localhost:3000/webhooks/line \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "line-user-1",
    "conversationId": "line-conv-1",
    "text": "Hello from Line",
    "timestamp": "2026-04-03T10:57:00.000Z"
  }'
```

**Expected Response**:
- HTTP 200 OK
- `ok: true`
- `skipped: false`
- Pipeline evidence: `channel: "line"`, `session_id: "line:line-user-1:line-conv-1"`

### Test Case 5.2: Line Webhook Format
```bash
curl -X POST http://localhost:3000/webhooks/line \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

**Expected Evidence**:
- Same pipeline integration
- `channel: "line"` maintained

### Test Case 5.3: Follow Event (Skipped)
```bash
curl -X POST http://localhost:3000/webhooks/line \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "U1234567890abcdef1234567890abcdef",
    "events": [{
      "type": "follow",
      "source": {
        "userId": "line-user-3",
        "type": "user"
      },
      "timestamp": 1703275200000
    }]
  }'
```

**Expected Response**:
- HTTP 200 OK
- `ok: true`
- `skipped: true`
- `reason: "no_processable_message"`

## Channel 6: Zalo
**Route**: `POST /webhooks/zalo`

### Test Case 6.1: Text Message (Processed) - Flat Format
```bash
curl -X POST http://localhost:3000/webhooks/zalo \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "zalo-user-1",
    "thread_id": "zalo-conv-1",
    "text": "Hello from Zalo",
    "timestamp": "2026-04-03T10:57:00.000Z"
  }'
```

**Expected Response**:
- HTTP 200 OK
- `ok: true`
- `skipped: false`
- Pipeline evidence: `channel: "zalo"`, `session_id: "zalo:zalo-user-1:zalo-conv-1"`

### Test Case 6.2: Zalo OA Webhook Format
```bash
curl -X POST http://localhost:3000/webhooks/zalo \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "user_send_text",
    "sender": { "id": "zalo-user-2" },
    "recipient": { "id": "zalo-oa-1" },
    "message": { "text": "Hello from Zalo webhook" },
    "timestamp": "2026-04-03T10:57:00.000Z"
  }'
```

**Expected Evidence**:
- Same pipeline integration
- `channel: "zalo"` maintained

### Test Case 6.3: Nested Zalo Webhook Format
```bash
curl -X POST http://localhost:3000/webhooks/zalo \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "event_name": "user_send_text",
      "sender": { "id": "zalo-user-3" },
      "oa_id": "zalo-oa-2",
      "message": { "text": "Hello from nested Zalo webhook" },
      "timestamp": "2026-04-03T10:57:00.000Z"
    }
  }'
```

**Expected Evidence**:
- Same pipeline integration
- `channel: "zalo"` maintained

### Test Case 6.4: Follow Event (Skipped)
```bash
curl -X POST http://localhost:3000/webhooks/zalo \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "user_follow",
    "sender": { "id": "zalo-user-4" },
    "timestamp": "2026-04-03T10:57:00.000Z"
  }'
```

**Expected Response**:
- HTTP 200 OK
- `ok: true`
- `skipped: true`
- `reason: "no_processable_message"`

## Channel 7: Verification Endpoint
**Route**: `GET /verification`

### Test Case 7.1: All Channels Verification
```bash
curl -X GET http://localhost:3000/verification
```

**Expected Response**:
- HTTP 200 OK
- JSON object with test results for all 7 channels
- Each channel should show `ok: true`
- Evidence of pipeline integration for processed messages
- Skipped events properly marked

## Pipeline Evidence Fields
For each processed message, verify these fields in response:

1. **Channel identification**: `channel: "<channel_code>"`
2. **Session creation**: `session_id: "<channel>:<user_id>:<session_id>"`
3. **Pipeline execution**: `response.channel: "<channel_code>"`
4. **Outbound mapping**: `outboundPayload.kind: "text"` (or other)
5. **Sender integration**: `sendResult.result.channel: "<channel_code>"`

## Current Limitations (Acceptance Context)
1. **Synthetic sender only**: No real platform API credentials configured
2. **No webhook verification**: GET endpoints for platform verification not implemented
3. **Single-process session store**: In-memory only, lost on restart
4. **File-based persistence**: JSONL files for captured leads only
5. **Placeholder FAQ content**: English-only seed entries
6. **Regex-based field extraction**: Limited validation for lead capture

## Acceptance Criteria
✅ **All 7 routes return HTTP 200 OK** for both processed and skipped messages  
✅ **Unified pipeline integration** verified via evidence fields  
✅ **Lead capture works** across all channels (detection → merging → persistence)  
✅ **FAQ matching works** across all channels (when text matches seed entries)  
✅ **Session store shared** across all channels (same 1000-cap Map)  
✅ **Type system complete** for all 7 channels  
✅ **Build passes** (`npm run build`) with no type errors  

## Real Outbound Transport Matrix (Updated: Pro_v1.07.11)

| Channel | Real Transport Status | Environment Variables | Conditions | Notes |
|---------|----------------------|----------------------|------------|-------|
| **Telegram** | ✅ Real | `TELEGRAM_BOT_TOKEN`<br>`TELEGRAM_SANDBOX` (optional)<br>`TELEGRAM_PROXY_*` (optional) | Token valid + not sandbox | Bot API with optional HTTP proxy |
| **WhatsApp** | ✅ Real | `WHATSAPP_ACCESS_TOKEN`<br>`WHATSAPP_PHONE_NUMBER_ID`<br>`WHATSAPP_SANDBOX` (optional) | Token + phone number ID valid + not sandbox | Graph API (Facebook) |
| **Messenger** | ✅ Real | `MESSENGER_PAGE_ACCESS_TOKEN`<br>`MESSENGER_PAGE_ID`<br>`MESSENGER_SANDBOX` (optional) | Token + page ID valid + not sandbox | Graph API (Facebook) |
| **Line** | ✅ Real | `LINE_CHANNEL_ACCESS_TOKEN`<br>`LINE_SANDBOX` (optional)<br>`LINE_MESSAGING_DISABLED` (optional) | Token valid + not sandbox/disabled | Push API (`/v2/bot/message/push`) |
| **Zalo** | ✅ Real | `ZALO_ACCESS_TOKEN`<br>`ZALO_OA_ID`<br>`ZALO_SANDBOX` (optional)<br>`ZALO_MESSAGING_DISABLED` (optional) | Token + OA ID valid + not sandbox/disabled | Open API (`/v2.0/oa/message`) |
| **Website** | ❌ Synthetic | – | Always synthetic | No real transport needed (direct response) |
| **All Channels** | Webhook Security | See Phase 15.4a–15.4d | When secret configured | GET verification + POST signature validation |

**Implementation Notes**:
- All real transports: 10s timeout + single retry on 5xx/429/network errors
- Token redaction: No tokens in logs (split/join replacement)
- Session mapping: `{channel}:{recipient}:{session}` → extract recipient
- Fallback: Missing/invalid config → synthetic sender (no error to user)
- Webhook response: Always HTTP 200 OK even when real API fails

## Next Steps After Acceptance
1. **Pro channel suite accepted** as baseline
2. **Choose Phase 13 direction**:
   - Technical debt: field validation, session TTL, JSONL cleanup
   - Next capability: handoff integration, menu/command system
   - Channel expansion: Telegram real development
   - Admin interface: leads viewing/management
3. **Production readiness** considerations:
   - Real platform API credentials
   - Webhook verification endpoints
   - Database-backed session store
   - Production FAQ content