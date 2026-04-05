# 2026-04-03 - FAQ Capability Hook Minimal Design

- FAQ is confirmed as the first capability hook to mount later.
- Recommended position: inside the unified inbound pipeline after intent preparation and dispatch.
- FAQ should consume UnifiedInboundMessage, UnifiedSessionContext, intent preparation result, and dispatch result.
- FAQ is a shared hook; Telegram / Website differences should stay local to adapter, outbound mapping, and transport.
- Current phase remains design-only.
- No real FAQ resolver, KB wiring, lead capture, handoff, menu, command, state machine, or webhook contract change was introduced.
- The webhook 200 baseline remains untouched.