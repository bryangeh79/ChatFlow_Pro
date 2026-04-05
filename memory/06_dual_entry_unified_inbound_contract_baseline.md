# 2026-04-05 - Seven-Channel Unified Inbound Contract Baseline (sync **Pro_v1.07.39**)

- Phase 15.0–15.8 complete: ADR + Telegram real outbound + proxy + GET verification + Meta POST signature + Line POST signature + Zalo signature research + Website POST signature + WhatsApp Cloud API real outbound + Messenger Graph API real outbound + Line Messaging API real outbound + Zalo Open API real outbound.
- Phase 16.2 (observability enhanced): HTTP access logging with `X-Request-Id` + optional JSON log line + webhook `phases_ms` timings (prepare vs outbound send) + verification type narrowing.
- Phase **17.1 / 17.2**: in-process Zalo refresh + Meta **`fb_exchange_token`** MVP (see **docs/154** / **docs/156**); Version: **Pro_v1.07.40** (package.json **1.7.40**).
- **Seven-channel minimal real webhook baseline preserved**: Website, Telegram, WhatsApp, Messenger, Line, Zalo.
- Unified inbound contract now includes complete lead capture + FAQ + intent dispatch integration.
- Shared boundary areas: adapter normalization, session context, unified inbound pipeline (lead+FAQ+intent), outbound mapping, sender, trace context.
- Lead capture capabilities (Pro_v1.07): detection → cross-turn merging → file persistence → i18n prompts → field validation.
- FAQ capabilities: multilingual matching (4 languages), language priority, 20 entries across 5 topics.
- Intent dispatch: 4 intent types, 4 dispatch stages, smart routing between FAQ/lead.
- Infrastructure: in-memory session store (1000 cap, 24h TTL), JSONL rotation with cleanup (max 5 files, 50MB total).
- Session continuity: cross-request state enabled with automatic expiration.
- Webhook security: GET verification (all 7 channels) + POST signature (WhatsApp/Messenger/Line/Website when secret configured) + Zalo IP whitelisting (per official docs).
- Real transports: Telegram (Bot API) + WhatsApp Cloud (Graph API) + Messenger Graph (Graph API) + Line (push API) + Zalo (Open API) when configured.
- 禁触区依然: menu/command/state systems, handoff integration, channel-specific logic, low-yield webhook tweaks.
- **Pause Status**: **Not blocked** — align **`memory/01`**; next product/staging steps → **`memory/03`** tail (*HTTPS* → **docs/157** Phase 0, else **memory/31–37**).