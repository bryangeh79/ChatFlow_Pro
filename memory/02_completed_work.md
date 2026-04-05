# Completed Work

## Phase 1 Completed
- Locked the product boundary for ChatFlow Pro as an SME AI reception and support automation product.
- Confirmed supported channels are limited to Website, Telegram, WhatsApp, Facebook Messenger, Line, and Zalo.
- Excluded Shopee, Lazada, TikTok Shop, other e-commerce integrations, payment flows, ERP, and complex sales closing pipelines.
- Produced the Phase 1 documentation set in docs.

## Phase 2 Completed
- Produced the Phase 2 architecture documentation set.
- Defined a recommended technology stack.
- Defined the final project structure recommendation.
- Drafted the core data model.
- Drafted the MVP API and service plan.
- Created the actual project skeleton under `/workspace`.

## Phase 3 Completed
- Built the minimal startup chain for the website chat flow.
- Added website entry handling.
- Added session / conversation initialization.
- Added language resolution with the four locked languages.
- Added message intake and normalization.
- Added reply dispatch with fallback behavior.
- Added FAQ / knowledge base MVP resolver support.
- Added four-language FAQ seed coverage.
- Closed Phase 3 with runtime and FAQ / KB flow documentation.

## Phase 4 Completed
- Added the minimal collaboration flow.
- Defined conversation owner handling.
- Added manual assignment structure.
- Added human handoff triggers and pending state handling.
- Added handoff summary generation.
- Connected collaboration logic to runtime reply flow.
- Added pending-human reply behavior.
- Closed Phase 4 with runtime integration and consistency checks.

## Phase 5 Completed
- Defined the backend/admin minimal page list.
- Defined admin operation boundaries.
- Defined admin reuse boundaries.
- Built admin page shells and component placeholders.
- Added minimal content binding for FAQ, leads, conversations, reports, and settings.
- Defined report metric mappings.
- Closed Phase 5 with final checklist and content alignment.

## Phase 6 Completed
- Phase 6 structural multi-channel closure is complete.
- Formalized the unified inbound baseline for Phase 6.1.
- Locked `UnifiedInboundMessage` and `UnifiedSessionContext` standards.
- Added thin adapter skeletons for Website, Telegram, WhatsApp, Facebook Messenger, Line, and Zalo.
- Added shared skeletons for normalization, session context, unified inbound pipeline, handoff trigger, and lead capture hook.
- Added a formal Phase 6.1 baseline document.
- Website has a thin end-to-end mock/template closed loop.
- The remaining five formal channels now follow the same thin end-to-end shape.
- Formalized the unified outbound baseline for Phase 6.3.
- Locked `UnifiedResponse` and unified outbound mapping/sender skeletons.
- Added outbound mapping placeholders and channel sender skeletons.
- Formalized unified send result, fallback policy, and minimal observability scaffolding.
- Added the Phase 6 final consistency review.

## Phase 7 Completed So Far
- Website first real minimal closed loop has been established.
- Website is acceptance-ready, reproducible, and a stable sample template.
- Real Website webhook entry is in place.
- Real Website inbound parsing into `UnifiedInboundMessage` is in place.
- Real Website outbound and send result flow is in place at minimal scope.
- The successful chain is: webhook → parse → UnifiedInboundMessage → pipeline → outbound mapping → sender → UnifiedSendResult → fallback.
- Website has become the first real Phase 7 milestone.
- Website has been stabilized with acceptance and repeatability guidance.
- Phase 7 Telegram planning baseline has been completed in docs (`45_phase7_telegram_planning_baseline.md`).
- Phase 7 Telegram readiness and acceptance criteria have been completed in docs (`46_phase7_telegram_readiness_and_acceptance.md`).
- Phase 7 Telegram channel readiness gate has been completed in docs (`47_phase7_channel_readiness_gate.md`).
- Phase 7 Telegram protection, blocker, minimal-change, isolation, regression priority, change gate, document-map, and final hold-position documents have been completed in docs (`48`–`55`).
- Website stable sample status is now formally locked as the first real reference channel.
- The final Phase 7 document chain has been completed and the project conclusion is to hold Telegram rather than start real development.

## Phase 10 Completed
- Phase 10.4: main repo minimal runtime entry was added.
- Phase 10.5: minimal compile closure was achieved.
- Phase 10.6: runtime path alignment was completed and the minimal host became runnable.
- Phase 10.7: minimal evidence validation was restored under the runnable host.
- Phase 10.8: host recovery plus minimal evidence closure was recorded.
- Phase 10.9: minimal real HTTP server entry was restored with a `/verification` route.

