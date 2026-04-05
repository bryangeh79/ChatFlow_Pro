# 2026-04-04 - Lead Capture Go / No-Go Decision

- Decision: A. Enter the first minimal real lead capture implementation now.
- Reason: the design stack is complete enough for a first bounded cut.
- The first cut must start at the shared lead capture hook / resolver boundary inside the unified inbound pipeline.
- Allowed scope: explicit contact intent/info detection, fields name/phone/email, states none/partial/captured, minimal pipeline consumption, minimal lead_capture_state updates, minimal evidence points.
- Not allowed: state machine, workflow semantics, handoff, menu/command system, clarification loop engine, webhook contract changes, or channel-specific branches.