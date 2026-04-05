# 2026-04-03 - FAQ Minimal Real Match Path Design

- The first real FAQ match path has been defined at design level only.
- Shared flow: unified pipeline -> intent preparation -> dispatch FAQ path -> FAQ resolver -> shared content source / registry -> match or no-match.
- `matched=true` is only allowed when dispatch selects the FAQ path and a real future matcher is intentionally enabled on the shared FAQ boundary.
- Minimum result fields: matched, answer, matched_topic, confidence.
- No real matching, scoring, retrieval, lead capture, handoff, menu, command, state, or webhook contract changes were introduced.
- Telegram and Website remain on the same shared path.