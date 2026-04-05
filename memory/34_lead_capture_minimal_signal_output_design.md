# 2026-04-03 - Lead Capture Minimal Signal and Output Design

- Lead capture first-cut trigger signals are limited to explicit contact intent or explicit contact info.
- Weak hints are not enough and must pass through.
- First-cut output contract is intentionally small: status, captured_fields, missing_fields.
- Smallest status model: none, partial, captured.
- FAQ and lead capture remain separate shared paths.
- Telegram and Website must use the same trigger logic and output contract.
- No real implementation, state machine, clarification loop engine, workflow semantics, handoff, menu/command system, or webhook contract changes were introduced.