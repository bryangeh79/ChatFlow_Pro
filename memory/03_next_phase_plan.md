# Next Phase Plan

## 战报顶栏（2026-04-07 — 下一聊天室）

- **版本**：`package.json` **1.7.82**（**Pro_v1.07.82**）— Phase 24：**Auth-RBAC Foundation（1A–1J）checkpoint 已封**；**包 2A–2G ✅**（**2G** = **ledger contract + fake harness**；**无** 真实 ledger 落库、无 `pg`）；**下一**：**真实 `pg` + apply + DB ledger + CI** — 见 **`docs/177`**。SaaS MVP 仍 **sealed**。  
- **当前 Phase**：**24 — SaaS v1 Hardening**（**当前主线**）。  
- **已关闭**：**Phase 23**（SaaS MVP Final Closure）— **主线 closed**，后续 **不算 MVP 扩功能**。  
- **本轮 git / push**：`c2a08cc` → `8cae7d4` → `bb5d17e` 已上 **`main`**，**push success**。  
- **下一阶段建议**（24 拆包）：① 租户认证/RBAC ② Postgres+migration ③ 多实例 session/store ④ 凭证 KMS/轮换/审计。  
- **新发现风险**：本轮无新增 P0；24 将引入 **规模/合规/运维复杂度**，需按包写风险条目入 **`memory/04`**。  
- **已知边界**：**冻结** — idle GET 200（A）、hub verify 租户 token、`faq.fallback_enabled` partial、slug/idle 信息面。**待 24** — 明文凭证、内存 session、sql.js。

---

- Current Phase: **Phase 24 — SaaS v1 Hardening**（**非** MVP 功能扩面，是托管与安全强化线）。**Phase 23 — SaaS MVP Final Closure** ✅ **已关闭**。authoritative status → **`memory/01_project_status.md`**
- Phase 22 子阶段（**整段已收口**，SaaS 为 Phase 主线的一部分，非外挂）：
  - **Phase 22A** — SaaS 基础接入（已完成）
  - **Phase 22B** — SaaS 控制权接管（已完成）
  - **Phase 22C** — SaaS 行为全面接管（已完成，**Pro_v1.07.65**）
  - **Phase 22D** — SaaS / Legacy 收口（主目标已完成，**Pro_v1.07.67**）
  - **Phase 22E** — CI / 文档 / 边界说明收尾（**✅ 已收口**，见下节）
- **当前版本（package.json）**：**1.7.82**（**Pro_v1.07.82**）— Phase 24 **2G 已交付**（ledger contract + fake ledger）；**推进中：Postgres 真执行 / DB ledger / CI**。SaaS MVP 封板语义不变。
- **任务归属（Phase 24）**：**租户认证 / RBAC**；**Postgres + migration**；**多实例下 session / store 收口**；**凭证安全**（加密、轮换、审计）。拆包顺序由规划与风险决定，**不**在本文件预写死交付日。
- **提交标注约定**（历史）：22D/22E/23 前缀仍见于已合并提交；**Phase 24**：`feat(phase-24):` · `chore(phase-24):` · `docs(phase-24):`。
- Previous major milestone in this log: **Phase 16.2** - HTTP access observability enhanced (`X-Request-Id`, optional `CHATFLOW_HTTP_ACCESS_LOG`, webhook `phases_ms`, verification type narrowing)
- Before that: Phase 16 - HTTP access observability first slice
- Completed in Phase 15.0:
  - ✅ Created real transport architecture design document: docs/138_phase15_0_real_transport_design.md
  - ✅ Selected Telegram as first real transport (simple API, low barrier)
  - ✅ Defined environment configuration (BOT_TOKEN, optional PROXY)
  - ✅ Designed transport interface boundary (outbound/sender only, no message model changes)
  - ✅ Specified failure strategy (retry once, degraded logging, still 200 OK)
  - ✅ Outlined security requirements (no token logging, env vars only)
- Completed in Phase 15.1:
  - ✅ `src/config/telegram.ts` - sandbox, token validation, `loadTelegramConfigForRealSend`, redaction
  - ✅ `src/channels/adapters/telegram/real-send.ts` - Bot API `sendMessage`, timeout + one retry
  - ✅ `src/channels/outbound-sender/index.ts` - Telegram branch, `should_send`, fallback/failure mapping
  - ✅ docs/139_phase15_1_telegram_real_transport_implementation.md
  - ✅ `.env.example` Telegram variables
  - ✅ Build passes: `npm run build`
  - ✅ Version: package.json **1.7.1** (Pro_v1.07.1) tags Phase 15.1 delivery
- Completed in Phase 15.2:
  - ✅ `TELEGRAM_PROXY_URL` / `TELEGRAM_PROXY_USERNAME` / `TELEGRAM_PROXY_PASSWORD` → `proxyConnectUri` in `telegram.ts`
  - ✅ `real-send.ts`: undici `fetch` + `ProxyAgent`, `telegram_real_proxy` in debug_steps, `close()` in finally
  - ✅ Runtime dependency `undici@^6`
  - ✅ docs/140_phase15_2_telegram_proxy_implementation.md, `.env.example` proxy block
  - ✅ Version: package.json **1.7.2** (Pro_v1.07.2) tags Phase 15.2 delivery
