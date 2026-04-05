# Phase 7 Website Stable Template

## Current Goal
Make the Website first real milestone easier to repeat, inspect, and verify.

## Real Completed Items
- Real Website webhook entry exists.
- Real Website inbound parsing exists.
- Unified inbound pipeline entry exists.
- Website outbound mapping exists.
- Sender boundary exists.
- Unified send result and fallback handling exist.
- Minimal trace and observability placeholders exist.
- Website milestone is already acceptance-ready.

## Added Strengthening Items
- Clear request / error log examples
- Clear success / failure acceptance scripts
- Clear outbound success / failure result visibility
- Clear repeatable verification steps

## Log Examples
### Success Request Log Example
- Location: webhook / inbound entry
- Example: a valid Website request with `user_id`, `session_id`, `text`, `language`, `timestamp`

### Failure Request Log Example
- Location: webhook / parse failure path
- Example: a Website request missing `user_id` or `session_id`

### Outbound Success Result Example
- Location: sender / send result path
- Example fields: `status=success`, `provider_message_id`, `retryable=false`, `sent_at`, `trace_id`, `request_id`, `message_trace_id`

### Outbound Failure Result Example
- Location: sender / fallback path
- Example fields: `status=failed` or `status=fallback`, `error.code`, `error.message`, `retryable`, `failed_at`, `trace_id`, `request_id`, `message_trace_id`

## Acceptance Scripts
### Success Script
1. Send a valid Website request.
2. Confirm webhook receives it.
3. Confirm parse to `UnifiedInboundMessage`.
4. Confirm pipeline output.
5. Confirm outbound mapping.
6. Confirm sender success result.

### Failure Script
1. Send an invalid Website request.
2. Confirm webhook receives it.
3. Confirm parsing fails safely.
4. Confirm fallback or failure result.
5. Confirm no silent failure.

## Repeat Verification Steps
1. Use the same valid input repeatedly.
2. Confirm the same success chain appears.
3. Use the same invalid input repeatedly.
4. Confirm the same safe failure chain appears.
5. Check trace/error/retryable/timestamp fields.

## Current Limits
- This remains a stable sample template, not production-grade completion.
- Other formal channels are still not started in real mode.
- No large feature expansion is included.
- No database/monitoring expansion is included.

## Next Recommendation
- Continue treating Website as the stable sample and only start Telegram planning preparation once this template is accepted.
