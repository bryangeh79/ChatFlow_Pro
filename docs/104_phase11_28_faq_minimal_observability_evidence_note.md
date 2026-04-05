# Phase 11.28 FAQ Minimal Observability Evidence Note

## 1. Purpose

This note records the minimal evidence points used to verify FAQ matched and no-match behavior.

## 2. Matched Evidence Points

When `matched=true`, the shared pipeline exposes evidence through:

- `debug_steps` including `faq_hit`
- `debug_metadata.faqResult.matched = true`
- `debug_metadata.faqResult.answer`
- `debug_metadata.faqResult.matched_topic`
- `debug_metadata.faqResult.confidence`
- `session.recent_faq_hit.matched = true`

## 3. No-Match Evidence Points

When `matched=false`, the shared pipeline exposes evidence through:

- `debug_steps` including `faq_no_match`
- `debug_metadata.faqResult.matched = false`
- `debug_metadata.faqResult.answer = null`
- `debug_metadata.faqResult.matched_topic = null`
- `debug_metadata.faqResult.confidence = 0`
- `session.recent_faq_hit.matched = false`

## 4. Shared Path

Telegram and Website use the same evidence points because they share the same resolver and pipeline path.

## 5. Protected Baseline

The webhook baseline remains protected:

- `POST /webhooks/telegram`
- `POST /webhooks/website`
- 200 responses
- visible regression fields
- independent channel behavior