# 2026-04-03 - FAQ First Real Match Implementation

- The first minimal real FAQ match implementation is now present behind the shared FAQ content source / resolver boundary.
- Implemented scope: exact match, normalized exact match, tiny keyword overlap assist, shared seed registry lookup, and pipeline consumption.
- The unified inbound pipeline now consumes the FAQ result and uses the FAQ answer as the response candidate when matched.
- No-match remains pass-through.
- Telegram and Website continue to share the same resolver path and pipeline consumption path.
- Webhook stability remains protected.