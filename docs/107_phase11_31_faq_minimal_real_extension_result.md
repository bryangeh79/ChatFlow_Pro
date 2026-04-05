# Phase 11.31 FAQ Minimal Real Extension Result

## 1. Status

The shared FAQ seed registry has been expanded by a very small amount while keeping the first FAQ matcher unchanged.

## 2. Added Seed Entries

New neutral, real-testable seed entries were added for:

- `contact`
- `hours`

The registry remains small and shared.

## 3. Expected Match Stability

The existing minimal matcher should continue to support:

- exact match
- normalized exact match
- tiny keyword overlap assist

The new entries are intentionally aligned to that minimal matcher.

## 4. No-Match Stability

No-match remains pass-through:

- `matched: false`
- `answer: null`
- `matched_topic: null`
- `confidence: 0`

## 5. Shared Path

Telegram and Website still share the same resolver, pipeline, outbound, and evidence paths.

## 6. Protected Baseline

The webhook baseline remains protected:

- `POST /webhooks/telegram`
- `POST /webhooks/website`
- 200 responses
- visible regression fields
- independent channel behavior