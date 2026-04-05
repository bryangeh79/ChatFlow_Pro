# Phase 11.24 FAQ Pipeline Consumption Design

## 1. Purpose

This document defines how the unified inbound pipeline should consume a FAQ resolver result.

It is design-only and does not implement any code.

## 2. Resolver Result Ingestion

The FAQ resolver returns a small shared result object back into the unified inbound pipeline.

The pipeline should treat that result as an internal shared decision input, not as a webhook contract change.

## 3. matched=true Pipeline Behavior

When `matched=true`, the pipeline should do only the minimum necessary FAQ handling:

- accept the FAQ result as the active FAQ path result
- keep the flow inside the shared unified pipeline
- allow the pipeline to use the FAQ answer as the FAQ response candidate
- preserve the existing channel-specific outbound mapping boundaries

The pipeline should not turn this into a complex conversation manager.

## 4. no-match Pipeline Behavior

When no match is found:

- keep the result passive
- continue with pass-through behavior
- preserve the current non-FAQ path
- do not alter the webhook response contract

## 5. How the Result Reaches Response / Outbound Mapping

The FAQ result should feed into the same shared pipeline stage that already prepares response data.

That stage may then decide whether the response candidate comes from FAQ or from the existing non-FAQ path.

The final outbound mapping must remain channel-specific only at the transport/mapping boundary.

## 6. Shared Path Rule

Telegram and Website must consume the same FAQ pipeline path.

Allowed differences remain only at:

- adapter parsing
- transport/send behavior
- outbound mapping
- channel-specific debug formatting when needed

## 7. Explicit Non-Goals

This document does **not** do the following:

- no webhook contract changes
- no response rewriting framework
- no lead capture
- no handoff
- no menu / command / state systems
- no richer interaction system
- no scoring engine
- no retrieval engine
- no channel-specific FAQ branching

## 8. Current Conclusion

The FAQ result should remain an internal pipeline decision input.

On match, the pipeline may use it as the FAQ response candidate; on no-match, it stays passive and the flow continues unchanged.