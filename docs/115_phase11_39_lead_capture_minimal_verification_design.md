# Phase 11.39 Lead Capture Minimal Evidence and Verification Design

## 1. Purpose

This document defines the smallest verification standard for the first lead capture cut.

It is design-only and does not implement lead capture code.

## 2. Verification Model

The first cut should verify three states only:

- `none`
- `partial`
- `captured`

Each state must be verifiable through shared evidence points in the pipeline, session, and response/outbound path.

## 3. none Verification

### Expected state

- lead capture does not activate
- pipeline remains passive
- pass-through behavior continues

### Evidence points

- `debug_steps` shows the lead capture hook was reached but no capture path was consumed
- `debug_metadata.leadCaptureResult.status = none`
- `session.lead_capture_state.status` remains effectively non-progressing
- no `lead_capture_prompt` is emitted
- no confirmation-style lead capture response is emitted

## 4. partial Verification

### Expected state

- lead capture identifies explicit contact intent or explicit partial contact info
- capture is incomplete but valid

### Evidence points

- `debug_steps` shows the lead capture path was consumed
- `debug_metadata.leadCaptureResult.status = partial`
- `debug_metadata.leadCaptureResult.captured_fields` is visible
- `debug_metadata.leadCaptureResult.missing_fields` is visible
- `session.lead_capture_state.status` reflects lightweight in-progress capture state
- `session.lead_capture_state.collected_fields` is visible
- `session.lead_capture_state.missing_fields` is visible
- response may expose a minimal shared `lead_capture_prompt`

## 5. captured Verification

### Expected state

- lead capture obtains the minimal required data for the first cut
- capture is completed for the current turn

### Evidence points

- `debug_steps` shows the lead capture path was consumed
- `debug_metadata.leadCaptureResult.status = captured`
- `debug_metadata.leadCaptureResult.captured_fields` is visible
- `session.lead_capture_state.status` reflects completed capture state
- `session.lead_capture_state.collected_fields` is visible
- `session.lead_capture_state.completed_at` is visible
- response may expose a minimal confirmation-style `reply_text`

## 6. Shared Verification Rule

Telegram and Website must use the same verification standard:

- same status model
- same evidence categories
- same session field visibility
- same response/outbound verification logic

Allowed differences remain only at:

- adapter parsing
- outbound mapping
- transport/send behavior
- channel-specific debug formatting when needed

## 7. Current Explicit Non-Goals

This phase does **not** do the following:

- no real lead capture implementation
- no state machine
- no ownership / assignment / workflow semantics
- no handoff integration
- no clarification loop engine
- no menu / command system
- no webhook contract changes
- no 200-response changes

## 8. Current Conclusion

The first lead capture cut is ready for implementation only if all three states can later be verified using one shared evidence standard across Telegram and Website.