# Phase 11.9 Dual Entry Unified Inbound Contract Baseline

## 1. Current Real Main Repository

- `C:\AI_WORKSPACE\Chatflow\ChatFlow_Pro`

## 2. Current Phase and Version

- Current Phase: `Phase 11.8` (closed)
- Current Version: `Pro_v1.05`

## 3. Current Stable Baseline

The project currently has a stable dual-entry minimal real webhook baseline:

- Telegram: `POST /webhooks/telegram`
- Website: `POST /webhooks/website`
- Both return `200`
- Both keep the key visible fields in place
- Both continue to enter their own minimal chain without breaking each other

## 4. Unified Inbound Contract

The shared inbound contract at this stage is the current `UnifiedInboundMessage` plus `UnifiedSessionContext` flow.

Minimum expectations:

- Each inbound message must normalize into a shared inbound shape before pipeline processing
- Each channel may add channel-specific parsing at the adapter boundary only
- Shared pipeline behavior must consume the unified contract, not raw channel payloads
- Session context must remain a shared cross-channel concept

## 5. Shared Boundary

Shared behavior should stay inside the following layers:

- channel adapter normalization
- unified session context creation / update
- unified inbound pipeline
- outbound mapping
- channel sender
- minimal trace / observability context

Shared behavior should not be mixed back into raw webhook routing unless required by a real capability segment.

## 6. Protected Traces and Visible Fields

The current stable regression must preserve visibility for the following fields where applicable:

- `message`
- `session`
- `response`
- `outboundPayload`
- `sendResult`
- `provider_message_id`
- `debug_steps`

## 7. Do Not Cross / 禁触区

Do not expand into these areas just because the dual-entry baseline is stable:

- menu systems
- command systems
- conversation state machines
- rich interactive flows
- shared-core refactors with no immediate value
- low-yield webhook micro-tweaks
- version bumping without a new real capability segment

## 8. Future Extension Mount Points

If a new real capability segment is chosen later, these are the natural mounting points:

- inbound adapter parsing
- unified inbound pipeline stages
- session state enrichment
- response generation policy
- channel-specific outbound mapping
- sender / transport boundary
- trace and debug metadata

## 9. Next Real Capability Segment Rule

The next step must start from the stable dual-entry baseline and add one genuinely new engineering capability.

It must be:

- real
- measurable
- bounded
- non-breaking
- not a regression-only tweak

## 10. Current Conclusion

The dual-entry baseline is preserved and should be treated as the new reference boundary for future work.

Current posture:

- preserve
- accumulate
- do not widen scope yet
- do not reopen low-return micro work