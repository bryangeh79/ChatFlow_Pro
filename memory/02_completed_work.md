# Completed Work

## Phase 24 — controlled runtime_wired integration verify ✅

**名称**：`Phase 24 / controlled runtime_wired integration verify` — **非** Postgres ready、**非** `go` 已达成。  
**交付摘要**：新增专用受控实测脚本 `verify:postgres-runtime-wired-controlled-integration`，覆盖 `controlled_runtime_wired_ok` 与 `controlled_runtime_wired_hard_fail` 分支，并保留前置不足 `skip`。  
**链路边界**：该脚本为可选验证路径，**不属于默认** `verify:saas-db-postgres-go-no-go` / CI 默认链；默认链稳定性未受影响。  
**默认路径**：默认 live SaaS DB 仍为 sqljs。  

---

## Phase 24 — runtime_wired hard gate calibration ✅

**名称**：`Phase 24 / controlled runtime_wired hard gate calibration` — **非** Postgres ready、**非** `go` 已达成。  
**交付摘要**：受控验证中将 `postgres_client_runtime_wired` 升级为硬门禁：仅在前置明确满足（开关+URL+配置合法+受控探测成功）后必须为 `true`，否则 hard fail。  
**默认语义**：默认链仍 `NO_GO`；受控前置不足仍 `skip`；默认 live 路径仍为 sqljs。  
**边界口径**：整体 `go/no-go` 仍按完整门禁判定，不因本刀自动变 GO。  

---

## Phase 24 — tenant_settings read path adapterization ✅

**名称**：`Phase 24 / tenant_settings read path adapterization` — **非** Postgres ready、**非** `go` 已达成。  
**交付摘要**：仅 `getTenantSettingsJson(tenantId)` 切到 `SaaSDbAdapter.queryOne` 读取（`SELECT settings_json FROM tenant_settings WHERE tenant_id = ?`），实现 `tenant_settings` 单一只读入口 adapter 化。  
**兼容语义**：`settings_json` 缺失 / 坏 JSON / 非对象，仍兜底 `{}`；默认 live 路径仍为 sqljs。  
**边界口径**：整体 `go/no-go` 仍按完整门禁判定，不因单一路径读能力前移而自动变为 GO。  

---

## Phase 24 — controlled reachability stabilization ✅

**名称**：`Phase 24 / controlled runtime+ledger reachability stabilization` — **非** Postgres ready、**非** `go` 已达成。  
**交付摘要**：在现有 readiness/metadata 上补轻量证据字段（`controlled_reachability` / `reachability_basis`），并固化 verify 输出：`default_no_go_ok`、`controlled_reachability_ok`、`overall_go_not_implied`。受控链需显式开关启用；无 PG/前置不足统一 `skip`。  
**默认路径**：默认 live SaaS DB 仍为 sqljs。  
**语义边界**：默认 NO_GO、受控可达、整体 GO 不被局部门槛替代。  
**提交**：`chore(saas-db): stabilize controlled postgres reachability signals`（**`db0e024`**，以 `git log origin/main` 为准）。

---

## Phase 24 — migration execution wired ✅

**名称**：`Phase 24 / migration execution wired` — **非** Postgres ready、**非** `go` 已达成。  
**交付摘要**：`runSaasPostgresMigrations(..., mode='apply')` 已接真实执行路径：单 migration 一事务（`BEGIN -> SQL -> ledger -> COMMIT`），失败 `ROLLBACK` 且 fail-fast；`dry_run` 仍仅预览。apply 具备真实执行 SQL + 写 ledger 能力。  
**默认路径**：默认 live SaaS DB 仍为 sqljs（未切换 Postgres）。  
**语义边界**：`execution_wired` 为能力门槛判定（runtime + ledger + assets），**不自动等于 GO**；整体 `go/no-go` 仍按当前门禁为准。  
**提交**：`feat(saas-db): wire postgres migration apply execution path`（**`c142da3`**，以 `git log origin/main` 为准）。

---

## Phase 24 — Postgres saas_schema_migrations ledger persistence ✅