- Completed in Phase 15.3:
  - ✅ `src/config/webhook-verify.ts` - Meta-style `hub.mode` / `hub.verify_token` / `hub.challenge`, per-channel + `META_WEBHOOK_VERIFY_TOKEN` fallback
  - ✅ `src/server.ts` - `GET /webhooks/*` for all seven channels (Telegram = informational JSON; others Meta-style or idle ping)
  - ✅ docs/141_phase15_3_webhook_get_verification.md, `.env.example` verify block
  - ✅ Version: package.json **1.7.3** (Pro_v1.07.3) tags Phase 15.3 delivery
- Completed in Phase 15.4a:
  - ✅ `src/config/meta-webhook.ts` - `loadMetaWebhookConfig()`, `verifyMetaSignature()`, constant-time HMAC-SHA256
  - ✅ `src/server.ts` - `readRequestBody()` returns raw Buffer + parsed; WhatsApp/Messenger POST validate `X-Hub-Signature-256`
  - ✅ Invalid signature → HTTP 403 with `{ ok:false, error:'signature_invalid' }`
  - ✅ No secret configured → backward compatibility (no verification)
  - ✅ **安全修订**:配置 secret 时强制要求有效签名头(缺失/空/格式错误 → 403)
  - ✅ docs/142_phase15_4a_meta_post_signature_verification.md updated with security tightening
  - ✅ `.env.example` updated with Meta secret variables
  - ✅ Build passes: `npm run build`
  - ✅ Version: package.json **1.7.4** (Pro_v1.07.4) tags Phase 15.4a delivery
- Completed in Phase 15.4b:
  - ✅ `src/config/line-webhook.ts` - `getLineChannelSecret()`, `verifyLineSignature()`, constant-time HMAC-SHA256 (base64)
  - ✅ `src/server.ts` - Line POST validates `X-Line-Signature` header
  - ✅ Invalid signature → HTTP 403 with `{ ok:false, error:'signature_invalid' }`
  - ✅ No channel secret configured → backward compatibility (no verification)
  - ✅ docs/143_phase15_4b_line_post_signature_verification.md
  - ✅ `.env.example` updated with Line channel secret variable
  - ✅ Build passes: `npm run build`
  - ✅ Version: package.json **1.7.5** (Pro_v1.07.5) tags Phase 15.4b delivery
- Completed in Phase 15.4c:
  - ✅ **Zalo 官方文档研究**: 确认 Zalo Open API / OA Webhook 安全机制
  - ✅ **研究结论**: Zalo 无标准 POST body 签名头,主要依赖 IP 白名单 + OAuth 2.0
  - ✅ **决策**: 不实现伪签名(避免虚假安全预期),待官方机制再立项
  - ✅ docs/144_phase15_4c_zalo_post_signature_research.md - 完整记录研究依据与决策
  - ✅ **无代码变更**: 保持现有 `POST /webhooks/zalo` 行为
  - ✅ Build passes: `npm run build`
  - ✅ Version: package.json **1.7.6** (Pro_v1.07.6) tags Phase 15.4c delivery
- Completed in Phase 15.4d:
  - ✅ **设计文档**: `docs/145_phase15_4d_website_post_signature_design.md` - 定义 `X-Webhook-Signature` (sha256=<hex>) 格式
  - ✅ **代码实现**: `src/config/website-webhook.ts` - `getWebsiteSigningSecret()`, `verifyWebsiteSignature()` (复用 Meta 逻辑)
  - ✅ **服务器集成**: `src/server.ts` - Website POST 验签,无效签名 → 403
  - ✅ **环境配置**: `.env.example` 添加 `WEBSITE_WEBHOOK_SIGNING_SECRET`
  - ✅ **向后兼容**: 未配置 secret → 保持现有行为
  - ✅ Build passes: `npm run build`
  - ✅ Version: package.json **1.7.7** (Pro_v1.07.7) tags Phase 15.4d delivery
- Completed in Phase 15.5 (implementation):
  - ✅ **配置模块**: `src/config/whatsapp-cloud.ts` - `isWhatsAppSandboxOrDisabled`, `loadWhatsAppCloudConfigForRealSend`, `redactWhatsAppTokenInMessage`
  - ✅ **发送模块**: `src/channels/adapters/whatsapp/real-send.ts` - `parseWhatsAppRecipientFromSessionId`, `sendWhatsAppTextMessage` (undici、10s、5xx/429/网络重试 1 次)
  - ✅ **集成**: `src/channels/outbound-sender/index.ts` - WhatsApp 分支与 Telegram 对称 (real/synthetic、`should_send`、fallback/failure)
  - ✅ **环境配置**: `.env.example` WhatsApp Cloud 变量已添加 (Phase 15.5 ADR)
  - ✅ **构建**: `npm run build` 成功
  - ✅ **版本**: package.json **1.7.8** (Pro_v1.07.8) tags Phase 15.5 delivery
- Completed in Phase 15.6 (implementation):
  - ✅ **配置模块**: `src/config/messenger-graph.ts` - `isMessengerSandboxOrDisabled`, `loadMessengerGraphConfigForRealSend`, `redactMessengerTokenInMessage`
  - ✅ **发送模块**: `src/channels/adapters/messenger/real-send.ts` - `parseMessengerRecipientFromSessionId`, `sendMessengerTextMessage` (undici、10s、5xx/429/网络重试 1 次)
  - ✅ **集成**: `src/channels/outbound-sender/index.ts` - Messenger 分支与 WhatsApp/Telegram 对称 (real/synthetic、`should_send`、fallback/failure)
  - ✅ **环境配置**: `.env.example` Messenger Graph 变量已添加 (Phase 15.6 ADR)
  - ✅ **构建**: `npm run build` 成功
  - ✅ **版本**: package.json **1.7.9** (Pro_v1.07.9) tags Phase 15.6 delivery
  - ✅ **ADR 更新**: `docs/147` 添加 `messaging_type: "RESPONSE"` 字段 (Messenger API 文档要求)

