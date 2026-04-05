# 2026-04-03 - FAQ Minimal Match Rule Design

- First FAQ match strategy is design-only: exact match, normalized exact match, plus optional tiny keyword overlap assist.
- This keeps the FAQ layer minimal and avoids turning it into retrieval/scoring.
- `matched=true` requires dispatch already selecting the FAQ path and a strong shared-boundary FAQ fit.
- Confidence remains extremely simple: fixed high for exact/normalized exact, lower fixed value for keyword assist, no dynamic scoring ladder.
- Telegram and Website share the same rule set.
- No real matching code, retrieval engine, scoring framework, lead capture, handoff, menu, command, state, or webhook contract changes were introduced.