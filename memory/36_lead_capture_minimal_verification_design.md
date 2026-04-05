# 2026-04-04 - Lead Capture Minimal Evidence and Verification Design

- The first lead capture cut now has a minimal shared verification design.
- Verification covers three states only: none, partial, captured.
- Evidence points are defined across debug metadata, session lead_capture_state, and response/outbound hints.
- none verifies pass-through; partial verifies lightweight in-progress capture; captured verifies lightweight completed capture.
- Telegram and Website must use the same verification standard.
- No real implementation, state machine, workflow semantics, handoff, menu/command system, or webhook contract changes were introduced.