- Completed in Phase 15.7 (implementation):
  - ✅ **配置模块**: `src/config/line-messaging.ts` - `isLineSandboxOrDisabled`, `loadLineMessagingConfigForRealSend`, `redactLineTokenInMessage`
  - ✅ **发送模块**: `src/channels/adapters/line/real-send.ts` - `parseLineRecipientFromSessionId`, `sendLineTextMessage` (undici、10s、5xx/429/网络重试 1 次、push API 而非 reply API)
  - ✅ **集成**: `src/channels/outbound-sender/index.ts` - Line 分支与 WhatsApp/Messenger/Telegram 对称 (real/synthetic、`should_send`、fallback/failure)
  - ✅ **环境配置**: `.env.example` Line Messaging 变量已添加 (Phase 15.7 ADR)
  - ✅ **构建**: `npm run build` 成功
  - ✅ **版本**: package.json **1.7.10** (Pro_v1.07.10) tags Phase 15.7 delivery
  - ✅ **ADR 更新**: `docs/148` 修正为 push API 端点与请求体
  - ✅ **Phase 15.7.1 稳定性修订**: 移除 `LINE_MESSAGING_DISABLED` 检查,`parseLineRecipientFromSessionId` 返回 `null` 而非 `'unknown'`

- Technical Debt Progress:
  - ✅ **Real transport design**: Architecture decision record created
  - ✅ **Intent dispatch boundary fix**: Partial session FAQ access improved
  - ✅ **Intent dispatch documentation**: Comprehensive regression matrix created
  - ✅ **Intent dispatch implementation**: Minimal classification and routing implemented
  - ✅ **FAQ language priority**: Three-tier matching with English fallback
  - ✅ **FAQ content**: Expanded to 4 languages (20 entries across 5 topics)
  - ✅ **Field validation**: Minimal email/phone format validation
  - ✅ **Session TTL**: 24-hour expiration with lazy cleanup
  - ✅ **JSONL backup cleanup**: Max 5 files, 50MB total size limit
  - 🔄 **Real transports beyond Telegram**: WhatsApp / others still synthetic

- Known Limitations (Pro_v1.07.9 + Phase 15.6):
  - Session store: in-memory only, single-process, **with 24h TTL expiration**
  - JSONL persistence: **backup accumulation controlled** (max 5 files, 50MB total)
  - Field extraction: regex-based, **with minimal format validation**
  - FAQ content: **multilingual with language-priority matching** (4 languages, 5 topics)
  - Intent dispatch: **implemented with partial session boundary fix**
  - Real transports: **Telegram real send** when token set and not sandbox (optional proxy); **WhatsApp Cloud real send** when token + phone number ID + not sandbox; **Messenger Graph real send** when token + page ID + not sandbox; **Line real send** when token + not sandbox; **Zalo real send** when token + OA ID + not sandbox
  - **POST signature validation**: **全部完成** - WhatsApp/Messenger/Line/Website 已实现;Zalo 无官方机制(依赖 IP 白名单)

- Completed in Phase 16 (observability slice):
  - ✅ `src/observability/http-access.ts` - `createRequestId`, `channelFromPathname`, `writeHttpAccessLog`, env gate
  - ✅ `src/server.ts` - always `X-Request-Id`; optional JSON access line on `res` `finish` (`duration_ms`, `channel` for `/webhooks/*`)
  - ✅ `docs/150_phase16_http_access_observability.md`, `.env.example` `CHATFLOW_HTTP_ACCESS_LOG`
  - ✅ Build: `npm run build`
  - ✅ Version: package.json **1.7.13** (Pro_v1.07.13)

- Completed in Phase 16.2 (webhook phases_ms + verification type narrowing):
  - ✅ `src/webhooks/webhook-timing.ts` - `webhookObservabilityPhases`, `WebhookHandlerObservability` interface
  - ✅ All six webhook handlers (`telegram.ts`, `whatsapp.ts`, `messenger.ts`, `line.ts`, `zalo.ts`, `website.ts`) - integrate `phases_ms` timing
  - ✅ `src/observability/http-access.ts` - `webhookPhasesFromHandlerResult` extracts timings for access logs
  - ✅ `src/server.ts` - passes `httpRequestId` to handlers, copies `phases_ms` to access logs
  - ✅ `src/webhooks/verification.ts` - type narrowing for verification responses
  - ✅ `docs/150` updated with `phases_ms` documentation
  - ✅ Build: `npm run build`
  - ✅ Version: package.json **1.7.15** (Pro_v1.07.15) - HTTP access log slice
  - ✅ **Phase 16.1 (minimal)**: `httpRequestId` from `server` → all `handle*Webhook` → `createMinimalTraceContext` → outbound `debug_metadata.request_id` matches `X-Request-Id`; **1.7.14** (Pro_v1.07.14); `docs/150` updated
  - ✅ **Phase 16.2 (minimal)**: `observability.phases_ms` on webhook JSON + copied into `http_access` log (`prepare_ms`, `outbound_send_ms`); `webhook-timing.ts`, `webhookPhasesFromHandlerResult`; **1.7.15** (Pro_v1.07.15)

