# 2026-04-03 - FAQ Resolver Skeleton

- Added a passive FAQ resolver skeleton behind the FAQ capability hook.
- Resolver input: UnifiedInboundMessage, UnifiedSessionContext, intent preparation result, dispatch result.
- Resolver output: fixed no-match / empty shape.
- No real FAQ content, KB wiring, scoring, lead capture, handoff, menu, command, or state logic was introduced.
- Telegram and Website webhook stability remains protected.