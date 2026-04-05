# 2026-04-03 - FAQ Seed Registry Structure

- Added a minimal shared FAQ seed registry structure.
- Seed fields: id, topic, question, answer, optional language, optional keywords.
- Registry shape: version seed-v1 plus entries array.
- Registry is currently empty and structural only.
- Resolver remains no-match / pass-through and does not use real matching.
- Telegram and Website continue to share one registry shape with no channel fork.
- Webhook stability remains protected.