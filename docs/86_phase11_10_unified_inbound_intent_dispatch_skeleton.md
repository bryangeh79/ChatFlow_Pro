# Phase 11.10 Unified Inbound Intent Dispatch Skeleton

## 1. Purpose

This document defines the next real capability segment skeleton after the stable dual-entry baseline.

The goal is not feature expansion. The goal is to establish the engineering skeleton for intent dispatch so future capabilities can be mounted without reopening webhook tuning.

## 2. Current Stable Boundary

Current protected baseline:

- Telegram webhook: `POST /webhooks/telegram`
- Website webhook: `POST /webhooks/website`
- Both return `200`
- Both preserve the key visible fields
- Both remain independently verifiable
- Neither side should influence the other

## 3. Where Adapter Responsibility Ends

Adapter responsibility ends once the raw channel payload has been parsed into the shared inbound shape.

Adapter boundary responsibilities:

- parse raw channel payload
- normalize channel-specific fields
- map into `UnifiedInboundMessage`
- attach minimal channel metadata
- keep channel quirks local

Adapter boundary must not:

- decide business capability routing
- implement intent logic
- implement dispatch logic
- implement multi-step conversation state
- expand into command/menu systems

## 4. Where Intent Recognition Preparation Belongs

Intent recognition preparation belongs in the unified inbound pipeline, not in the webhook handler.

Recommended placement:

- normalized inbound message enters the unified pipeline
- the pipeline can inspect minimal message signals
- intent classification preparation can be introduced as a pipeline stage
- channel-specific parsing remains outside this layer

This keeps Telegram and Website aligned while allowing future intent logic to remain shared.

## 5. Where Dispatch Belongs

Dispatch belongs after unified normalization and before capability-specific handling.

Recommended layer order:

- adapter normalization
- session context creation / update
- unified inbound pipeline
- intent preparation stage
- dispatch stage
- capability hook stage
- response mapping / sender

Dispatch should choose the next handling path, but not contain the business implementation itself.

## 6. Future Capability Hook Mount Points

The future hook points should be treated as placeholders only.

### FAQ hook

- Mounted in the unified inbound pipeline
- Triggered after dispatch chooses informational handling
- Must remain shared and non-channel-specific unless a channel exception is unavoidable

### Lead capture hook

- Mounted in the unified inbound pipeline after intent classification / dispatch
- Should enrich session state and response policy
- Must not be embedded into raw webhook parsing

### Handoff hook

- Mounted after intent and capability resolution
- Should remain shared unless a channel explicitly requires transport-specific behavior

### Fallback hook

- Mounted at the end of the unified pipeline
- Used when no capability path resolves
- Must preserve the current protected baseline behavior

## 7. Telegram / Website Differences

Telegram and Website differences should remain only at the adapter / outbound mapping / transport boundary unless a real capability segment requires otherwise.

Allowed differences:

- channel-specific parsing
- channel-specific outbound payload mapping
- channel-specific transport/send behavior
- channel-specific debug metadata formatting

Not allowed at this stage:

- different business rules per channel
- different intent routing logic per channel
- different capability semantics per channel
- different core session behavior per channel

## 8. Shared Layers Allowed to Change

Allowed for minimal skeleton work only:

- shared inbound contract documentation
- unified pipeline stage naming
- dispatch placeholder interfaces
- capability hook placeholders
- trace/debug metadata naming
- comments / structure around boundaries

## 9. Shared Layers Temporarily Frozen

Do not touch these for functional expansion:

- webhook HTTP response contract
- current 200-return behavior
- visible fields in regression output
- existing adapter parsing output shape
- existing sender behavior that preserves the current baseline
- menu / command / state system design
- multi-turn interaction behavior

## 10. Skeleton Definition

The unified inbound intent dispatch skeleton is considered established when the code and docs clearly show:

- adapter ends at normalization
- pipeline begins with shared contract
- intent preparation is a pipeline concern
- dispatch is a separate stage
- FAQ / lead capture / handoff / fallback are distinct future hooks
- Telegram and Website differences are kept local

## 11. Current Conclusion

This is the right next engineering boundary, but only as a skeleton.

It is not yet a product feature. It is the frame that future capability work will hang from.