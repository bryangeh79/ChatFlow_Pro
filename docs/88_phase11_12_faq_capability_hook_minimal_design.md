# Phase 11.12 FAQ Capability Hook Minimal Design

## 1. Purpose

This document defines the minimum design boundary for the FAQ capability hook.

It does **not** implement FAQ resolution logic. It only defines where FAQ will be mounted, what it receives, and what it may return later.

## 2. Recommended Mount Layer

The FAQ capability hook should be mounted inside the unified inbound pipeline, after:

- adapter normalization
- session context creation / update
- intent preparation
- dispatch placeholder / dispatch decision

Recommended order:

- adapter normalization
- session context
- intent preparation
- dispatch
- FAQ hook
- lead capture hook
- handoff hook
- fallback
- response mapping / sender

## 3. Relationship to Intent Preparation and Dispatch

### Intent preparation

Intent preparation is the upstream signal stage.

It should decide only whether the inbound message looks informational enough to consider FAQ-style handling.

### Dispatch placeholder

Dispatch is the routing decision stage.

It should select the next path, such as:

- informational / FAQ path
- non-FAQ pass-through path
- fallback path

### FAQ hook

The FAQ hook is the capability execution slot.

It should only run when dispatch indicates the informational path.

## 4. Inputs and Outputs

### Inputs

The FAQ hook should receive:

- `UnifiedInboundMessage`
- `UnifiedSessionContext`
- `UnifiedIntentPreparationResult`
- `UnifiedDispatchPlaceholderResult`

Optional future inputs may include:

- FAQ knowledge base context
- language context
- channel metadata

### Outputs

The FAQ hook should eventually be able to return:

- a normalized FAQ match result
- a response candidate
- a no-match signal
- an enrichment signal for session/debug metadata

At this stage, these outputs are **design-only**.

## 5. Pass-Through vs FAQ Hit Boundary

### Pass-through

The hook should pass through when:

- intent is unknown
- dispatch does not choose the informational path
- no FAQ capability is wired yet
- the current phase intentionally keeps the layer passive

### FAQ hit

The hook should be considered a FAQ hit only when:

- dispatch selects the informational path
- a real FAQ resolver is later connected
- the match is strong enough to produce a meaningful FAQ response candidate

## 6. Shared Layer Relationship

The FAQ hook must remain in the shared pipeline layer, not inside raw webhook handlers.

Allowed shared dependencies:

- unified inbound contract
- unified session context
- intent preparation result
- dispatch result
- shared trace/debug metadata

Not allowed at this stage:

- channel-specific FAQ logic inside Telegram-only or Website-only handlers
- raw payload parsing inside FAQ logic
- webhook-level branching for FAQ implementation

## 7. Telegram / Website Boundary

Telegram and Website differences should remain local to:

- adapter parsing
- outbound mapping
- transport/send behavior
- channel-specific debug formatting if needed

The FAQ hook itself should stay shared.

## 8. Explicit Non-Goals

This phase does **not** do the following:

- no real FAQ resolver implementation
- no FAQ knowledge base wiring
- no scoring model implementation
- no multi-turn FAQ follow-up logic
- no lead capture integration
- no handoff integration
- no menu or command system
- no state machine
- no webhook response contract change
- no 200-return path change

## 9. Safety Boundary

The FAQ hook must never become a reason to reopen webhook stability work.

The current protected baseline remains:

- `POST /webhooks/telegram`
- `POST /webhooks/website`
- 200 responses
- visible regression fields
- independent channel behavior

## 10. Current Conclusion

FAQ is the correct first capability hook to mount later because it is shared, informational, and low-risk.

For now, it remains a documented placeholder only.