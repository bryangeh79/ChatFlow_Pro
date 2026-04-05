# Phase 11.38 Lead Capture Pipeline Consumption and Session Boundary Design

## 1. Purpose

This document defines how the first lead capture result should be consumed by the unified inbound pipeline, and how far session updates are allowed to go.

It is design-only and does not implement lead capture code.

## 2. Pipeline Consumption Rule

Lead capture result should return into the shared unified inbound pipeline as a small internal result object.

The pipeline should consume it only after FAQ has not already cleanly resolved the interaction.

## 3. Minimal Status Handling

### status = none

Pipeline behavior:

- remain passive
- keep pass-through behavior
- do not alter the active reply path
- do not introduce lead capture prompts

### status = partial

Pipeline behavior:

- keep the path shared and lightweight
- allow a minimal lead-capture-oriented response candidate only if the shared path can stay simple
- do not introduce a clarification loop engine

### status = captured

Pipeline behavior:

- mark the capture result as completed for the current turn
- allow a minimal confirmation-style response candidate if needed
- do not introduce workflow or assignment semantics

## 4. Allowed Session Writes

The first cut should write only lightweight lead-capture-related state.

Allowed writes:

- `lead_capture_state.status`
- `lead_capture_state.collected_fields`
- `lead_capture_state.missing_fields`
- `lead_capture_state.completed_at`

## 5. Session Writes Not Allowed Yet

The first cut must not write:

- owner / assignee semantics
- workflow state
- CRM-style expanded profile state
- conversation control flags that imply a state machine
- handoff-related state beyond what already exists

## 6. Response / Outbound Path

Response / outbound path should remain mostly unchanged.

Minimum change allowed:

- for `partial`, optionally expose a minimal shared `lead_capture_prompt`
- for `captured`, optionally expose a minimal confirmation-style `reply_text`

No channel-specific lead capture path should be introduced.

## 7. FAQ / Lead Capture Coexistence

FAQ and lead capture must remain separate shared paths.

Rules:

- if FAQ resolves the interaction, FAQ remains active
- if FAQ does not resolve and lead capture returns `none`, pass-through continues
- if FAQ does not resolve and lead capture returns `partial` or `captured`, the pipeline may consume the lead capture result inside the shared path
- lead capture must not overwrite FAQ semantics retroactively

## 8. Shared Path Rule

Telegram and Website must consume the same lead capture result model, the same session update limits, and the same shared response path.

Allowed differences remain only at:

- adapter parsing
- outbound mapping
- transport/send behavior
- channel-specific debug formatting when needed

## 9. Explicit Non-Goals

This phase does **not** do the following:

- no real lead capture implementation
- no state machine
- no ownership / assignment / workflow semantics
- no handoff integration
- no clarification loop engine
- no menu / command system
- no webhook contract changes
- no 200-response changes

## 10. Current Conclusion

The first lead capture cut can be consumed safely only if it stays small:

- none -> pass-through
- partial -> lightweight shared prompt path
- captured -> lightweight shared confirmation path

Session updates must stay limited to lead_capture_state only.