# 2026-04-03 - Lead Capture Minimal Candidate Design

- Lead capture is defined as the next shared capability hook after FAQ.
- It should stay inside the unified inbound pipeline, not the webhook handlers.
- First-cut minimal fields: name, phone, email.
- FAQ and lead capture remain separate paths; lead capture should only activate when FAQ does not already resolve the interaction and simple contact intent/data is present.
- It must pass through if no contact signal exists or if state-machine / handoff / workflow semantics would be required.
- Telegram and Website should share the same lead capture path.
- No real implementation, state machine, handoff integration, menu/command system, or webhook contract changes were introduced.