- **Pause Status**: **Not blocked** - 与 **`memory/01`** 一致;CI 含 **T1 `docker-smoke`**;本地 **T2** 用 **`npm run staging:docker-smoke:t2`**
- **Commander preference**: 完成约定 phase 交付后,**自动继续推进**下一立项阶段,无需指挥官每轮提醒「继续」;遇阻塞或范围不明时再停问。
- **Implementation split**: **实现一律龙虾**;**Cursor 默认只出指令与验收**;仅**极小改动**可由 Cursor 直接改。详见 `memory/05_handoff_for_new_chat.md`。
- **CI infrastructure**: `.github/workflows/ci.yml` - build validation on push/pull_request
- **Website real outbound**: `docs/153_phase17_0_website_outbound_push.md` - ADR + implementation (`website-outbound.ts`, `real-send.ts`, integration)
- **Version**: **Pro_v1.07.16** (package.json 1.7.16) - seventh channel real transport capability complete
- **Pro_v1.07.17** (package.json 1.7.17): Website `real-send` - **429 / 5xx** 与网络/超时一致为「最多 2 次请求」;`User-Agent` 与 `docs/153` 示例端口与 package 对齐
- **Pro_v1.07.18** (package.json 1.7.18) - **Phase 17.1**: Zalo OA **401 → OAuth refresh**(`CHATFLOW_INPROCESS_TOKEN_REFRESH` 开关 + `ZALO_REFRESH_TOKEN` / `ZALO_APP_ID` / `ZALO_APP_SECRET`);内存缓存 access/refresh;`docs/154`;**Meta 进程内刷新未做**(仍选项 A + 152)
- **Pro_v1.07.19** (package.json 1.7.19): **`npm run check:agent-env`** + **`docs/155`** - 龙虾/本地代理 **Git + PATH** 自检与运维说明;`AGENTS.md` 指向 155
- **Pro_v1.07.20** (package.json 1.7.20): **`npm run report:agent-git`**(无 git 二进制时读 `.git` 报 SHA)+ `agent-git-fs.mjs`;`check:agent-env` 失败时提示该命令;**docs/155** 增补容器分工表
- **Pro_v1.07.21** (package.json 1.7.21): **`npm run verify:local`**(`build` + `report:agent-git`);**docs/156** - Phase **17.2** Meta 进程内刷新**规格**(实现待 staging)
- **Pro_v1.07.22** (package.json 1.7.22): **Phase 17.2 实现** - `fb_exchange_token`、**401 / error 190**、`META_APP_ID` + secret、`meta-token-cache`;**docs/156** 更新为已落地 MVP
- **Pro_v1.07.23** (package.json 1.7.23): **`docs/157`** - Phase 17 **staging 验证 + 与 152 编排** playbook;**docs/152** References 增补 157
- **Pro_v1.07.24** (package.json 1.7.24): **Docker** 交付 - `Dockerfile`、`.dockerignore`、`docker-compose.yml`、**`docs/158`**;**CI** 增加 `npm run report:agent-git`
- **Pro_v1.07.25** (package.json 1.7.25): **`docs/159`** - 龙虾运行时安装 **git/Docker** 与宿主能力匹配(镜像 / PATH / `docker.sock` 安全说明);**155** 链到 159;**155** 增补 *Typical OpenClaw profile*(只读容器正式口径);**AGENTS.md** 指到该节
- **Pro_v1.07.26** (package.json 1.7.26): **`npm run staging:docker-smoke`** + `scripts/staging-docker-smoke.mjs` - Phase **0** 本地一键:compose up → `/health` → `smoke:webhooks` → compose down;**157/158** 更新;**`docs/160`** 最小必测矩阵小白版 + **`docs:pdf:160`**(Edge 打 PDF)+ 已生成 **`docs/160_phase17_minimal_test_matrix_beginner.pdf`**;**`npm run check:staging-env`**(`check-staging-env.mjs`,不打印密钥)+ **160** §4 / **157** / **AGENTS**
- **Pro_v1.07.27** (package.json 1.7.27): **`npm run verify:lead-capture-states`**(`scripts/verify-lead-capture-states.mjs`,**memory/36** 三态 **none/partial/captured**)+ 接入 **`staging:docker-smoke`** / CI **`docker-smoke`**;**158** CI 说明与 T1 通过条件更新;**`memory/05`** 头部与 **龙虾下一包** 对齐现状
- **Pro_v1.07.28** (package.json 1.7.28): **CI** 升级 **`actions/checkout@v5`** + **`actions/setup-node@v5`**(缓解 Actions Node 20 弃用告警);**`npm run report:github-ci`**(`scripts/report-github-ci.mjs`)- 无 git 亦可查最新 **`ci.yml`** run;**155** / **AGENTS** 增补说明
- **Pro_v1.07.29** (package.json 1.7.29): **`check:agent-env`** 失败提示增补 **`report:github-ci`**;**158** CI note、**160** §4.5、**`memory/01`** 版本与完成点对齐
- **Pro_v1.07.30** (package.json 1.7.30): **`verify:lead-capture-states`** 扩展 **Telegram** 与 Website 相同 **none/partial/captured**(**`SMOKE_SKIP_TELEGRAM_LEAD`** / **`SMOKE_SKIP_CHANNELS` 含 telegram** 时跳过 TG);**158** / **`memory/01`** 更新
- **Pro_v1.07.31** (package.json 1.7.31): **`.gitignore`** 修正(**`!.env.example`**,避免模板被 `.env.*` 误忽略);**跟踪 `.env.example`**;**`docs/155`** *Environment & secrets* + **`AGENTS.md`** 红线;忽略 **`*.pem` / `*.p12`**
- **Pro_v1.07.32** (package.json 1.7.32): **`verify:lead-capture-states`** 扩展 **WhatsApp** 扁平体 **none → partial → captured**(**`SMOKE_SKIP_WHATSAPP_LEAD`** / **`SMOKE_SKIP_CHANNELS` 含 whatsapp** 时跳过);**`docs/158`** / **`memory/01`** 更新
- **Pro_v1.07.33** (package.json 1.7.33): **`verify:lead-capture-states`** 扩展 **Messenger、Line、Zalo** 三态 + 403 提示与 **`SMOKE_SKIP_MESSENGER_LEAD` / `SMOKE_SKIP_LINE_LEAD` / `SMOKE_SKIP_ZALO_LEAD`**;**`docs/158`** / **`docs/155`** / **`memory/01`** / **`memory/36`** 更新
- **Pro_v1.07.34** (package.json 1.7.34): **`verifyLeadTriplet`** 抽取(脚本去重);**`docs/160`** §**4.6** lead-verify 跳过表;**`.github/workflows/ci.yml`** docker-smoke 步骤文案;**`AGENTS.md`** T1 等价
- **Pro_v1.07.35** (package.json 1.7.35): **`coerceTelegramWebhookBody`** - 官方 **`Update.message`** / **`edited_message`** / **`channel_post`** 与扁平测试体统一入口;**`memory/01`**
- **Pro_v1.07.36** (package.json 1.7.36): **`.env.example`** 默认打开 **`CHATFLOW_HTTP_ACCESS_LOG=true`**(文档说明本地可关)
- **Pro_v1.07.37** (package.json 1.7.37): **`docs/157`** Phase 0 - **自托管 HTTPS staging**(VPS/Caddy)与笔记本远程 **`smoke:webhooks`** 路径写入 playbook
- **Pro_v1.07.38** (package.json 1.7.38): **`docs/158`** - **单通道 Telegram 可交付收口**清单(健康检查、观测性、密钥与升级路径)
- **Pro_v1.07.39** (package.json 1.7.39): **`CHATFLOW_LEAD_NOTIFY_URL`** - lead 首次持久化时异步 POST;**`check:staging-env`** 可选节
- **Pro_v1.07.40** (package.json 1.7.40): **Handoff 最小接入包** - 关键词触发、session 状态更新、unified pipeline 集成
- **Pro_v1.07.41** (package.json 1.7.41): **`CHATFLOW_HANDOFF_NOTIFY_URL`** - 首次进入 handoff **pending** 时异步 POST;**`check:staging-env`** handoff notify 可选节
- **Pro_v1.07.42** (package.json 1.7.42): **`CHATFLOW_SUPPRESS_REPLY_ON_HANDOFF`** - handoff 时可选抑制 bot 回复,七通道 webhook handlers 使用 `result.response.should_send`
- **Pro_v1.07.43** (package.json 1.7.43): **`docs/161`** - lead + handoff notify **接收端契约**;**`check:staging-env`** 增补 **`CHATFLOW_SUPPRESS_REPLY_ON_HANDOFF`** 摘要
- **Pro_v1.07.44** (package.json 1.7.44): **`dev:notify-echo`** / **`notify-echo-server.mjs`** - 本地 echo;**`docs/161`** §4
- **docs/162**(客户交付):**`docs/162_customer_seven_channel_access_token_guide.md`** - 七通道凭据/Token 官网获取步骤;**`npm run docs:pdf:162`** → **`docs/162_customer_seven_channel_access_token_guide.pdf`**
- **Pro_v1.07.45** (package.json 1.7.45): **Conversation Runtime 骨架 + Lead 自动处理链**(Phase 17&18 第一期)- `src/channels/conversation-runtime/`(phase/policy/events)、单槽引导、资格标签、事件发射、统一策略规划
- **Pro_v1.07.46** (package.json 1.7.46): **多轮对话逻辑强化**(Phase 17&18 第二期)- Slot引导策略(name→phone→email优先级)、post_capture对话策略(i18n下一步引导)、handoff对话策略统一(i18n消息+抑制配置)、业务层观测(debug_metadata增强)
- **Pro_v1.07.47** (package.json 1.7.47): **Phase 18 / 包 1** - notify 事件补齐 request_id 追踪 + 最小坐席分配字段闭环;lead/handoff notify payload 新增 request_id/message_trace_id;可选 CHATFLOW_HANDOFF_AUTO_ASSIGN_OWNER 自动分配;debug_metadata 输出 assigned_owner_id
- **Pro_v1.07.48** (package.json 1.7.48): **Phase 18 / 包 2** - 坐席分配策略增强;新增 CHATFLOW_HANDOFF_ASSIGN_MODE(single/round_robin/by_tag)、OWNER_POOL、TAG_MAP;稳定 round_robin 分配(同 session 同 owner);tag 优先匹配;debug_metadata 增强(assign_mode, assign_reason, assigned_owner_id);handoff notify 含 assigned_owner_id
- **Pro_v1.07.49** (package.json 1.7.49): **Phase 18 / 包 3** — 坐席状态管理 + 可分配过滤 + 最小负载均衡；新增 AGENT_STATUS（on/off）、ASSIGN_BALANCE（least_recent/round_robin）、ASSIGN_STICKY_TTL_MIN；在线坐席过滤；进程内分配历史追踪；by_tag 离线回退；debug_metadata 增强（online_agents, balance_strategy, assign_reason 细化）；handoff notify 含 assign_reason, online_agents_count
- **Pro_v1.07.50** (package.json 1.7.50): **Phase 18 / 包 4** — 分配历史可审计（落盘 JSONL，对齐 lead 持久化风格）；路径 data/handoff-assignments.jsonl；字段：ts_iso, session_id, channel, assigned_owner_id, assign_mode, assign_reason, request_id?, tag_hits?, online_agents_count, assignment_log_id；共享 JSONL 轮转工具；仅在"新分配"时写入（幂等）；handoff notify 增加 assignment_log_id
- **Pro_v1.07.51** (package.json 1.7.51): **Phase 19 / 包 1** — 最小报表能力（CLI）；新增脚本 scripts/report-handoff-assignments.mjs；读取 data/handoff-assignments.jsonl（流式）；输出 JSON：total_assignments, by_owner, by_reason, by_mode, avg_assignments_per_hour, top_tags（前5）；时间过滤：--since-hours=24（默认），--since=ISO（优先）；package.json 加 script: report:handoff-assignments；无数据时返回空结构，不报错
- **Pro_v1.07.52** (package.json 1.7.52): **Phase 19 / 包 2** — owner SLA 报表（CLI）；assignment record 增加可选字段 first_pending_at?, assigned_at?（向后兼容）；新增脚本 scripts/report-handoff-sla.mjs；计算 first_response_minutes（assigned_at - first_pending_at）；输出 JSON：total_cases, within_sla_count, within_sla_rate, p50_minutes, p90_minutes, by_owner: { owner: { count, within_sla_rate, avg_minutes, p90_minutes } }, dropped_missing_timestamps；参数：--since-hours=24（默认），--since=ISO（优先），--target-minutes=15（默认 SLA 目标）；规则：缺少 first_pending_at 的记录计入 dropped_missing_timestamps，不参与 SLA 统计；同 session 重复记录仅取首条有效 assigned 记录（避免重复污染）
- **Pro_v1.07.53** (package.json 1.7.53): **Phase 19 / 包 3** — 趋势对比 + 日报输出（CLI）；新增脚本 scripts/report-handoff-daily.mjs；读取 data/handoff-assignments.jsonl；输出 JSON：days 数组（每日统计），summary（趋势分析与警报）；参数：--days=7（默认），--tz=Asia/Shanghai（默认），--target-minutes=15（默认，复用 SLA 口径）；日报字段：date, total_cases, within_sla_rate, p50_minutes, p90_minutes, by_owner_top3, dropped_missing_timestamps；趋势分析：trend_total_cases_pct（最近3天 vs 前3天），trend_within_sla_rate_delta（最近3天 - 前3天），alert_flags（SLA 连续2天下降、p90 > target*2 等）；规则：复用包2的数据清洗规则；若天数不足，trend 字段可为 null；输出稳定排序（按日期升序）
- **Pro_v1.07.54** (package.json 1.7.54): **Phase 20 / 包 1** — 日报警报外呼动作（CLI）；新增环境变量 CHATFLOW_OPS_ALERT_WEBHOOK_URL（可选）、CHATFLOW_OPS_ALERT_SECRET（可选）、CHATFLOW_OPS_ALERT_MIN_INTERVAL_SEC=300（默认）；新增脚本 scripts/run-handoff-daily-alerts.mjs；调用与 report-handoff-daily 相同统计逻辑（共享函数到 scripts/lib/handoff-daily-core.mjs）；读取 summary.alert_flags；若 URL 未配置：stdout 打印 JSON 并 exit 0；若 URL 配置：POST JSON { source:"chatflow-pro", version, flags, summary, ts }；幂等与节流：进程内文件锁 .last-alert.json（data/ 下）记录 last_sent_ts + last_flags_hash；同 flags_hash 在 MIN_INTERVAL_SEC 内不重复 POST；package.json 新增 script: ops:handoff-daily-alerts
- **Pro_v1.07.55** (package.json 1.7.55): **Phase 20 / 包 2** — 基于日报/SLA输出的自动参数调优（CLI）；新增环境变量 CHATFLOW_OPS_AUTOTUNE=0|1（默认0）、CHATFLOW_OPS_AUTOTUNE_STATE_PATH=data/.handoff-autotune-state.json、CHATFLOW_OPS_AUTOTUNE_COOLDOWN_MIN=1440（默认24h）、CHATFLOW_OPS_AUTOTUNE_RULES=conservative|aggressive（默认 conservative）；新增脚本 scripts/run-handoff-autotune.mjs；输入：复用 scripts/lib/handoff-daily-core.mjs 产出 summary + 最近3天指标；输出：写入 STATE_PATH（JSON：last_run_ts, last_action, reason, before/after）；conservative 规则：若 p90 > target*2 连续2天：把 CHATFLOW_HANDOFF_ASSIGN_BALANCE 从 round_robin 切 least_recent；若 within_sla_rate 连续2天 < 0.6：把 target-minutes +5（上限 30）；若 low_volume_warning：不做参数变更；aggressive 规则：允许在 cooldown 外把 OWNER_POOL 轮换提示；安全约束：默认只"建议变更"，真正写文件仅限 STATE_PATH；任何建议变更必须打印 unified diff 风格 before/after；package.json 新增 script: ops:handoff-autotune
- **Pro_v1.07.56** (package.json 1.7.56): **Phase 21 / 选项 B** — Handoff 运行时配置重载（JSON 文件 + SIGHUP）；新增环境变量 CHATFLOW_HANDOFF_RUNTIME_CONFIG_PATH（可选）；优先级规则：env 为基底，JSON 仅覆盖文件中出现的键；白名单键：assign_mode, auto_assign_owner, owner_pool, tag_map, agent_status, assign_balance, assign_sticky_ttl_min；刷新时机：进程启动加载一次，Unix SIGHUP 重载，Windows 需重启进程；实现落点：src/config/handoff-assign.ts 改为「env 基底 + 内存覆盖层」；文档更新：docs/165 标记 B 已落地，.env.example 添加示例
- **Pro_v1.07.57** (package.json 1.7.57): **Phase 21.2** — autotune 合并写运行时 JSON；新增开关 CHATFLOW_OPS_AUTOTUNE_WRITE_RUNTIME（默认 0）；仅当 PATH 已设且开关为 1 时写入；合并策略：文件存在且为合法 JSON 对象 → 深合并/字段级覆盖，仅改 autotune 本次要动的白名单键；文件不存在 → 创建目录后写仅含本次键的最小 JSON；白名单键同 Phase 21 B；与 autotune 逻辑衔接：在 scripts/run-handoff-autotune.mjs 里，当 AUTOTUNE_ENABLED 且本轮决定应用变更时，除 STATE_PATH 外，若 WRITE_RUNTIME=1 且 RUNTIME_CONFIG_PATH 已设，把本轮实际采纳的变更以白名单键写入目标 JSON；文档：.env.example 添加新变量说明 +「Unix 写后需 kill -HUP 或重启方生效」
- **Phase 21.2 已交付**：**`docs/167`**（autotune 可选合并写运行时 JSON）。
- **商业形态**：**`docs/169`** — 一客户一部署；**`docs/170`** — 运维与 `backup:data`。
- **厂商发版**：**`docs/171`** + **`CHANGELOG.md`** + **`docker-compose.customer.yml`**；HTTPS：**`docs/172`** + **`examples/reverse-proxy/`**。
- Next Unique Priority Action（历史条目已 supersede）：当前以文件 **顶部「Current Phase」与文末「Next (执行优先级)」为准** — **Phase 23 — SaaS MVP Final Closure**。

