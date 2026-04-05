# Phase 11.33 FAQ Small Sample Set Completion

## 1. Status

The shared FAQ seed registry now contains a small completed sample set.

## 2. Current Sample Topics

The small shared set includes:

- greeting
- availability
- support
- contact
- hours

## 3. Match Stability

The existing minimal matcher continues to cover the small shared set using:

- exact match
- normalized exact match
- tiny keyword overlap assist

## 4. No-Match Stability

No-match remains pass-through and unchanged.

## 5. Shared Path

Telegram and Website continue to share the same resolver, pipeline, outbound, and evidence paths.

## 6. Protected Baseline

The webhook baseline remains protected:

- `POST /webhooks/telegram`
- `POST /webhooks/website`
- 200 responses
- visible regression fields
- independent channel behavior