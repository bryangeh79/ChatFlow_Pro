# Phase 11.37 Lead Capture Minimal Signal and Output Design

## 1. Purpose

This document defines the first minimal trigger signals and output contract for the lead capture path.

It is design-only and does not implement lead capture code.

## 2. Minimal Trigger Signals

The first cut should allow lead capture only on very narrow signals.

Allowed trigger signals:

- explicit contact intent in the message
- explicit contact info present in the message

Examples of allowed signal classes:

- user clearly asks to be contacted
- user explicitly provides an email address
- user explicitly provides a phone number
- user explicitly provides a name together with contact intent

## 3. Signals That Are Not Enough

The following are not enough and must pass through:

- vague interest without contact intent
- generic support questions already covered by FAQ
- messages that would require clarification loops
- messages that would require multi-step collection
- messages that would require ownership / assignment / workflow semantics

## 4. Explicit First-Version Rule

The first version should accept only:

- explicit contact intent
- explicit contact info

It should not infer lead capture from weak hints.

## 5. Minimal Output Contract

The first version should keep the output extremely small.

Recommended fields:

- `status`
- `captured_fields`
- `missing_fields`

## 6. Smallest Status Model

A very small status model is enough for the first cut:

- `none`
- `partial`
- `captured`

This is smaller and safer than introducing richer workflow states.

## 7. FAQ / Lead Capture Coexistence

FAQ and lead capture must remain separate shared paths.

Rules:

- if FAQ resolves the message cleanly, FAQ stays active
- if FAQ does not resolve and explicit contact signal is present, lead capture may activate
- lead capture must not rewrite FAQ semantics
- lead capture must not depend on webhook-level branching

## 8. Shared Path Rule

Telegram and Website must use the same lead capture trigger logic and the same output contract.

Allowed differences remain only at:

- adapter parsing
- outbound mapping
- transport/send behavior
- channel-specific debug formatting when needed

## 9. Explicit Non-Goals

This phase does **not** do the following:

- no real lead capture implementation
- no state machine
- no clarification loop engine
- no ownership / assignment / workflow semantics
- no handoff integration
- no menu / command system
- no webhook contract changes
- no 200-response changes

## 10. Current Conclusion

The first lead capture cut should be triggered only by explicit contact intent or explicit contact info, and should return only a very small shared result contract: none / partial / captured.