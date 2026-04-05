# Phase 11.14 FAQ Content Source Design

## 1. Purpose

This document defines where real FAQ content should live in the future, and what the minimum content source should look like.

It does **not** add FAQ matching or scoring logic.

## 2. Where Real FAQ Content Should Live

Real FAQ content should live in a shared content source layer outside the webhook handlers and outside the raw adapter layer.

Recommended placement:

- shared FAQ content registry
- seed-backed content files or lightweight registry source
- pipeline-read-only content loader

This keeps Telegram and Website aligned and avoids channel-specific FAQ forks.

## 3. Minimum Content Source Shape

The minimum content source should be a lightweight, shared registry rather than a full knowledge base.

Acceptable minimal forms:

- static seed file
- minimal registry JSON / YAML / TS object
- lightweight source module

The important point is that the source is shared, readable, and replaceable.

## 4. How the Resolver Skeleton Would Read It Later

The FAQ resolver skeleton may later receive a content registry reference or seed snapshot, but in the current phase it must remain passive.

Future read flow:

- pipeline reaches FAQ hook
- FAQ hook passes shared context to resolver skeleton
- resolver skeleton reads from shared content source
- resolver skeleton may return a match / no-match result

Current phase rule:

- it may be wired as a shape only
- it must not perform real matching or scoring

## 5. Stable Input / Output Boundary

Inputs remain stable:

- `UnifiedInboundMessage`
- `UnifiedSessionContext`
- `UnifiedIntentPreparationResult`
- `UnifiedDispatchPlaceholderResult`

Outputs remain stable in the current phase:

- no-match / empty / pass-through
- no response rewriting
- no knowledge-base side effects

## 6. Shared Without Channel Forking

Telegram and Website must use the same shared content source.

Allowed differences:

- adapter parsing
- transport/send behavior
- outbound mapping
- channel-specific debug formatting when needed

Not allowed:

- separate FAQ registries per channel
- channel-specific FAQ knowledge bases
- routing by channel into different FAQ semantics

## 7. Current Explicit Non-Goals

This phase does **not** do the following:

- no real FAQ content authoring workflow
- no FAQ scoring logic
- no fuzzy matching logic
- no semantic retrieval layer
- no lead capture
- no handoff
- no menu / command / state systems
- no webhook contract changes
- no 200-response changes

## 8. Safety Boundary

The content source must stay passive until a future phase deliberately connects it to the resolver.

The protected webhook baseline remains untouched:

- `POST /webhooks/telegram`
- `POST /webhooks/website`
- 200 responses
- visible regression fields
- independent channel behavior

## 9. Current Conclusion

The right future place for FAQ content is a shared lightweight registry or seed source.

That content source is for later use only; it is not yet a live FAQ engine.