**名称**：`Phase 24 / Postgres ledger persistence` — **非** Postgres ready、**非** `go` 已达成。  
**交付摘要**：`SaasMigrationLedgerProvider` async 化；新增 **`PostgresSaasMigrationLedger`**（参数化 `list/record`，checksum 冲突抛错）；新增 DDL 资产 **`pg_0003_saas_schema_migrations.sql`** 并入 registry；`ledger_persistence_wired` 在 postgres+gate+runtime_wired 且 ledger 表可读时可前进一步。**默认 live SaaS DB 仍为 sqljs**，**空表/可读 ≠ migration 已应用**。  
**明确不是**：migration apply 真执行、repository 扩面、整体 `evaluatePostgresGoNoGo()` 转 go — **仍为 `NO_GO`**。  
**提交**：`feat(saas-db): Postgres saas_schema_migrations ledger persistence`（**`22ffc2d`**，以 `git log origin/main` 为准）。

---

## Phase 24 — Postgres runtime 底座切片 ✅ shared Pool + adapter 最小接线

**名称**：`Phase 24 / Postgres runtime 底座` — **非** Postgres ready、**非** `go` 已达成。  
**交付摘要**：**单一共享 `pg` Pool**（`CHATFLOW_SAAS_DB_DRIVER=postgres` + **`CHATFLOW_SAAS_POSTGRES_CLIENT=1`** + 合法连接配置 + **受控只读参数化 `SELECT 1` 成功** 才创建/复用）；**`PostgresSaaSDbAdapter`** **queryOne / queryAll / execute** 最小真实路径（`?`→`$n`）；**`postgres_client_runtime_wired`** 仅上述条件满足时为真；**`verify:postgres-pool-runtime-wire`** + readiness 链。**默认 live SaaS DB 仍为 sqljs**，**未**切换 Postgres。  
**明确不是**：migration apply、**`saas_schema_migrations` ledger 落库**、repository 全量 PG、整体 **`evaluatePostgresGoNoGo()` 转 go** — **仍为 `NO_GO`**。  
**提交**：`feat(saas-db): shared pg pool + PostgresSaaSDbAdapter minimal query/execute`（**`0b540f4`**，以 `git log origin/main` 为准）。

---

## Phase 24 — 包 3C ✅ JSONL / notify 契约收口

**名称**：`Phase 24 / 包 3C` — **输出契约**；**非** multi-instance ready、**非** Redis、**非** 队列。  
**交付摘要**：**`event_type` + `idempotency_key`**（`src/shared/outbound-idempotency.ts`）；Lead JSONL 与 lead notify **同源**；Handoff notify + assignment JSONL **字段口径对齐 docs/179 §9**；**`verify:phase24-3c-jsonl-notify-contract`**（先 `npm run build`）。  
**明确不是**：消除重复 POST、外置 sink、MI-safe — **仍** at-least-once。  
**提交**：`feat(phase-24): 3C JSONL/notify idempotency_key + event_type contract`（`30bdc57`，以 `git log` 为准）。  
**下一**：**Postgres 执行线**（`docs/177`，**仍 `NO_GO`**）。

---

## Phase 24 — 包 3B ✅ session store abstraction skeleton

**名称**：`Phase 24 / 包 3B` — **非** multi-instance、**非** Redis。  
**交付摘要**：**`SessionStore` + `getSessionStore()`**；**`InMemorySessionStore`** 实现不变（TTL / 上限 / cleanup）；**默认 live 仍 in-memory**；**`verify:session-store-abstraction`**。  
**明确不是**：多副本安全、外置 session、JSONL 改造 — **仍为单进程语义**。  
**提交**：`feat(phase-24): add session store abstraction skeleton`（`9f76785`，以 `git log` 为准）。

---

## Phase 24 — Postgres Foundation checkpoint（2A–2M）✅ 叙事已封

