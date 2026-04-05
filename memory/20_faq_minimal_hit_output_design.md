# 2026-04-03 - FAQ Minimal Hit Output Design

- The minimal real FAQ output contract is design-only and uses four fields: matched, answer, matched_topic, confidence.
- matched=true returns a real answer string, the matched topic, and a simple confidence value.
- no-match returns false, null answer, null topic, confidence 0.
- The pipeline should consume this result and keep Telegram / Website on the same shared output structure.
- No output code, response rewriting, lead capture, handoff, menu, command, state, or webhook contract changes were introduced.