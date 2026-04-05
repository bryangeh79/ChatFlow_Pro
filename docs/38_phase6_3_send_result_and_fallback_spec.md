# Phase 6.3 Send Result and Fallback Spec

## Send Result Structure
- status: success | failed | skipped | fallback
- provider_message_id: optional provider placeholder id
- retryable: whether retry is safe
- error: normalized internal error info
- sent_at / failed_at / completed_at: lifecycle timestamps
- trace_id / request_id / message_trace_id: minimal observability keys
- channel / session_id: correlation keys
- debug_steps: internal tracking only, bounded and optional

## Fallback Trigger Scenarios
- outbound mapping failure
- sender failure
- unsupported channel
- unsupported message type
- missing required field
- internal pipeline error

## Error Classification Boundary
- Internal only: raw stack-like detail, provider internals, transport internals
- Safe user-visible: generic send failed, generic unsupported content, generic missing info
- Never expose raw internal exception text to end users

## Reusable Fields for Real SDKs
- channel
- session_id
- provider_message_id
- retryable
- error
- sent_at / failed_at / completed_at
- trace_id / request_id / message_trace_id