## Phase 11 Completed
- Phase 11.0: minimal real Telegram webhook entry was aligned with a real HTTP route.
- Phase 11.1: port handling and Telegram webhook live verification were completed.
- Phase 11.2: minimal real Website webhook entry was aligned with a real HTTP route.
- Phase 11.8: dual-entry minimal real webhook regression was confirmed for Telegram and Website.
- **Phase 11.40–11.48: Pro_v1.06 Milestone - Lead capture + FAQ chain**:
  - 11.40: first minimal real lead capture implementation (hook, detection, fields, status)
  - 11.41: cross-turn merging + evidence alignment + minimal outbound prompts
  - 11.42: captured minimal persistence (file-based JSONL, git-ignored)
  - 11.43: in-memory session store (cross-request continuity)
  - 11.44: user-visible outbound prompt merge (partial prompts into reply_text)
  - 11.45: lead outbound i18n (zh/en/vi/ms-MY) + empty reply fallback
  - 11.46: FAQ gate fix · intent placeholder alignment (FAQ matching restored)
  - 11.47: session cap (1000) + JSONL rotation (5MB/10k lines)
  - 11.48: milestone marking Pro_v1.06 + memory/docs alignment

## Phase 12 Completed
- **Phase 12.0**: WhatsApp minimal webhook implementation
- **Phase 12.1**: Messenger minimal webhook implementation
- **Phase 12.2**: Line minimal webhook implementation  
- **Phase 12.3**: Zalo minimal webhook implementation
- **Seven-channel suite complete**: Website, Telegram, WhatsApp, Messenger, Line, Zalo all unified

## Phase 13 Completed
- **Phase 13.0**: Comprehensive acceptance checklist for all 7 channels (docs/129)
- **Phase 13.1**: Version bump to Pro_v1.07 (package.json 1.7.0)
- **Phase 13.2**: JSONL backup cleanup with dual limits (max 5 files, 50MB total)
- **Phase 13.3**: Session TTL expiration (24 hours) with lazy cleanup
- **Phase 13.4**: Lead field minimal validation (email/phone format checks)
- **Phase 13.5**: FAQ multilingual seed expansion (20 entries, 5 topics, 4 languages)
- **Phase 13.6**: FAQ language priority matching (three-tier: user language > English > cross-language)

## Phase 14 Completed
- **Phase 14.0**: Intent dispatch minimal design and implementation
  - 4 intent types: `faq_candidate`, `lead_candidate`, `chitchat_fallback`, `unknown`
  - 4 dispatch stages: `prioritize_faq`, `prioritize_lead`, `run_both`, `pass_through`
  - Confidence scoring (0.0-1.0) with signal tracking
  - Integrated into unified pipeline
- **Phase 14.1**: Intent dispatch regression matrix documentation (20+ test cases)
- **Phase 14.2**: Partial session boundary fix (allows FAQ when no new lead signals)

## Phase 15 Completed
- **Phase 15.0**: Real transport design (ADR) — Telegram as first real transport (`docs/138`)
- **Phase 15.1**: Telegram real outbound — `telegram.ts`, `real-send.ts`, `outbound-sender` Telegram branch; `docs/139`; `.env.example`; **Pro_v1.07.1** (`package.json` 1.7.1)
- **Phase 15.2**: Telegram proxy — `TELEGRAM_PROXY_*` → `proxyConnectUri`; undici `ProxyAgent` in `real-send.ts`; `docs/140`; **Pro_v1.07.2** (`package.json` 1.7.2) — **已交付**
- **Phase 15.3**: Webhook GET verification — `webhook-verify.ts` + `server.ts` GET on `/webhooks/*`; `docs/141`; **Pro_v1.07.3** (`package.json` 1.7.3) — **已交付**
- **Phase 15.4a**: Meta POST signature — WhatsApp + Messenger validate `X‑Hub‑Signature‑256` when app secret configured; `docs/142`, `meta‑webhook.ts`; **Pro_v1.07.4** (`package.json` 1.7.4) — **已交付**（含安全修订）
- **Phase 15.4b**: Line POST signature — Line validates `X‑Line‑Signature` when channel secret configured; `docs/143`, `line‑webhook.ts`; **Pro_v1.07.5** (`package.json` 1.7.5) — **已交付**
- **Phase 15.4c**: Zalo POST signature research — Documented findings: no official signature mechanism; relies on IP whitelisting; `docs/144`; **Pro_v1.07.6** (`package.json` 1.7.6) — **已交付**
- **Phase 15.4d**: Website POST signature — Website validates `X‑Webhook‑Signature` when signing secret configured; `docs/145`, `website‑webhook.ts`; **Pro_v1.07.7** (`package.json` 1.7.7) — **已交付**
- **Phase 15.5**: WhatsApp Cloud API real outbound — WhatsApp uses Graph API when token + phone number ID + not sandbox; `docs/146`, `whatsapp‑cloud.ts`, `real‑send.ts`; **Pro_v1.07.8** (`package.json` 1.7.8) — **已交付**
- **Phase 15.6**: Messenger Graph API real outbound — Messenger uses Graph API when token + page ID + not sandbox; `docs/147`, `messenger‑graph.ts`, `real‑send.ts`; **Pro_v1.07.9** (`package.json` 1.7.9) — **已交付**
- **Phase 15.7**: Line Messaging API real outbound — Line uses push API when token + not sandbox; `docs/148`, `line‑messaging.ts`, `real‑send.ts`; **Pro_v1.07.10** (`package.json` 1.7.10) — **已交付**
- **Phase 15.8**: Zalo Open API real outbound — Zalo uses Open API when token + OA ID + not sandbox; `docs/149`, `zalo‑openapi.ts`, `real‑send.ts`; **Pro_v1.07.11** (`package.json` 1.7.11) — **已交付**

