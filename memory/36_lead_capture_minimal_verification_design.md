# 2026-04-04 - Lead Capture Minimal Evidence and Verification Design

- The first lead capture cut now has a minimal shared verification design.
- Verification covers three states only: none, partial, captured.
- Evidence points are defined across debug metadata, session lead_capture_state, and response/outbound hints.
- none verifies pass-through; partial verifies lightweight in-progress capture; captured verifies lightweight completed capture.
- Telegram and Website must use the same verification standard.
- **Pro_v1.07.32**: **WhatsApp** flat inbound uses the **same** triplet in **`verify:lead-capture-states`** (skippable via **`SMOKE_SKIP_WHATSAPP_LEAD`** / **`SMOKE_SKIP_CHANNELS`**).
- **Pro_v1.07.33**: **Messenger、Line、Zalo** flat inbounds use the **same** triplet (skippable via **`SMOKE_SKIP_MESSENGER_LEAD`**, **`SMOKE_SKIP_LINE_LEAD`**, **`SMOKE_SKIP_ZALO_LEAD`**, or matching **`SMOKE_SKIP_CHANNELS`** entries when POST verify blocks smoke).
- **Pro_v1.07.34**: Script implements shared **`verifyLeadTriplet`**; human-facing skip table → **`docs/160`** §4.6.
- Original design note: no separate state machine, workflow semantics, handoff, menu/command system, or webhook **contract** changes beyond exercising existing routes.