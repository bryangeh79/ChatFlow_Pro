# Phase 7 Website Minimal Acceptance Guide

## Goal
Verify that the first real Website milestone is stable, repeatable, and reviewable.

## Prerequisites
- Website webhook entry exists.
- Website inbound parsing exists.
- Unified inbound pipeline entry exists.
- Website outbound mapping exists.
- Website sender boundary exists.
- Unified send result and fallback handling exist.

## Success Path
1. Send a valid Website request.
2. Confirm webhook receives the request.
3. Confirm `parseWebsiteInbound` converts it to `UnifiedInboundMessage`.
4. Confirm the message enters the unified pipeline.
5. Confirm a `UnifiedResponse` is produced.
6. Confirm Website outbound payload is mapped.
7. Confirm sender returns `UnifiedSendResult` with success.

## Failure Path
1. Send an invalid Website request with missing required fields.
2. Confirm webhook receives the request.
3. Confirm parsing fails safely.
4. Confirm fallback / failure result is returned.
5. Confirm no internal exception is exposed as a false success.

## Expected Input
### Success Example
```json
{
  "id": "web-msg-002",
  "user_id": "visitor-456",
  "session_id": "session-def",
  "text": "Hello from the website",
  "language": "en",
  "timestamp": "2026-04-03T11:07:00.000Z"
}
```

### Failure Example
```json
{
  "id": "broken-001",
  "text": "missing session fields"
}
```

## Expected Output
### Success Output
- `UnifiedInboundMessage` is created
- `UnifiedResponse` is created
- outbound payload is mapped
- `UnifiedSendResult` returns success

### Failure Output
- safe fallback result is returned
- `UnifiedSendResult` or safe fallback error indicates failure
- no silent failure occurs

## Current Limits
- This is a minimal real integration guide, not production deployment documentation.
- Other formal channels are not included.
- Database expansion, production monitoring, and complex retry policies are out of scope here.

## Pass Criteria
- The same valid request can be repeated and still pass.
- The same invalid request can be repeated and still fail safely.
- The steps above are enough for another person to reproduce the check without guessing.