## Phase 16 (completed)
- **Phase 16 (observability slice)**: `X-Request-Id` on every response; optional JSON HTTP access line on `response.finish` when `CHATFLOW_HTTP_ACCESS_LOG` enabled; `docs/150`, `src/observability/http-access.ts`, `server.ts`; **Pro_v1.07.13** (`package.json` 1.7.13) — **已交付**
- **Phase 16.2 (webhook phases_ms + verification type narrowing)**: Enhanced observability with `phases_ms` (prepare vs outbound send) in access logs; verification type narrowed; `src/webhooks/webhook-timing.ts`, all six webhook handlers updated; **Pro_v1.07.15** (`package.json` 1.7.15) — **已交付**

## What Is Now in Place
- Product scope and exclusions
- Phase 1 blueprint docs
- Phase 2 architecture docs
- Project skeleton
- Language resource skeleton
- Minimal runtime chain
- FAQ / KB MVP content resolution
- Minimal collaboration and handoff flow
- Minimal backend/admin management layer
- Phase 6 unified inbound baseline and thin adapter skeletons
- Phase 6 six-channel aligned mock closure
- Phase 6 unified outbound baseline and sender/mapping skeletons
- Phase 6 send result, fallback, and observability scaffolding
- Phase 6 final consistency review
- Phase 7 first real Website milestone
- Phase 7 Website stable sample template
- Phase 7 Telegram planning baseline documentation
- Phase 7 Telegram readiness / acceptance documentation
- Phase 7 Telegram channel readiness gate documentation
- Phase 7 Telegram protection, blocker, minimal-change, isolation, regression priority, change gate, document map, and final hold-position documentation
- Phase 10 minimal runtime host recovery and evidence chain
- Phase 11 real Telegram and Website webhook entrypoints
- Phase 11 dual-entry minimal real regression closure
- **Lead capture complete flow**: detection → cross-turn merging → file persistence → i18n prompts
- **FAQ integration**: multilingual matching (4 languages), language priority, 20 entries
- **In-memory session store**: cross-request continuity with 24h TTL
- **Intent dispatch system**: smart routing between FAQ and lead capture
- **Unified pipeline**: lead+FAQ+intent dispatch with proper prioritization
- **Seven-channel suite**: All 7 channels (Website, Telegram, WhatsApp, Messenger, Line, Zalo) unified
- **Real transport**: ADR (138) + Telegram real sender (15.1) — **已交付** + proxy support (15.2) — **已交付**; other channels synthetic
- **Webhook security**: GET verification (15.3) — **已交付** + Meta POST signature (15.4a) — **已交付** (WhatsApp/Messenger) + Line POST signature (15.4b) — **已交付** + Zalo signature research (15.4c) — **已交付** + Website POST signature (15.4d) — **已交付**
- **Real transports**: Telegram (15.1) — **已交付** + WhatsApp Cloud (15.5) — **已交付** + Messenger Graph (15.6) — **已交付** + Line Messaging (15.7) — **已交付** + Zalo Open API (15.8) — **已交付**
- **HTTP observability (16.2)**: Request ID header + optional access JSON + webhook `phases_ms` timings + verification type narrowing (`docs/150`) — **已交付（增强切片）**
- **Handoff minimal integration (Pro_v1.07.40)**: Keyword trigger (`人工|转人工|agent|human` etc.), session `handoff_state` updates, unified pipeline integration — **已交付**
