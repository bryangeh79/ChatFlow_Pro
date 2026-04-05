# 2026-04-03 - FAQ Minimal Regression Contrast Summary

- Added a compact regression contrast summary for the FAQ first real match path.
- Matched sample: `How do I start?` -> matched true, answer `Send a message to begin.`, topic `greeting`, confidence `0.9`.
- No-match sample: `This question does not exist in the shared seed set` -> matched false, null answer, null topic, confidence `0`, pass-through.
- Telegram and Website continue to share the same resolver, pipeline consumption path, and outbound mapping path.
- Webhook stability remains protected.