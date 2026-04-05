# Phase 11.23 FAQ Minimal Hit Output Design

## 1. Purpose

This document defines the minimal output structure for a real FAQ hit path at design level only.

It does not implement any FAQ output code.

## 2. Minimal Output Structure

The FAQ resolver output should stay very small and stable.

Required fields:

- `matched`
- `answer`
- `matched_topic`
- `confidence`

## 3. Matched Output Rules

When `matched=true`:

- `matched`: `true`
- `answer`: a real FAQ answer string
- `matched_topic`: the topic that was hit
- `confidence`: a fixed or extremely simple confidence value consistent with the minimal match rule

## 4. No-Match Output Rules

When no match is found:

- `matched`: `false`
- `answer`: `null`
- `matched_topic`: `null`
- `confidence`: `0`

This keeps no-match fully passive and easy to preserve.

## 5. How the Resolver Returns the Result

The resolver should hand the result back into the unified inbound pipeline as a small shared result object.

The pipeline should consume that object and decide whether to continue with FAQ response handling or pass-through handling.

## 6. Shared Path Rule

Telegram and Website must consume the same output structure.

Allowed differences remain only at:

- adapter parsing
- transport/send behavior
- outbound mapping
- channel-specific debug formatting when needed

## 7. Why This Output Is Minimal

This output is minimal because:

- it keeps the contract small
- it avoids webhook contract changes
- it avoids introducing a separate response system
- it avoids expanding into handoff or lead capture behavior

## 8. Explicit Non-Goals

This document does **not** do the following:

- no output code implementation
- no real matching logic
- no response rewriting logic
- no lead capture
- no handoff
- no menu / command / state systems
- no webhook contract changes
- no 200-response changes

## 9. Current Conclusion

The first real FAQ output should remain as small as possible and should return only the four shared fields.

The pipeline can then decide whether to continue pass-through or use FAQ handling later.