# Phase 11.13 FAQ Resolver Skeleton

## 1. Status

A minimal FAQ resolver skeleton has been added behind the FAQ capability hook.

It is passive and does not resolve real FAQ content.

## 2. Inputs

The resolver skeleton receives:

- `UnifiedInboundMessage`
- `UnifiedSessionContext`
- `UnifiedIntentPreparationResult`
- `UnifiedDispatchPlaceholderResult`

## 3. Output

The resolver skeleton returns a fixed no-match shape:

- `matched: false`
- `answer: null`
- `matched_topic: null`
- `confidence: 0`

## 4. Boundary

The resolver skeleton sits behind the FAQ hook, not inside webhook handlers.

It is shared, passive, and low-side-effect.

## 5. Current Runtime Behavior

- FAQ hook remains a shared pipeline stage
- Intent/dispatch remain placeholder-only
- FAQ resolver remains no-match / empty
- Telegram and Website baseline behavior is preserved

## 6. Explicit Non-Goals

This phase does not implement:

- real FAQ content lookup
- knowledge base wiring
- scoring
- response rewriting based on FAQ
- lead capture
- handoff
- menu / command / state systems
- webhook contract changes