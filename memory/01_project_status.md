# Project Status

## 战报固化（2026-04-07 — 下一聊天室）

| 项 | 值 |
|----|-----|
| **package.json / Pro** | **1.7.67** / **Pro_v1.07.67** |
| **当前 Phase** | **Phase 24 — SaaS v1 Hardening**（当前主线） |
| **已关闭主线** | **Phase 23 — SaaS MVP Final Closure** ✅；**SaaS MVP 交付口径 = 完成**（非「未完 MVP」） |
| **本轮 git（已 push `main`）** | `c2a08cc` docs(phase-23): idle GET freeze · `8cae7d4` chore: Phase23 收官审计 memory · `bb5d17e` chore(phase-24): open v1 hardening + seal MVP |
| **push** | **success**（远端与本地一致以 `git log` 为准） |
| **下一阶段建议** | Phase 24 四向：**租户认证/RBAC**、**Postgres+migration**、**多实例 session/store**、**凭证加密/轮换/审计** — 逐项 ADR + 验收，勿一口吞 |
| **新发现风险（本轮）** | 无新的 P0；v1 强化将暴露 **托管规模**与**合规**类风险，需在 24 各包单独立项 |
| **已知边界** | **冻结**：idle GET 200（选项 A）、`faq.fallback_enabled` partial、slug/idle 信息面（MVP 接受）。**待 Phase 24**：明文凭证、单实例 session、sql.js 文件库 |

---

- Project Name: ChatFlow Pro
- Current Phase: **Phase 24 — SaaS v1 Hardening**（**非** MVP 扩功能主线，而是托管/安全/规模强化）。**Phase 23 — SaaS MVP Final Closure** ✅ **已关闭**；Phase **22（22A–22E）** ✅。
- Current Version: **Pro_v1.07.67** (package.json: **1.7.67**；**SaaS MVP 口径已完成**；v1 强化线可按里程碑另发 **1.7.68+**)
- Execution Root: C:\AI_WORKSPACE\Chatflow\ChatFlow_Pro
- Current Project State: 
  - ✅ **Seven-route webhook baseline**: Website, Telegram, WhatsApp, Messenger, Line, Zalo (`POST /webhooks/*` + **`GET /webhooks/*`** verification per docs/141)
  - ✅ Lead capture complete flow: detection → cross-turn merging → file persistence → i18n prompts
  - ✅ Optional **lead notify**: `CHATFLOW_LEAD_NOTIFY_URL` (+ optional secret header) → async POST on first JSONL persist (**Pro_v1.07.39**)
  - ✅ FAQ integration: multilingual matching (4 languages), language priority, 20 entries across 5 topics
  - ✅ Intent dispatch system: 4 intent types, 4 dispatch stages, smart routing between FAQ/lead
  - ✅ Infrastructure: in-memory session store (1000 cap, 24h TTL), JSONL rotation with cleanup (max 5 files, 50MB total)
  - ✅ Field validation: minimal email/phone format validation
  - ✅ Unified pipeline: lead+FAQ+intent dispatch with proper prioritization across all channels
  - ✅ **Acceptance checklist**: Comprehensive test documentation (docs/129)
  - ✅ **Real transport design**: Architecture decision record (docs/138) for Telegram as first real transport
  - ✅ **Telegram real send**: When `TELEGRAM_BOT_TOKEN` valid and not sandbox, outbound uses Bot API (`docs/139`, `src/channels/outbound-sender/index.ts`)
  - ✅ **Telegram proxy**: `TELEGRAM_PROXY_*` → undici `ProxyAgent` (`docs/140`, `real-send.ts`)
  - ✅ **Webhook GET verify**: Meta-style hub challenge on WA/Messenger/Website (+ optional Line/Zalo); Telegram GET informational (`docs/141`, `webhook-verify.ts`)
  - ✅ **Meta POST signature**: WhatsApp + Messenger validate `X-Hub-Signature-256` when app secret configured (`docs/142`, `meta-webhook.ts`) — **安全修订：配置 secret 时强制签名头**
  - ✅ **Line POST signature**: Line validates `X-Line-Signature` when channel secret configured (`docs/143`, `line-webhook.ts`)
  - ✅ **Zalo POST signature research**: Documented findings — no official signature mechanism (`docs/144`)
  - ✅ **Website POST signature**: Website validates `X-Webhook-Signature` when signing secret configured (`docs/145`, `website-webhook.ts`)
  - ✅ **WhatsApp Cloud API real outbound**: When `WHATSAPP_ACCESS_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` valid and not sandbox, outbound uses Graph API (`docs/146`, `src/channels/outbound-sender/index.ts`)
  - ✅ **Messenger Graph API real outbound**: When `MESSENGER_PAGE_ACCESS_TOKEN` + `MESSENGER_PAGE_ID` valid and not sandbox, outbound uses Graph API (`docs/147`, `src/channels/outbound-sender/index.ts`)
  - ✅ **Line Messaging API real outbound**: When `LINE_CHANNEL_ACCESS_TOKEN` valid and not sandbox, outbound uses push API (`docs/148`, `src/channels/outbound-sender/index.ts`) — **15.7.1 稳定性修订：恢复 LINE_MESSAGING_DISABLED 检查，session 解析返回 null 而非 'unknown'，每轮独立超时，redact 用 split/join**
  - ✅ **Zalo Open API real outbound**: When `ZALO_ACCESS_TOKEN` + `ZALO_OA_ID` valid and not sandbox, outbound uses Open API (`docs/149`, `src/channels/outbound-sender/index.ts`)
  - ✅ **HTTP observability (Phase 16)**: All responses include `X-Request-Id`; optional one-line JSON access log when `CHATFLOW_HTTP_ACCESS_LOG` set (`docs/150`, `src/observability/http-access.ts`, `server.ts`); **HTTP `request_id` = `debug_metadata.request_id`** on all seven `POST /webhooks/*` paths via `createMinimalTraceContext({ httpRequestId })`; access log may include **`phases_ms`** (`prepare_ms`, optional `outbound_send_ms`) from webhook handlers
  - ✅ Optional **handoff notify**: `CHATFLOW_HANDOFF_NOTIFY_URL` (+ optional secret header) → async POST on first transition to `handoff_state` **pending** (**Pro_v1.07.41**)
  - ✅ **SaaS MVP（Phase 22A）**：sql.js SQLite、租户 webhook `GET|POST /webhooks/t/<slug>/<channel>`、Admin API + `public/saas-admin.html`、进程内租户 context + session 隔离 + 每租户 FAQ/凭据；`tenant_settings` 已落库与 Admin 读写，**运行时由 `tenant_settings` 驱动归 Phase 22B**（见 `memory/03`、`docs/175`、`src/saas/*`）
  - ✅ **Phase 22D（主目标）**：租户路径 **POST**（WA/Messenger/Line/Website）验签 **仅用租户 secret**，缺失即 403；租户路径 **GET** hub 校验 **仅用租户 verify token**，缺失即 `tenant_verify_token_missing`；**legacy `/webhooks/*` 不变**。脚本：`verify:tenant-post-signature-boundary`、`verify:tenant-get-verify-boundary`。
  - ✅ **Phase 22E（收口）**：**CI** `tenant-boundary-verify`（依赖 Actions secret `CHATFLOW_SAAS_ADMIN_TOKEN`，未设跳过；fork PR 不跑）；**文档** `docs/175` / `GPT_PLANNER_HANDOFF_BLUEPRINT` / `docs/158` 补齐运维边界与 idle vs hub 语义。
  - ✅ **Phase 23（SaaS MVP Final Closure）— 已关闭**：**多租户 SaaS MVP 交付口径完成** — idle GET **选项 A** 冻结、`tenant_settings` 主控制链 + 矩阵（`docs/175`）、非主链路 send/suppress **covered**、docs/蓝图/memory **aligned**、`faq.fallback_enabled` **partial** 按已知边界冻结。
