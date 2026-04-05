# Phase 11.21 FAQ Minimal Real Match Path Design

## 1. Purpose

This document defines the first real FAQ match path at a design level only.

It does not implement matching code.

## 2. Minimum Match Flow

The first real FAQ match path should be:

- inbound message enters the shared unified pipeline
- intent preparation produces a minimal signal
- dispatch selects the informational / FAQ path
- FAQ hook calls the shared FAQ resolver boundary
- FAQ resolver reads the shared FAQ content source / registry
- resolver returns either a match result or a no-match result
- pipeline continues with either FAQ response handling or pass-through handling

## 3. Shared Content Source Use

The shared FAQ content source / registry is the only shared content layer the resolver may read.

The resolver should use it as a read-only shared source.

The current seed registry is still the baseline data source, but the path is defined so a later real content layer can be substituted without changing the webhook boundary.

## 4. When matched=true Is Allowed

The resolver may only return `matched=true` when all of the following are true:

- the dispatch decision selects the FAQ / informational path
- the resolver is operating on the shared FAQ boundary, not a webhook handler
- a real FAQ matching implementation has been intentionally enabled later
- the match is strong enough to be considered a real FAQ hit, not just a placeholder seed lookup

## 5. Minimal Match Result Fields

The first real FAQ hit result should remain small and stable.

Minimum fields:

- `matched`
- `answer`
- `matched_topic`
- `confidence`

Optional later fields can be added only if the real FAQ capability needs them.

## 6. No-Match / Pass-Through Boundary

If no match is found, the system must stay passive:

- return a no-match result
- keep the existing flow passive
- let the pipeline continue without changing webhook behavior
- preserve the Telegram / Website shared path

## 7. Shared Path Rule

Telegram and Website must continue to use the same FAQ match path.

Allowed differences remain only at:

- adapter parsing
- transport/send behavior
- outbound mapping
- channel-specific debug formatting when needed

Not allowed:

- separate FAQ match paths per channel
- separate FAQ content semantics per channel
- webhook-specific FAQ handling

## 8. Explicit Non-Goals

This document does **not** do the following:

- no real matching code
- no scoring logic
- no retrieval implementation
- no lead capture
- no handoff
- no menu / command / state systems
- no webhook contract changes
- no 200-response changes

## 9. Current Conclusion

If real FAQ work is ever started, this is the first safe match-path boundary to implement.

Until then, the frozen seed baseline remains the stop point.