## 2026-04-06 收口补充（已完成）

- ✅ P0：工作区残留已处置（`docs/162` 单独提交；`MEMORY.md` 保持未提交）。
- ✅ P0：`release:verify` 与 `release:ship -- --with-pdf` 已通过，产物三元组已回收。
- ✅ P1：新增 `docs/173`（对外发包模板）与 `docs/174`（实施接入极短模板）。
- ✅ P1：新增 `delivery:message` 自动化，减少手工拼接版本/zip/sha/CI 的漏项风险。

## Phase 22B — SaaS 控制权接管（已收口）

完成项（Pro_v1.07.62）：
- `handoff.enabled` 接入 runtime 并验证生效
- `notify.enabled` 接入 runtime 并验证生效
- `lead_capture.enabled` 接入 runtime 并验证生效
- 三项均已建立 git checkpoint（`main`）

遗留风险：
- 历史 session 状态未主动清空（仅阻断新推进，不回收既有内存状态）

## Phase 22C — SaaS 行为全面接管（✅ 已收口，Pro_v1.07.65）

已完成三刀（见 **`memory/02_completed_work.md`**）：`bot.enabled`、`suppress_reply.enabled`、`faq.fallback_enabled`。

## Phase 22D — SaaS / Legacy 收口（✅ 主目标完成，Pro_v1.07.67）

