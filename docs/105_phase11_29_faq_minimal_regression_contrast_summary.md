# Phase 11.29 FAQ Minimal Regression Contrast Summary

## 1. Purpose

This note ties together the matched case, the no-match case, and the dual-entry stability check into one small regression summary.

## 2. Matched Sample

- Candidate: `How do I start?`
- Expected / observed result:
  - `matched: true`
  - `answer: Send a message to begin.`
  - `matched_topic: greeting`
  - `confidence: 0.9`
- Evidence points:
  - `debug_steps` includes `faq_hit`
  - `debug_metadata.faqResult.matched = true`
  - `debug_metadata.faqResult.answer = Send a message to begin.`
  - `debug_metadata.faqResult.matched_topic = greeting`
  - `debug_metadata.faqResult.confidence = 0.9`
  - `session.recent_faq_hit.matched = true`

## 3. No-Match Sample

- Candidate: `This question does not exist in the shared seed set`
- Expected / observed result:
  - `matched: false`
  - `answer: null`
  - `matched_topic: null`
  - `confidence: 0`
  - pass-through behavior continues
- Evidence points:
  - `debug_steps` includes `faq_no_match`
  - `debug_metadata.faqResult.matched = false`
  - `debug_metadata.faqResult.answer = null`
  - `debug_metadata.faqResult.matched_topic = null`
  - `debug_metadata.faqResult.confidence = 0`
  - `session.recent_faq_hit.matched = false`

## 4. Dual-Entry Stability

Telegram and Website continue to share the same FAQ resolver, the same pipeline consumption path, and the same outbound mapping path.

No channel-specific FAQ branch was introduced.

The webhook baseline remains protected:

- `POST /webhooks/telegram`
- `POST /webhooks/website`
- 200 responses
- visible regression fields
- independent channel behavior

## 5. Current Conclusion

The FAQ first real match path now has a compact regression contrast summary that shows matched behavior, no-match behavior, and dual-entry stability in one place.