**名称**：`Phase 24 / Postgres Foundation checkpoint`  
**交付摘要**：**2A–2M** — Postgres+migration **ADR**（`docs/177`）；**SaaSDbAdapter** 选择 + **SqlJs** 实现 + **Postgres stub**；**db-migrations** registry、**postgres/*.sql**、checksum、**execution contract**、**fake ledger**；**client gate + 动态 `pg` loader**；**connection config**；**optional TCP probe**；**go/no-go**（`postgres-readiness-boundary.ts` + CLI + verify）。  
**明确未完成（相对「可投产 Postgres」）**：**migration apply**、**repository 全量 postgres**、**整体门禁转 go** — **`evaluatePostgresGoNoGo()` 仍为 `no_go`**。**底座切片** + **ledger persistence** 已交付 ✅（见上节）。  
**与 `docs/179` 衔接**：**3A ✅** ADR；**3B ✅**；**3C ✅**；**live 仍非 MI-ready**；**下一**：**Postgres 执行线余下切口**（**`go/no-go` 仍为 `no_go`**）。  
**封板提交**：`chore(phase-24): seal postgres foundation checkpoint`（以 `git log` 为准）。

---

## Phase 24 — Auth-RBAC Foundation checkpoint（1A–1J）✅ 已封

**名称**：`Phase 24 / Auth-RBAC Foundation checkpoint`  
**交付摘要**：Admin 抽象（`admin-auth`）+ 授权策略（`admin-authorization`）+ tenant slug RBAC；**break-glass**（`break_glass_env`）保留；**env** tenant admin/readonly bridge + **DB** `tenant_admin_principals`（**hash-at-rest**）+ **principal 审计**（`tenant_admin_principal_audit_logs`，含 `rotated`）+ **auth cutline**（`admin-auth-sources` + `GET /saas/v1/admin/auth/summary`）。**后续不再在同一子线堆新型 bridge**；真实 tenant auth 单独立项。  
**ADR**：`docs/176_phase24_saas_admin_auth_rbac_adr.md`（含 1J Auth stack / deprecations）。  
**验证**：`verify:saas-admin-*` 全套（含 `auth-cutline`）。  
**封板提交**：`chore(phase-24): seal auth rbac foundation checkpoint`（以 `git log` 为准）。

---

## 2026-04-07 战报回写（本轮会话固化）

**本轮完成项（叙事 + 仓库）**  
1. **Phase 23 关闭**：SaaS MVP Final Closure sealed — idle GET **A**、`tenant_settings` 矩阵、send/suppress 收官审计、docs/蓝图/memory 对齐。  
2. **Phase 24 开启**：SaaS v1 Hardening 写入 `memory/03`、`memory/01`、`docs/175` MVP status、`GPT_PLANNER_HANDOFF_BLUEPRINT.md`。  
3. **Memory 物理同步**：`01`/`03`/`04` 收官与 handoff；`05` 本回写为下一聊天室可接手版。

**本轮 git（`main`，已 push）**  
- `c2a08cc` — `docs(phase-23): freeze idle GET behavior for SaaS MVP`  
- `8cae7d4` — `chore(phase-23): close SaaS MVP final audit; sync memory`  
- `bb5d17e` — `chore(phase-24): open SaaS v1 hardening; seal MVP (Phase 23 closed)`

**版本**：封板仍为 **1.7.67**（未为纯文档/叙事单独升 patch）。

---

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
- **Phase 21 / 21.2**: runtime config reload (Option B) + autotune optional runtime-write — **已交付**
- **Commercial delivery automation**: `docs/168~172` + `release:*` + `delivery:*` + `backup:data` + `health:curl` — **已交付**

## Phase 22B Completed
- Version aligned: **Pro_v1.07.62** (`package.json` 1.7.62).
- `tenant_settings` runtime control closed with real behavior change and verification:
  - `handoff.enabled` integrated and effective
  - `notify.enabled` integrated and effective
  - `lead_capture.enabled` integrated and effective
- All above validated with runnable scripts and git checkpoints on `main`.
- Residual risk logged: historical session states are not actively purged.

## Phase 22C Completed
- Version aligned: **Pro_v1.07.65** (`package.json` **1.7.65**).
- `tenant_settings` **行为全面接管**三刀均已接入 runtime、改变真实行为、验证脚本与 git checkpoint（`main`）：
  1. **`bot.enabled`** — 租户发送总闸；`should_send` + outbound-sender 早退；`debug_metadata.saas_control` 含 `bot_enabled` / `bot_reply_suppressed`；脚本 `verify:saas-bot-disabled`。
  2. **`suppress_reply.enabled`** — 与 env `CHATFLOW_SUPPRESS_REPLY_ON_HANDOFF` 组合门控；`saas_control` 含 `suppress_reply_*`；脚本 `verify:saas-suppress-reply-disabled`。
  3. **`faq.fallback_enabled`** — FAQ resolver 策略 2/3 可关；`planDefaultTurn` 关闭未命中时的用户原文回显；`saas_control` 含 `faq_fallback_*`；脚本 `verify:saas-faq-fallback-disabled`。
- Legacy `/webhooks/*`（无租户 settings）行为保持与改造前一致的设计目标已在本阶段各刀中遵守。

## Phase 22D Completed（主目标）
- Version aligned: **Pro_v1.07.67** (`package.json` **1.7.67**；第二、三刀落在 **1.7.66** / **1.7.67**）。
- **租户 POST 验签**：WhatsApp / Messenger / Line / Website 在 `/webhooks/t/...` 下 **禁止回退进程 env secret**；缺失租户 secret → 403 + `saas_control`（`tenant_post_*`）；验签通过后 pipeline 注入 `tenant_post_secret_present` / `tenant_post_env_fallback_blocked`。脚本：`verify:tenant-post-signature-boundary`。
- **租户 GET verify token**：同上五通道（不含 Telegram）hub 订阅校验 **禁止回退 env verify token**；缺失 → 403 `tenant_verify_token_missing` + `tenant_get_*`；无 hub 参数时仍为 idle 信息 JSON。脚本：`verify:tenant-get-verify-boundary`。
- **Legacy** `/webhooks/*`：**未改** env 回退与兼容行为。

## Phase 22E Completed
- Version: **未升 patch**，仍 **Pro_v1.07.67** / `package.json` **1.7.67**（与 22D 对齐）。
- **CI**：`.github/workflows/ci.yml` 增加 **`tenant-boundary-verify`**（`needs: build`），跑 `verify:tenant-post-signature-boundary` + `verify:tenant-get-verify-boundary`；需 **`CHATFLOW_SAAS_ADMIN_TOKEN`**（Actions secret），未设则 job 跳过；fork PR 不跑。
- **文档**：`docs/175_pro_saas_multitenant_mvp.md`、`docs/GPT_PLANNER_HANDOFF_BLUEPRINT.md`、`docs/158_docker_staging_quickstart.md` — 租户必配、通道差异、idle GET vs hub challenge、CI 前提。
- **idle GET（→ Phase 23）**：选项 **A** 冻结（保留 200；`/health` 探活）。

## Phase 23 Completed — SaaS MVP Final Closure（已封板）
- **SaaS MVP 交付口径完成**：`tenant_settings` 主控制链成立；非主链路 **channel send** / **handoff env suppress** 收官审计 **covered**；`docs/175`、蓝图、`memory` **aligned**。
- **idle GET**：产品裁决 **A**（文档冻结，不改代码）。
- **`faq.fallback_enabled`**：**partial** 按 MVP 已知边界冻结（不扩 `post_capture` / `capture` 文案开关）。
- **版本**：仍 **Pro_v1.07.67** / `package.json` **1.7.67**（MVP 封板未强制升 patch）。
- **后续主线**：**Phase 24 — SaaS v1 Hardening**（见 **`memory/03`**）。

## Phase 24 Opened（2026-04-07 — 叙事与 memory/docs 立项）

- **代码**：尚未开始 v1 强化切片（无 Phase 24 `feat` 交付包截至本回写）。  
- **记录**：`memory/01`、`memory/03`、`memory/04`、`memory/05`、`docs/175`、`docs/GPT_PLANNER_HANDOFF_BLUEPRINT.md` 已指向 Phase 24 四向建议。