已完成：**租户 POST 签名**与 **租户 GET verify token** 均 **阻断 env fallback**；legacy 不变。盘点文档见对话/仓库内实现；**sandbox/disabled 全局 tenant 化**未作为 22D 必交付项，可后续单独立项。

## Phase 22E — CI / Docs / Boundary Cleanup（✅ 已收口）

**已完成**：
1. **CI**：`ci.yml` 增加 **`tenant-boundary-verify`**（`needs: build`），跑 `verify:tenant-post-signature-boundary` + `verify:tenant-get-verify-boundary`；依赖 GitHub secret **`CHATFLOW_SAAS_ADMIN_TOKEN`**，未配置则 **job 跳过**；fork PR 不跑。
2. **文档**：`docs/175`、`docs/GPT_PLANNER_HANDOFF_BLUEPRINT.md`、`docs/158`（CI note）— 租户必配项、通道差异（Telegram/Zalo 无 POST 验签等）、**idle GET** vs **hub challenge**、CI 前提写清。

**未在 22E 强关（移交 Phase 23）**：**idle GET** 是否在无租户 verify token 时收紧为 **403**（产品/安全裁决）。

---

## Phase 23 — SaaS MVP Final Closure（✅ 已关闭）

**目标**：总验收 + 剩余尾项裁决，**不再大面积扩功能** — **已达成**。

