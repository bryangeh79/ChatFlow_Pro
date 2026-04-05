# 2026-04-03 - Unified Inbound Intent Dispatch Placeholder

- Added a minimal placeholder layer beside the unified inbound pipeline.
- Intent preparation currently returns unknown / zero-confidence / empty-signals.
- Dispatch currently returns pass-through / none.
- Runtime behavior remains no-op and preserves the existing dual-entry webhook baseline.
- No real FAQ, lead capture, handoff, command, menu, or state-machine logic was introduced.
- Telegram and Website baselines remain protected.