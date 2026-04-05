# Phase 11.36 Lead Capture Minimal Candidate Design

## 1. Purpose

This document defines the first minimal lead capture candidate design and boundary.

It is design-only and does not implement lead capture code.

## 2. Mount Layer

Lead capture should be mounted inside the shared unified inbound pipeline as the next capability hook after FAQ handling.

Recommended order:

- adapter normalization
- session context creation / update
- intent preparation
- dispatch
- FAQ hook
- lead capture hook
- handoff hook
- fallback
- response mapping / sender

## 3. Relationship to Shared Pipeline / Capability Hook

Lead capture should remain a shared capability hook, not a webhook-level feature.

It should consume the existing unified message, session context, and pipeline context without reopening channel-specific routing.

## 4. First-Cut Minimal Fields

The first cut should only consider a very small capture set:

- name
- phone
- email

No broader profile or CRM schema should be introduced in the first cut.

## 5. FAQ / Non-FAQ Relationship

Lead capture should not replace FAQ.

Expected relationship:

- if FAQ matches cleanly, FAQ remains the active path
- if FAQ does not resolve the interaction, lead capture may become eligible later
- lead capture should remain a separate capability path, not be fused into FAQ matching

## 6. When Lead Capture Path Is Allowed

Lead capture may be allowed only when:

- the shared pipeline reaches the lead capture hook
- the message indicates simple collectable contact intent or clear contact detail presence
- the path can stay shared across Telegram and Website
- the path does not require ownership / assignment / workflow semantics

## 7. When It Must Pass Through

Lead capture must pass through when:

- the message is already sufficiently resolved by FAQ
- no minimal contact signal is present
- the path would require state-machine behavior
- the path would require handoff / assignment semantics
- channel-specific logic would be needed to make it work

## 8. Shared Path Rule

Telegram and Website must use the same lead capture path.

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
- no menu / command system
- no webhook contract changes
- no 200-response changes

## 10. Current Conclusion

Lead capture is suitable as the next real capability segment only if it stays very small, shared, and field-limited.

The first cut should remain a minimal shared hook for name / phone / email only.