**交付核对**：
1. ~~**idle GET**~~ **✅ 选项 A**：`docs/175` + 蓝图冻结；**`/health`** 为推荐探活。
2. ~~**非主链路 send / suppress**~~ **✅ 审计**：channel 回复单一路径；handoff env suppress 仅 `policy.ts`；notify HTTP 单独 `notify.enabled`。
3. ~~**`tenant_settings` 矩阵**~~ **✅** — `docs/175`；`faq.fallback_enabled` **partial** 按 MVP 边界冻结、不扩代码。
4. **验收清单** — `docs/175` §「Phase 23 — SaaS MVP acceptance notes」；**SaaS MVP 主线完结**，后续不算 MVP 扩面。

**结论**：**多租户 SaaS MVP 已完成并封板**；工程叙事切换为 **Phase 24 — SaaS v1 Hardening**。

---

## Phase 24 — SaaS v1 Hardening（当前）

**定位**：在 **MVP 已交付** 前提下，面向 **托管生产** 的强化线（**非**「把 MVP 当未完主线」）。

**首包锁定（ADR-first）**：**Admin Auth / RBAC** — **`docs/176_phase24_saas_admin_auth_rbac_adr.md`**。  
- **包 1A**：ADR + memory 收口 — **已完成**。  
- **包 1B**：Admin 鉴权 **抽象桥接**（`admin-auth.ts`）— **已完成**。  
- **包 1C**：**Authorization scaffold** — **已完成**。  
- **包 1D**：Tenant-scoped RBAC **语义** — **已完成**。  
- **包 1E**：Tenant **admin** bridge — **已完成**。  
- **包 1F**：Tenant **readonly** bridge — **已完成**（`CHATFLOW_SAAS_TENANT_READONLY_TOKENS`）。  
- **包 1G**：**DB-backed tenant principal** — **已完成**（`verify:saas-admin-db-principal-bridge`）。  
- **包 1H**：**`bridge_token` hash-at-rest** — **已完成**（`verify:saas-admin-db-principal-token-hardening`）。  
- **包 1I**：principal 审计 + rotation 钩子 — **已完成**（`verify:saas-admin-principal-audit`）。  
- **包 1J**：**auth cutline / deprecation prep** — **已完成**（`admin-auth-sources` + **`GET /saas/v1/admin/auth/summary`**）；验证 **`verify:saas-admin-auth-cutline`**。  
- **✅ 子里程碑**：**Phase 24 / Auth-RBAC Foundation checkpoint（1A–1J）** — **已正式封板**（见 `memory/01`、`memory/02`）；**不再继续堆 bridge**；真实 tenant auth **另开产品化线**。  
- **包 2A**：**Postgres + migration** — **ADR ✅**（**`docs/177_phase24_postgres_migration_adr.md`**）。  
- **包 2B**：**DB adapter 骨架 ✅** — `SaaSDbAdapter` + `SqlJsSaaSDbAdapter`；principals/audit 已接线；验证 **`verify:saas-sqljs-adapter-principals`**。  
- **包 2C**：**✅** — **`PostgresSaaSDbAdapter` stub** + **`CHATFLOW_SAAS_DB_DRIVER`** + **`getSaaSDbDriver()`**；验证 **`verify:saas-db-adapter-selection`**。  
- **包 2D**：**✅** — **`src/saas/db-migrations/*`** 注册表 + **`saas:db:migration:plan`** / **`bootstrap`**（**dry-run**）；未来 ledger **`saas_schema_migrations`**（**未创建**）；验证 **`verify:saas-db-migration-ledger`**。  
- **包 2E**：**✅** — **`postgres/pg_0001_*.sql` / `pg_0002_*.sql`** + **`checksum.ts`** + registry 字段 **`asset_path` / `asset_kind` / `checksum_sha256`**；验证 **`verify:saas-db-migration-assets`**。  
- **包 2F**：**✅** — **`execution-types.ts` / `execution-contract.ts`**、**`runSaasPostgresMigrations`**；**`bootstrap --mode=`**；验证 **`verify:saas-db-migration-execution-contract`**。  
- **包 2G**：**✅** — **`ledger-types` / `ledger-contract` / `fake-ledger`**；**`runSaasPostgresMigrations({ ledger })`** dry-run：**`already_applied` / `would_apply` / checksum `failed`**；**`bootstrap --fake-applied=`**；验证 **`verify:saas-db-migration-ledger-contract`**。  
- **下一（Postgres 执行）**：真实 **`pg`**、迁移 **apply**、**DB ledger**、repository 扩面、CI — 见 **`docs/177`**。  
- **未开始（仍有效）**：真实多用户身份源、password/JWT/session、**完整登录审计**；**不动** webhook 主链与 legacy。

