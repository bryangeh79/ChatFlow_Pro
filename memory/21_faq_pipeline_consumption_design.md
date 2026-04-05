# 2026-04-03 - FAQ Pipeline Consumption Design

- The unified inbound pipeline now has a design-only consumption note for FAQ resolver results.
- matched=true is consumed as the active FAQ path result and can supply the FAQ response candidate inside the shared pipeline.
- no-match remains passive and continues pass-through behavior.
- The outbound mapping boundary remains unchanged and channel-specific only at transport/mapping boundaries.
- No webhook contract changes, richer interaction, lead capture, handoff, menu, command, state, scoring, retrieval, or channel-specific FAQ branching were introduced.