- Current Completion Point: **Pro_v1.07.67** — **SaaS MVP sealed**；**Phase 24** 聚焦 v1 **认证/RBAC、Postgres、多实例 session/store、凭证加密与审计**（见 **`memory/03`**）。
- Pro Target Channels (product scope, Bryan-locked): **Telegram**, **WhatsApp**, **Facebook Messenger**, **Line**, **Zalo**; architecture must keep an **extension slot** for additional messaging platforms later. **Website live chat** remains part of Pro (already implemented alongside messaging channels).
- Current Channel Boundary (runtime today): **All seven channels live** — unified pipeline; **Telegram** real outbound when token + not sandbox (**optional proxy**); **WhatsApp** real outbound when token + phone number ID + not sandbox; **Messenger** real outbound when token + page ID + not sandbox; **Line** real outbound when token + not sandbox; **Zalo** real outbound when token + OA ID + not sandbox; **Website** real outbound when `WEBSITE_OUTBOUND_URL` configured + not sandbox/disabled; **WhatsApp/Messenger/Line/Website** POST signature validation when secret configured; **Zalo** inbound relies on IP whitelisting (per official docs).
- **Pause Status**: **Not blocked on staging** — 默认门槛：**T0 build + T1 `staging:docker-smoke`**（**`docs/158`** *Default staging ladder*）；公网/T3、Zalo OA、157 B/C 为**可选增强**，不挡合并与后续功能开发
- Next Unique Priority Action: **Phase 24 — SaaS v1 Hardening** — 在 **`memory/03`** 拆包立项（建议方向：租户用户认证/RBAC；Postgres + migration；多实例 session/store；凭证 KMS/轮换/审计）。**MVP 回归**仍：**T0 + T1** + `docs/175`。提交前缀：`feat(phase-24):` · `chore(phase-24):` · `docs(phase-24):`。

- ⚠️ **Phase 22C 后遗留风险**（收口承认，非阻塞）：
  - **历史 session 状态不主动清空**：租户开关变更后，进程内既有 session 不回收，仅影响后续轮次行为边界。
  - ~~**非主链路 suppress / send**~~ **Phase 23 收官审计**：七通道 **用户可见回复** 仅 **`src/webhooks/*` → pipeline → `should_send` → `src/channels/outbound-sender/index.ts`**；**无**绕过 `bot.enabled` 的第二路 channel send。`suppress_reply.enabled` 仅经 **`src/channels/conversation-runtime/policy.ts`** handoff 分支 + env（**`src/config/suppress-reply.ts`**）。**例外**：`src/channels/outbound-sender/mock.ts` 为测试辅助，非生产 webhook 路径；**handoff/lead HTTP notify** 受 **`notify.enabled`** 门控，**不受** `bot.enabled`（设计如此，非 channel 回复）。
  - **FAQ fallback 范围**：当前仅接管 resolver 策略 2/3 与 `planDefaultTurn` 文本回显；**不含** `post_capture` / `capture` 阶段引导文案的 tenant 开关（**MVP 已知边界**，见 **`docs/175`** / **`memory/04`**）。
