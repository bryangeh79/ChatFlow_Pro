# 2026-04-04 - Lead Capture Pipeline Consumption and Session Boundary Design

- Lead capture result should return into the shared unified inbound pipeline only after FAQ has not already resolved the interaction.
- Minimal status handling is defined as:
  - none -> pass-through
  - partial -> lightweight shared prompt path
  - captured -> lightweight shared confirmation path
- Allowed session writes are limited to lead_capture_state fields only.
- Not allowed yet: owner/assignee semantics, workflow state, expanded CRM profile state, state-machine-like control flags, or new handoff semantics.
- Telegram and Website must share the same lead capture result model, session update limits, and shared response path.
- No real implementation or webhook contract changes were introduced.