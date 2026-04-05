# Phase 11.22 FAQ Minimal Match Rule Design

## 1. Purpose

This document defines the first minimal FAQ matching rule set at design level only.

It does not implement matching code.

## 2. First Version Strategy

The first version should use the smallest practical rule set:

- exact match
- normalized exact match
- optional tiny keyword overlap assist

Recommended minimal combination:

- exact / normalized exact as the primary gate
- keyword overlap only as a very small assist signal

This keeps the design simple and avoids turning the FAQ layer into a retrieval system.

## 3. Why This Combination Is Minimal

This combination is minimal because:

- it is easy to explain
- it is easy to keep shared
- it does not require a scoring engine
- it does not require semantic retrieval
- it keeps the resolver boundary small and predictable

## 4. matched=true Boundary

`matched=true` should only be possible when:

- the dispatch decision has already selected the FAQ / informational path
- the candidate text is a true exact or normalized exact fit, or a clearly acceptable keyword-assisted fit in the first version
- the resolver is still operating inside the shared FAQ boundary
- the result is strong enough to be treated as a real FAQ hit, not a generic fallback

## 5. Confidence Handling

For the first version, confidence should stay extremely simple.

Recommended shape:

- exact / normalized exact match: high fixed confidence
- keyword-assisted match: lower fixed confidence
- no dynamic scoring ladder yet

This keeps confidence from becoming a complex ranking system.

## 6. How to Avoid Scope Creep

To avoid turning this into a complex system:

- do not add semantic similarity
- do not add ML ranking
- do not add fuzzy retrieval pipelines
- do not add multi-stage scoring
- do not branch by channel
- do not widen the rule set beyond a tiny shared baseline

## 7. Shared Rule

Telegram and Website must use the same rule set.

Allowed differences remain only at:

- adapter parsing
- outbound mapping
- transport/send behavior
- channel-specific debug formatting when needed

## 8. Explicit Non-Goals

This document does **not** do the following:

- no real matching code
- no retrieval engine
- no scoring framework
- no lead capture
- no handoff
- no menu / command / state systems
- no webhook contract changes
- no 200-response changes

## 9. Current Conclusion

The first minimal FAQ match rule should stay small: exact / normalized exact first, with only a tiny keyword assist idea as a secondary helper.

The frozen seed baseline remains the stop point until real FAQ work is explicitly chosen.