# Phase 7 Website Webhook and Parse Bring-up

## Scope
- Website only
- Real webhook entry skeleton
- Real inbound parse into `UnifiedInboundMessage`
- Minimal pipeline handoff
- Safe error path

## Successful Path
1. Real request enters Website webhook entry.
2. Webhook calls `parseWebsiteInbound`.
3. Payload becomes `UnifiedInboundMessage`.
4. Unified session context is created or reused.
5. Unified inbound pipeline returns a response.

## Failure Path
1. Real request enters Website webhook entry.
2. Parse step detects missing required fields or invalid body.
3. Safe error is returned through the fallback path.
4. No internal exception is exposed as a platform success.

## Field Mapping
- user_id -> external_user_id
- session_id -> external_session_id
- id -> message_id
- text -> text
- attachments -> attachments
- language -> language
- timestamp -> timestamp
- raw body -> raw_payload

## Note
- This is still the Website-only bring-up stage.
- No other channel is included.