**建议方向（立项时拆包）**：
1. ~~**Tenant Admin Auth / RBAC（bridge 子线）**~~ **✅ 1A–1J 已封 checkpoint**（`docs/176`）；后续 **真实 tenant auth** 单独立项。  
2. **Postgres + migration**（**2A–2G ✅（含 ledger contract + fake harness）→ 真 pg/执行/DB ledger/CI**；local 可保留 sql.js，hosted 目标 Postgres）。
3. **多实例 / session / store 收口**（sticky、外置 session、JSONL 单写者假设等）。
4. **凭证安全**：加密-at-rest、轮换策略、审计日志（`docs/175` non-goals 已有提示）。

## Next (执行优先级)

1. **Phase 24**：接 **`pg`**、迁移 **apply**、**`saas_schema_migrations`**、扩 repository、CI — 按 **`docs/177_phase24_postgres_migration_adr.md`**；默认仍保持 **T0 + T1** 不降级。
2. **MVP 回归**：合并前仍以 **`docs/175`** + **T0/T1** 为 SaaS 基线。
3. 默认外发动作（非 onboarding）：`npm run delivery:ship:final`。
4. 客户 **onboarding / 一客户一部署**：继续走 **`docs/171`** 等交付链，与 Phase 24 **并行规划**时需标明资源优先级。
