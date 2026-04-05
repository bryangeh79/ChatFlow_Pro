# 2026-04-03 - FAQ Content Source Design

- Real FAQ content should live in a shared content source layer, not in webhook handlers.
- Minimum viable form: static seed, minimal registry, or lightweight source module.
- The FAQ resolver skeleton may later read from this source, but today it remains passive.
- Telegram and Website must share the same FAQ content source; no channel fork is allowed.
- No real FAQ matching, scoring, retrieval, lead capture, handoff, menu, command, or state logic was introduced.
- Webhook 200 stability remains protected.