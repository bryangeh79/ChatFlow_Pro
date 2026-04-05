# 2026-04-05 - Seven-Channel Unified Inbound Contract Baseline (Pro_v1.07.6)

- Phase 15.0–15.4c complete: ADR + Telegram real outbound + proxy + GET verification + Meta POST signature + Line POST signature + Zalo signature research.
- Version: **Pro_v1.07.6** (package.json 1.7.6).
- **Seven-channel minimal real webhook baseline preserved**: Website, Telegram, WhatsApp, Messenger, Line, Zalo.
- Unified inbound contract now includes complete lead capture + FAQ + intent dispatch integration.
- Shared boundary areas: adapter normalization, session context, unified inbound pipeline (lead+FAQ+intent), outbound mapping, sender, trace context.
- Lead capture capabilities (Pro_v1.07): detection → cross-turn merging → file persistence → i18n prompts → field validation.
- FAQ capabilities: multilingual matching (4 languages), language priority, 20 entries across 5 topics.
- Intent dispatch: 4 intent types, 4 dispatch stages, smart routing between FAQ/lead.
- Infrastructure: in-memory session store (1000 cap, 24h TTL), JSONL rotation with cleanup (max 5 files, 50MB total).
- Session continuity: cross-request state enabled with automatic expiration.
- Webhook security: GET verification (all 7 channels) + POST signature (WhatsApp/Messenger/Line when secret configured) + Zalo IP whitelisting (per official docs).
- 禁触区依然: menu/command/state systems, handoff integration, channel-specific logic, low-yield webhook tweaks.
- **Pause Status**: **Active** — Phase 15.4c complete (已交付); next: **Phase 15.4d+**.
- Future work: Website POST signature (需先写设计), second real channel.