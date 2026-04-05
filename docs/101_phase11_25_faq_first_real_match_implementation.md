# Phase 11.25 FAQ First Real Match Implementation

## 1. Status

The first minimal real FAQ match implementation has been added behind the shared FAQ content source / resolver boundary.

## 2. Implemented Scope

Implemented only:

- exact match
- normalized exact match
- tiny keyword overlap assist
- shared seed registry lookup
- minimal FAQ result consumption inside the unified inbound pipeline

## 3. Result Contract

The resolver returns the established minimal output:

- matched
- answer
- matched_topic
- confidence

## 4. Pipeline Consumption

The unified inbound pipeline now consumes the FAQ result and can use the FAQ answer as the response candidate when matched.

No-match remains pass-through.

## 5. Shared Path

Telegram and Website continue to share the same resolver path and the same pipeline consumption path.

## 6. Protected Baseline

The webhook baseline remains protected:

- `POST /webhooks/telegram`
- `POST /webhooks/website`
- 200 responses
- visible regression fields
- independent channel behavior

## 7. Explicit Non-Goals

This phase does not implement:

- complex retrieval
- semantic ranking
- multi-turn FAQ
- lead capture
- handoff
- menu / command / state systems
- webhook contract changes