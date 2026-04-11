# Project Status

## Phase E — Hosted v1 Go-Live Gate ✅ Overall Closed / Sealed（2026-04-09）

- **状态**：**Phase E overall = closed / sealed** — `docs/internal/phase-e-overall-closeout.md`。**禁止**再扩 **E4** 或挂靠 **Phase E** 名义静默加 **verify** / 改 D-C4C bundle **无** ADR。
- **E1 / E2（a~d）/ E3**：**completed**（承诺范围内）— 入口 `phase-e-hosted-v1-index.md`；签核模板；E2 `phase-e2-hosted-v1-checklist-spec.md`；E3 `phase-e3-hosted-v1-readonly-aggregate-report-spec.md` + 可选只读脚本。
- **设计真源（仍有效）**：`phase-e-hosted-v1-go-live-gate-design.md`。
- **可卖 / 可交付（规程与文档包）**：**100%**。
- **hosted / production-ready v1（具体环境）**：**不**因 closeout 自动达标；须 **矩阵执行 + 书面签核**（主设计 §8）。
- **版本**：**1.7.108 / Pro_v1.07.108**（closeout **不**升 patch）。
- **下一门禁（非 E）**：**E2-e**、**E3 扩面**、其他产品能力 — **须新 phase / 新 Go**。
- **仍冻结**：**D-C3C**；**仍不具备** 自动补偿 / 平台修复器。

## 商业 SaaS 租户后台 UI — 第 1 轮 ✅（2026-04-09）

- **蓝图**：`docs/internal/chatflow-pro-saas-admin-ui-blueprint.md`。
- **落地**：`public/tenant-app.html` — **浅色 App Shell**、主导航 **7 项**（Overview / Inbox / Leads / Knowledge / Channels / Reports / Settings）、**顶栏**（workspace 占位、搜索占位、头像占位）、**API 连接**折叠条；**Overview** 为 **静态示意数据**（A–D 四区）；`/app`、`/app/dashboard` **重定向** `/app/overview`。
- **后端**：**未**改 `src/` 业务逻辑。
- **版本**：**1.7.108**（UI-only，**未**升 patch）。

## 商业 SaaS 租户后台 UI — 第 2 轮 ✅ Settings IA 壳层（2026-04-09）

- **落地**：同一 `public/tenant-app.html` — **`/app/settings`** 为真正首页（Setup 进度条、Advanced 六卡、示意 Recent activity、Quick links）；**Setup**：`/app/settings/setup` 步骤列表 + `/app/settings/setup/{workspace,ai,channels,knowledge,test,golive}` 占位与上/下一步；**Advanced**：`/app/settings/workspace|ai|channels|access|golive|recovery` 标题区 + 说明 + 占位（AI/Channels/Access 链到旧版 `/app/ai`、`/app/channels`、`/app/team`）；侧栏 **Settings** 在任意 `/app/settings/*` 下高亮。
- **数据**：Setup 步骤状态与 activity 均为 **前端 mock**，**未**接租户配置 API。
- **后端**：**仍** **未**改 `src/`。
- **版本**：**1.7.108**（**未**升 patch）。

## 商业 SaaS 租户后台 UI — 第 3 轮 ✅ Channels 向导壳层（2026-04-09）

- **落地**：`public/tenant-app.html` — **`/app/channels`** 为 **接入中心**（状态化六渠道卡片、示意 feed、链到 Settings/Setup；**旧版长表单**收入 `<details>`）；**`/app/settings/channels`** 为 Settings 内 **Channels & Tokens 总览**（同构卡片 + breadcrumb + 回 Setup / 主导航）；**`/app/settings/channels/{website|telegram|…|zalo}?step=0..3`** 统一 **四步向导壳**（overview / credentials / webhook / test 占位）；**`/app/settings/setup/channels`** **replaceState** → **`/app/settings/channels`**；Setup 中 **Connect Channels** 步增加接入中心双链；侧栏 **Channels** 在 **`/app/channels`** 与 **`/app/settings/channels*`** 均高亮。
- **数据**：卡片状态优先 **GET `/channels` + validations**（只读）；失败时横幅提示 + 默认未连接；向导 **无**真实提交；向导第 4 步测试为 **占位**。
- **后端**：**未**改 `src/`。
- **版本**：**1.7.108**（**未**升 patch）。

## 商业 SaaS 租户后台 UI — 第 4 轮 ✅ Inbox 工作台壳层（2026-04-09）

- **落地**：`public/tenant-app.html` — **`/app/inbox`** 为 **三栏工作台**：顶栏 **搜索 + 状态/渠道/负责人筛选 + 时间占位 + 保存视图（alert）**；**左** 会话列表（渠道 pill、状态标签、预览、时间、未读点）；**中** 标题区 + **用户/AI/系统** 消息时间线骨架 + handoff 横幅占位 + **禁用回复框**；**右** Contact/Lead 摘要、Channel 链（接入中心/Settings）、Owner/Handoff 占位、Quick actions（Leads/Knowledge/Handoff/Mark status/Reports，**无**真实写入）。**空列表 / 无匹配 / 未选中** 三种空态。列表数据优先 **GET `/conversations`**，失败时用 **MOCK_INBOX_CONVERSATIONS** 并横幅说明。
- **后端**：**未**改 `src/`；已移除 Inbox 内原 **Convert/Resolve** 直连 API（改占位 alert）。
- **版本**：**1.7.108**（**未**升 patch）。

## 商业 SaaS 租户后台 UI — 第 5 轮 ✅ Leads 中心壳层（2026-04-09）

- **落地**：`public/tenant-app.html` — **`/app/leads`** **线索工作台**：**KPI**（总计 / 今日新增粗算 / 待跟进池 + **Inbox** 链）；工具条 **搜索、状态、渠道、负责人、时间占位、保存视图**；**左** 卡片列表（摘要、时间、渠道 pill、状态标签、**优先级 mock**）；**中** 信息格、**来源会话/渠道**、摘要、**跟进时间线壳**、**禁用备注**；**右** Contact、Channel、Owner/Handoff、Related conversation、Quick actions（Inbox/Knowledge/follow-up·占位/escalate·占位/Reports）。**空列表 / 无匹配 / 未选** 三态。数据 **GET `/leads`** 或 **MOCK_LEADS**。
- **后端**：**未**改 `src/`；原 **to qualified** 表格操作 **已移除**（改占位）。
- **版本**：**1.7.108**（**未**升 patch）。
- **下一手**：已由 **第 6 轮 Reports** 承接；后续见 **第 6 轮** 节与 `memory/03`。

## 商业 SaaS 租户后台 UI — 第 6 轮 ✅ Reports 管理视角壳层（2026-04-09）

- **落地**：`public/tenant-app.html` — **`/app/reports`** 为 **报表中心骨架**：顶栏 **时间范围**（7d→`last7d`、today、all_time 接 API；30d/90d/custom **占位** + 说明）、**渠道 / Owner / Tenant 占位**、**导出 / 保存视图**（alert）；**二级分组** `/app/reports`（Overview）与 `/app/reports/{conversations|leads|handoff|channels|governance}`（分组壳 + 说明面板）；**6 张 KPI**（会话、新线索、handoff、qualified、channel health、activity mock）；**Trend / Breakdown / Exceptions** 三区（趋势条与渠道分布 **示意**）；KPI 与异常行 **链** Overview / Inbox / Leads / Channels。**侧栏 Reports** 在 **`/app/reports*`** 高亮；非法子路径 **404** 回链。
- **数据**：优先 **GET `/reports/summary?range=`**（与后端 `today|last7d|all_time` 对齐）；失败或占位范围时用 **MOCK_REPORT_CARDS** + 横幅。
- **后端**：**未**改 `src/`。
- **版本**：**1.7.108**（**未**升 patch）。
- **下一手**：已由 **第 7 轮 Knowledge** 承接；后续见 **第 7 轮** 节与 `memory/03`。

## 商业 SaaS 租户后台 UI — 第 7 轮 ✅ Knowledge 阅读 / 管理壳层（2026-04-09）

- **落地**：`public/tenant-app.html` — **`/app/knowledge`** 为 **内容中心壳层**：顶部工具条（搜索、分类、状态、语言、保存视图占位）；主体三栏（左列表 / 中阅读区 / 右上下文与动作）；统一 **空状态 / 无结果 / 未选中**。列表采用内容卡片式扫描（标题、类型、状态、分类、语言、更新时间、预览），并支持筛选联动。
- **详情体验**：先做阅读主线（标题区、正文区、关键信息摘要、状态提示、更新时间、来源/分类/语言占位、编辑/发布占位）。
- **右侧壳层**：Status / Type / Category / Language / Related usage + Quick actions（Inbox / Leads / Settings / Create / Mark review）。
- **数据**：优先 **GET `/knowledge`** 读取；失败时回退 **MOCK_KNOWLEDGE** 并横幅提示；本轮移除页面内知识写入、导入、启停按钮。
- **叙事闭环**：Knowledge 与 Inbox / Leads / Settings / Reports 已接上占位跳转。
- **后端**：**未**改 `src/`。
- **版本**：**1.7.108**（**未**升 patch）。
- **下一手**：已由 **第 8 轮统一列表页细化** 承接；后续见 **第 8 轮** 节与 `memory/03`。

## 商业 SaaS 租户后台 UI — 第 8 轮 ✅ 统一列表页细化（2026-04-09）

- **落地**：`public/tenant-app.html` — 统一 Inbox / Leads / Knowledge 的工作台体验层：新增 `wb-*` 通用样式（toolbar actions、input、chip、banner、empty、loading skeleton）；三页工具条统一搜索/筛选/保存视图/右侧动作位；列表密度、时间位、标签位、选中与 hover 反馈统一；详情头与右侧栏结构统一。
- **状态词典**：引入统一视觉语义 `st-info / st-progress / st-success / st-warn / st-muted`，并用于 Inbox/Leads/Knowledge 状态标签（不改业务状态语义，仅统一视觉语言）。
- **页面状态统一**：三页补 Loading 壳、API 失败 banner 统一 fallback mock 文案、无结果/未选中 empty 文案统一。
- **后端**：**未**改 `src/`。
- **版本**：**1.7.108**（**未**升 patch）。
- **下一手**：已由 **第 9 轮 Overview / Settings polish** 承接；后续见 **第 9 轮** 节与 `memory/03`。

## 商业 SaaS 租户后台 UI — 第 9 轮 ✅ polish Overview / Settings（2026-04-09）

- **落地**：`public/tenant-app.html` — 将第 8 轮统一语言扩展到 Overview / Settings / Setup / Advanced：新增 `ov-*`、`stg-*` 样式层并复用 `wb-*` 与 `st-*`。
- **Overview polish**：状态条、核心 KPI 卡、待办/事件区、快速操作区统一为同一语义（banner/chip/card/action/empty）；新增 loading skeleton 壳与统一提示文案。
- **Settings polish**：Settings 首页、Setup hub、Setup detail、Advanced shell 全部接入统一 banner/status/action 语言；步骤状态色改为统一词典；操作区密度与层级统一。
- **后端**：**未**改 `src/`。
- **版本**：**1.7.108**（**未**升 patch）。
- **下一手**：建议进入最终 UI 收口轮（跨全主面微调 + 文案一致性总校）。

## 商业 SaaS 租户后台 UI — 最终收口轮 ✅ 全主面一致性总校（2026-04-09）

- **落地**：`public/tenant-app.html` — 对 **Overview / Settings / Channels / Inbox / Leads / Knowledge / Reports** 做最终一致性收口：统一文案与动作命名（Open / Review / Configure / Test / Mark follow-up 等）、统一 fallback banner 文案、统一占位 alert 语气、统一状态 chip 语义边界（`st-*`）。
- **结构与间距总校**：统一标题区、section 标题、卡片层级、工具条动作区、列表项密度、侧栏动作区、loading/empty/fallback 布局方式；确保主面切换不再出现“多套系统”割裂感。
- **已知保留欠账**：仍存在“占位动作未接真实写入”与 Reports 局部细节可继续微调（不影响本轮一阶段收口判定）。
- **后端**：**未**改 `src/`。
- **版本**：**1.7.108**（**未**升 patch）。
- **下一手**：UI 第一阶段可关闭；后续建议转入真实写入/发布链路接线或新 phase。

## 商业 SaaS 后台 UX 第二阶段（设计真源）✅（2026-04-09）

- **阶段定位**：UI 第一阶段收口后的新阶段，目标从“页面统一”转向“首次配置到日常运营可走通”。
- **设计真源**：`docs/internal/chatflow-pro-saas-admin-ux-phase2-design-source.md`。
- **内容覆盖**：双主线（Onboarding / Daily Ops）、逐步六要素（目标/入口/输入/成功/失败/下一步）、P0/P1/P2 落地分级、阻塞点地图、关键问题定稿回答、实现顺序建议。
- **状态**：设计已收口，已放行 **P0 实现**。
- **版本**：**1.7.108**（纯设计，不升 patch）。

## 商业 SaaS 后台 UX 第二阶段（P0 实现）✅（2026-04-09）

- **实现范围（仅 P0）**：`public/tenant-app.html`。
  - Setup 六步最小闭环：Workspace 保存、AI 保存+测试、Channels 连通后测试、Knowledge 发布、Test 结果触发、Go-live 检查+最小 signoff 记录。
  - Overview / Settings / Setup 真实联动：通过 `/overview`、`/settings`、`/go-live-check/latest` 同步展示真实完成度与阻塞状态。
  - Daily Ops 最小动作闭环：Inbox（resolve/reopen + handoff 提交）、Leads（status 推进 + assign owner），均有成功/失败反馈并刷新状态。
- **动作闭环特征**：每个 P0 动作具备入口、执行、成功反馈、失败反馈、状态可追溯（通过现有 admin API 与 activity/test/go-live 记录）。
- **边界**：本轮**不做 P1/P2**，不扩新页面，不改后端主逻辑，不升版本。
- **版本**：**1.7.108**（实现完成后再评估是否升 1.7.109）。

## 商业 SaaS 后台 UX 第二阶段（P0 真实租户冒烟 + P1 设计真源）✅（2026-04-09）

- **冒烟范围（只验证）**：Workspace 保存、AI 保存+测试、Channel test、Knowledge 发布、Go-live check、Inbox 动作、Leads 动作。
- **真实通过**（实租户 + admin API）：Workspace / AI save+test / Website channel test / Knowledge publish / Go-live run / Inbox resolve+reopen / Leads assign+follow-up。
- **真实阻塞**：
  1. **Postgres 兼容阻塞（接口+环境）**：创建租户触发 `INSERT OR REPLACE` SQL 语法错误并导致进程退出（postgres 不兼容）。
  2. **Webhook 门禁阻塞（配置）**：tenant webhook 缺少租户签名 secret 时返回 `tenant_secret_missing`（403）。
  3. **会话生成链路阻塞（数据流）**：website webhook 200 但未形成 conversations，导致 Inbox/Leads 路径需通过 seed 才可验证。
- **P1 设计真源**：`docs/internal/chatflow-pro-saas-admin-ux-phase2-p1-design-source.md`（仅设计，未实现）。
- **版本**：保持 **1.7.108**（本轮不升版）。

## 商业 SaaS 后台 UX 第二阶段（P0 真实阻塞修复）✅（2026-04-09）

- **阻塞 A（Postgres 建租户）**：已修复 `createTenant` 的 sqlite 方言写法，Postgres 下建租户 201 通过且进程不再崩溃。
- **阻塞 B（tenant_secret_missing 引导）**：已在 tenant webhook 403 返回中补充可操作 guidance（缺少 credential key、配置 API/UI、下一步测试 API、下一步动作）。
- **阻塞 C（website 入站 -> 可运营数据链）**：已在 website webhook 成功路径补 conversation/message 持久化，返回 `persistence` 诊断信息；入站后 Inbox 可见数据并可继续 Leads 链路动作。
- **二次实租户冒烟（Postgres）**：建 tenant、配 AI、配 secret、打 website webhook、看到 Inbox/Leads 数据、执行最小动作（resolve/reopen/assign/follow-up）全部 200/201 通过。
- **版本**：仍为 **1.7.108**（修复完成，待你确认是否建议升到 1.7.109）。

## 商业 SaaS 后台 UX 第二阶段（P0 稳定观察 + P1 放行前确认）✅（2026-04-09）

- **稳定观察**：Postgres hosted 路径再做 1 轮完整重复冒烟，关键链路全部通过（tenant_create/workspace/ai/secret/channel/webhook/inbox/leads/action）。
- **波动观察**：本轮未出现偶发失败、状态不同步或二次运行漂移。
- **残留清点**：
  - **已确认安全（P0 主链）**：tenant create、settings merge、runtime health、website domain、activity/log、conversation/lead/action 链路的 Postgres 路径可用。
  - **仍有风险（非本轮主链）**：`repository.ts` 仍存在部分 sqljs-only 路径（如 FAQ 批量替换/knowledge upsert 等使用 `getSaaSDatabase`）；短期不影响当前 P0 最小链路，但影响 P1 放量安全边界。
- **结论**：可准备放行 P1，但建议先补一轮“P1 高概率写路径 adapter 化”再正式开工。

## 商业 SaaS 后台 UX 第二阶段（P1 前置 residual 预修）✅（2026-04-09）

- **范围锁定完成**：仅预修 knowledge / faq / platform settings 高概率写路径。
- **预修点**：
  - `replaceTenantFaqEntries`：改为 adapter 写入，不再依赖 sqljs-only `db.run`。
  - `upsertTenantKnowledgeEntries`：改为 adapter 查询+写入，去除 sqljs-only `stmtGet/db.run`。
  - `setTenantKnowledgeActiveState`：改为 adapter 更新。
  - `upsertPlatformSettings`：改为 adapter 写入，并按 driver 区分 postgres `ON CONFLICT` 与 sqlite `INSERT OR REPLACE`。
- **最小 hosted 验证（Postgres）**：knowledge create/disable/enable、FAQ put、platform settings put/get 全部 200/201 通过。
- **结论**：P1 高概率写路径 residual 已降到可控，可进入 P1 实现放行评估。

## 商业 SaaS 后台 UX 第二阶段（P1 首批实现）✅（2026-04-09）

- **实现范围（首批，仅三块）**：`public/tenant-app.html`。
  1. Reports 关键下钻：`Pending handoff -> Inbox`、`New leads -> Leads`、`Handoff backlog -> Inbox worklist`，并带 `status/src` 上下文参数。
  2. Knowledge review/publish 核心链：`Draft -> Needs review -> Published` 最小状态推进，含失败反馈与只读角色限制提示（readonly 禁止 publish）。
  3. Setup/Overview 状态深化：增加 step-level reason 与 blocker 列表，Overview/Setup Hub 对齐显示“卡在哪一步”。
- **可见变化**：
  - Reports 点击后进入目标页面并自动套用筛选；
  - Knowledge 详情侧可执行状态动作，发布后状态和可见性即时变化；
  - Overview 显示当前 blockers，不再仅显示粗粒度完成率。
- **边界**：本轮未扩 P1 全量能力（无复杂图表、无富文本、无导出、无新页面）。
- **版本**：保持 **1.7.108**（本轮不升版）。

## 商业 SaaS 后台 UX 第二阶段（P1 首批短回归确认）✅（2026-04-09）

- **短回归范围**：
  1. Reports 下钻（Pending/Open -> Inbox、New leads -> Leads、Handoff backlog -> Inbox worklist）；
  2. Knowledge 状态链（Draft -> Needs review -> Published -> Needs review -> Published）；
  3. Setup/Overview 状态一致性（step reason + blockers）。
- **结果**：
  - Reports 下钻参数与来源提示正常，目标页筛选可正确套用；
  - Knowledge 状态推进与失败提示正常，正常角色未被误伤（写入通过）；
  - Setup Hub / Overview 状态口径一致，blocker 原因可解释，无明显冲突。
- **真实租户复核（Postgres）**：建租户、知识状态推进、reports summary、website webhook、inbox/leads 动作链全部通过（核心接口均 200/201）。
- **门禁结论**：可进入 hosted v1 100% 门禁评审，但建议先补服务端 publish 权限校验（当前 readonly 限制主要在前端提示层）。

## Hosted v1 最终门禁前补强（knowledge publish 服务端硬校验）✅（2026-04-09）

- **本轮目标完成**：knowledge review/publish 状态推进权限由“前端提示限制”为主，提升为“服务端硬拒绝”。
- **服务端改动**：
  - `src/saas/admin-routes.ts`：对 knowledge 状态推进接口增加 readonly 硬拒绝，返回 `knowledge_transition_forbidden` + `message` + `guidance`。
  - `src/saas/admin-authorization.ts`：放行 readonly 到目标 knowledge 状态路由，再由业务层做明确拒绝与可解释错误。
- **前端对齐**：`public/tenant-app.html` API 错误优先展示服务端 `message`（其次 `error`），避免“看不懂的失败”。
- **实租户门禁复核**：
  - 正常角色（tenant_admin）：knowledge create/review/publish/back_review 全部通过；
  - readonly 角色：publish/review 均被服务端 403 明确拒绝；
  - overview/setup/reports/go-live 接口复核通过。
- **结论**：hosted / production-ready v1 的最后权限争议点已消除，可进入 **100%** 签核。

## Phase D-C4 — 总线 ✅ Closed / Sealed（2026-04-09）

- **状态**：**Phase D-C4 overall = closed** — Bryan 决策 **不再**立项新的 D-C4 后续子线；**禁止**以 D-C4D / D-C4E 等名义在 **未**新 ADR 下扩面。
- **Closeout 真源**：`docs/internal/d-c4-overall-closeout.md`。
- **子切片（均为 completed）**：
  - **D-C4A** — 只读 recovery pack（锚 **1.7.106**）：`d-c4a-recovery-readonly-check-spec.md`、`saas:recovery:readonly-check`、`verify:d-c4a-recovery-readonly-check`。
  - **D-C4B** — B1+B2 决策表 / 交付演练 / runbook §6 / SOP（锚 **1.7.107**）。
  - **D-C4C** — C1+C2 只读 governance bundle + CI 门禁文档（锚 **1.7.108**）：`verify:d-c4c-readonly-governance-bundle`。
- **当前仓库版本**：**1.7.108 / Pro_v1.07.108**（closeout **不**升 patch）。
- **设计长文**（条款保留）：`docs/internal/d-c4-recovery-consistency-design.md`；**评审包**：`d-c4-design-review-package.md`。
- **与 D-C3**：**sealed**；**未改** D-C3A/D-C3B 源码语义（D-C4 **不**替代 D-C3B）。
- **后续工作**：**Phase E overall closed**（见上节）；**不得**再以 D-C 名义扩面。
- **仍冻结**：**D-C3C**；**仍不具备** 自动补偿 / 恢复写修复器 / 批量恢复 / 半自动闭合（见 closeout §2）。

## Phase D-C3 — 正式关闭 ✅ Sealed（2026-04-09）

- **状态**：**子线在仓库边界内正式关闭** — 只读定位、单键人工闭环、审计、runbook、acceptance、`verify:d-c3-closeout`、最低治理标准均已交付；**不再沿 D-C3 扩** 自动补偿 / 批量 / UI。
- **版本**：**1.7.105**（closeout patch）。
- **真源**：`docs/internal/d-c3-closeout.md`；`d-c3-operator-runbook.md`；`d-c3-acceptance-checklist.md`。
- **验证**：`npm run verify:d-c3-closeout`。
- **D-C3C**：**仍冻结**；**不等于** D-C4。

## Phase D-C3B — 单键人工闭环 ✅ 已落地（2026-04-09）

- **当前阶段**：**Phase D-C3** 子切片 **D-C3B** — **受控单键人工修复**（默认 dry-run；apply 需 env + 工单二次确认 + 审计表）；**禁止**未立项进入 **D-C3C**（自动补偿）。
- **版本锚点历史**：1.7.104。
- **交付摘要**：
  1. 设计真源：`docs/internal/d-c3b-manual-repair-spec.md`。
  2. 实现：`src/saas/dedupe-manual-repair.ts` — `close_as_completed`（outbound/notify CAS `version+1`）与 `release_for_retry`（单键 DELETE，需 `ack` + `downstream_evidence`）；**仅 Postgres** 公共 API；`executeDedupeManualRepairOnAdapter` 供验证/sqljs 隔离测。
  3. 审计表：`pg_0015_phasedc3b_dedupe_manual_repair_audit.sql` → `dedupe_manual_repair_audit_events`（迁移需 bootstrap/apply）。
  4. CLI：`npm run saas:dedupe:manual-repair -- --dry-run ...` / `--apply` + `CHATFLOW_DEDUPE_MANUAL_REPAIR_ENABLED=1` + `--confirm-ticket=`。
  5. 验证：`npm run verify:d-c3b-manual-repair`（build 后；含 sqljs 对 `runDedupeManualRepair` 拒绝 + OnAdapter e2e）。
- **边界**：**非** 批量修复、**非** UI、**非** 公开 Admin API、**非** Redis/队列/cron、**非** 自动重发；`close_as_completed` **不调用** notify/outbound HTTP。

## Phase D-C3A — 只读对账层 ✅ 已落地（2026-04-09）

- **状态**：已完成；与 D-C3B 配套：先 `saas:dedupe:consistency:report` 再人工修复。
- **版本锚点历史**：1.7.103。
- **要点**：`docs/internal/d-c3a-readonly-recon-spec.md`；`src/saas/dedupe-consistency-readonly.ts`；`npm run saas:dedupe:consistency:report`；`verify:d-c3a-readonly-recon`；G1/G2/G3 DB-only 启发式，只读。

## Phase D-C2C1 — dedupe 保留清理第一刀 ✅ 已归档（2026-04-09）

- **状态**：**Completed & Archived**（见 `memory/02`）；**不进入 D-C2C2**（本轮未扩 cleanup 其它线）。

## Phase D-C2C — 已启动（设计首刀 · 2026-04-09）

- **注**：**D-C2C1** 已归档；**D-C3 已 sealed**；**Phase D-C4 overall closed**；**Phase E** 设计见 **`memory/01` 顶部**；详情 **`memory/03`**。
- **当前阶段**：**Phase D-C2C（数据保留 / cleanup / 表与文件膨胀治理）** — 以 **规格与分包顺序** 为主。**禁止**无规格并行大实现、**禁止**回头扩已关闭 **D-C3**、**禁止**把 D-C2C 做成泛 backlog。
- **上一子阶段**：**Phase D-C2B（轮换 / break-glass / 治理审计闭合）— 已正式收口并已关闭**。
- **当前版本**：**1.7.101 / Pro_v1.07.101**（D-C2B 交付已覆盖；**不**为纯收口再升 patch）。
- **D-C2B 正式收口结论**（真源）：
  1. **租户凭据单键轮换最小闭环**已成立：`rotateTenantCredentialIfExpected`、`tenant_credential_rotation_events`（指纹列）；CLI `rotate:tenant-credential:expected`；`verify:d-c2b1-credential-rotation`。
  2. **break-glass TTL + 门禁**已成立：`CHATFLOW_BREAK_GLASS_ACTIVE` + `CHATFLOW_BREAK_GLASS_EXPIRES_AT`；过期 **403** `break_glass_ttl_expired`；`break_glass_audit_events`；`verify:d-c2b2-break-glass-ttl`。
  3. **governance audit closure**已成立：`governance-audit-closure.ts` → D-C1 `writeStructuredLog`（`type: governance_audit`，`governance_closure_version: d-c2b3-v1`）；与 DB 审计 **双轨**（结构化日志 opt-in：`CHATFLOW_STRUCTURED_RUNTIME_LOG`）。
  4. **verify bundle**已成立：`npm run verify:d-c2b3-governance-bundle`（`build` + B1 + B2 + closure）；单测 `verify:d-c2b3-governance-closure`。
  5. **明文 secret/token 不落审计与治理日志**：rotation / break-glass DB 行与 `governance_audit` 行均 **指纹或元数据**；逻辑键名用 `rotation_key_name` 避免 D-C1 redact 误伤。
  6. **D-C2B 已关闭**：**禁止**在 D-C2B 名义下继续堆轮换/break-glass/治理闭合扩面；增量归 **D-C2C** 或 **新开 ADR**。
  7. **下一阶段**：**D-C2C** — dedupe / 三层 state / 平台审计与文件 / 备份 **保留与 cleanup**（见本轮设计输出与 `memory/03`）。
- **D-C2A 收口**（仍真，摘要）：`cf1:` at-rest、迁移、zero-plaintext verify — 见 `memory/02`；**D-C2A 已封**。
- **D-C1 收口结论**（仍真，摘要）：结构化日志 + ops-alert + platform-audit + `verify:d-c1-*`；**D-C1 已封**，勿再堆观测面。

## Phase D-B 主线正式关闭（2026-04-09）

- 当前阶段：**Phase D-B（托管化）主目标已完成并收口**；**D-B1 / D-B2 / D-B3 均已关闭**。
- 当前版本：**1.7.93 / Pro_v1.07.93**。
- **D-B3 正式收口**：
  1. **inbound dedupe** 已成立（`pg_0010`、`tenant_inbound_dedupe`、webhook `guardInboundDedupe`）。
  2. **outbound dedupe** 已成立（`pg_0011`、`tenant_outbound_dedupe`、outbound-sender 统一包装）。
  3. **notify dedupe** 已成立（`pg_0012`、`tenant_notify_dedupe`、lead/handoff notify 出口）。
  4. **统一返回语义**：duplicate completed → **200**；duplicate processing → **202**；完成阶段 **CAS 冲突 → 409**（outbound/notify）；inbound **完成写回无 `version` CAS**（与另两线边界不同，属既定设计）。
  5. **duplicate 不重复副作用**：`scripts/verify-dedupe-d-b3-closeout.mjs`；`npm run verify:dedupe-d-b3-closeout`。
  6. **下一阶段不属于 D-B**：**Phase D-C / 生产完备化**（安全、观测告警、配额限流深化、补偿策略等）— **禁止**将 D-C 目标并入 D-B 收口。
- **真源提醒**：下文历史 Phase 25/24 等段落若仍写「默认 live = sqljs」，以 **D-B1 收口**与本节为准：**默认托管 live = Postgres**；`sqljs` 仅为 dev/单机/compat。

## Phase D-B3 — 已关闭（历史 · 2026-04-08）

- D-B2 关闭结论（仍为真）：
  - session / processing / delivery 三层状态已成立
  - 三层均已完成：表 + repository + runtime 最小接线
  - 三层 `version` CAS 冲突硬判定成立（stale -> `cas_conflict`）
  - tenant + postgres 路径未回流 in-memory 双真源（store size=0）
  - D-B2 已正式关闭
  - D-B3 三线幂等已交付；**随 D-B 主线一并关闭**

## Phase D-B2 启动（2026-04-08）

- 当前阶段：**Phase D-B2（多实例状态外置）已启动，首刀已开**。
- 当前版本：**1.7.91 / Pro_v1.07.91**（D-B1 关闭后升 patch）。
- D-B1 关闭结论已固化：
  - 默认 live = `postgres` 已成立
  - `sqljs` 已降级为开发/单机/compat（显式开关）
  - rollback 真执行链已通过（含真实 `postgres_restore`）
  - backup/restore 最小链已通过（restore-verify PASS）
  - `deployment-info.version` / `state.current_version` / `state.stable_version` 已对齐
- D-B2 首刀（仅 session state）：
  - 新增 PG migration：`pg_0007_phasedb2_session_state.sql`
  - 新增 `tenant_session_state` 表（含 `version` CAS 字段）
  - 新增 `src/saas/session-state-repository.ts`（读取 + CAS upsert 边界）
  - 未并行实现 processing/delivery state，未进入 D-B3 幂等扩面

## Phase D-B1 启动（2026-04-08）

- 状态：**Phase D-B1（Postgres 默认链切换）已启动并完成首轮落地**。
- 本轮范围：仅 D-B1；**未并行** D-B2/D-B3（无 session 外置表、无幂等表、无并发治理扩面）。
- 已落地：
  - 默认 driver 改为 `postgres`（`CHATFLOW_SAAS_DB_DRIVER` 未设置时默认 `postgres`）
  - 启动 hosted readiness gate：PG 不可用/配置不合法/schema&migration 门禁不满足 -> fail fast
  - `/saas/v1/health` 改为 readiness 口径（不就绪返回 503 + reasons）
  - 交付脚本切换到 PG 主口径：install/upgrade/rollback/backup/restore/health verify
  - `sqljs` 降级为 compat（需显式 `CHATFLOW_SAAS_DB_DRIVER=sqljs` + `CHATFLOW_SAAS_SQLJS_COMPAT=1`）
- 严格边界：单真源口径锁定为 Postgres 默认 live；sqljs 仅开发/单机/兼容。

## Phase C 正式关闭（2026-04-08）

- 状态：**Phase C（运营工作流层 MVP）已正式关闭**。
- 验收：`scripts/phasec-acceptance-curl.ps1` 使用有效 `ADMIN_TOKEN + TENANT_ID` 复跑通过。
- 最终结论：`[PASS] Phase C acceptance checks passed.`
- 收口边界：按 Phase C 真源与固定点收口，不继续扩功能。

## Phase 25 正式关闭（2026-04-07）

- 当前阶段状态：**Phase 25（已正式关闭 / sealed）**。
- 口径保留：默认 live 路径仍为 `sqljs`（未切到 `postgres`）。
- 受控结论：受控 Postgres 闭环已达 `go`（apply 成功、ledger ready、受控 go-no-go=go）。
- 严格边界：受控 `go` **不等于** 默认链/整体已 GO。
- 当前版本保持：`1.7.90 / Pro_v1.07.90`。

## Phase 25 受控 PG 闭环证据收口（2026-04-07）

- 受控闭环结果：`migration apply` 成功、`saas_schema_migrations` `ledger` 为 `ready`、受控 `go-no-go` 为 `go`。
- 口径保留：受控闭环 `go` 仅代表受控目标环境门禁满足，**不等于默认链/整体已 GO**。
- 默认 live 路径不变：仍为 `sqljs`（默认环境未切换 `postgres`）。
- 版本/Phase 不变：`1.7.90 / Pro_v1.07.90`，当前 Phase 仍为 `25`。

## Phase 25 收口提交（本组）

- 收口目标：凭据读取分流、`getTenantCredentials()` 兼容壳收敛、`repository.ts` 入口职责文档化/弃用标注、`verify:tenant-credentials-entrypoint-boundary`。
- 本组状态：已完成并通过最小验证（`build`、`verify:tenant-credentials-entrypoint-boundary`、`verify:saas-db-postgres-go-no-go`）。
- 版本保持：`1.7.90 / Pro_v1.07.90`（未升 patch）。

## 战报固化（2026-04-07 — 下一聊天室）

| 项 | 值 |
|----|-----|
| **package.json / Pro** | **1.7.90** / **Pro_v1.07.90**（以 `package.json` 为准） |
| **当前 Phase** | **Phase 25**（由 Phase 24 强化收口阶段正式关闭后切换） |
| **子里程碑** | **Auth-RBAC（1A–1J）** ✅；**Postgres Foundation（2A–2M）** ✅ checkpoint；**Postgres runtime 底座切片** ✅；**Postgres `saas_schema_migrations` ledger persistence** ✅；**migration execution wired** ✅；**controlled reachability stabilization** ✅；**tenant_settings 单一只读入口已 adapter 化** ✅；**runtime_wired 在受控前置满足时已升级为硬门禁** ✅（前置不足仍 skip）；**受控 PG 实测脚本已补齐且不属于默认链** ✅（默认链稳定性未受影响）；**Phase 24 收官证据材料已齐备** ✅；**Phase 24 收官签核记录已归档并入库** ✅（`docs/181`，默认链 / 受控链 / `overall_go_not_implied` 复核口径固化）；**Phase 25 首刀已完成：`listTenants()` 只读 adapter 化** ✅（`getTenantBySlug()` 因进入 tenant webhook 运行时链暂缓）。**默认 SaaS DB live 路径仍为 sqljs**（**未**切换 Postgres）；`settings_json` 坏 JSON/非对象/缺失仍兜底 `{}`；**空表/可读 ≠ migration 已应用**；**默认 session 仍 in-memory**；**仍非** MI-ready、**无** Redis。**Phase 24 已正式关闭（强化收口阶段）**；整体 `evaluatePostgresGoNoGo()` 仍为 `NO_GO`（以完整门禁为准）。下一：见 `memory/03`。 |
| **已关闭主线** | **Phase 23 — SaaS MVP Final Closure** ✅；**SaaS MVP 交付口径 = 完成**（非「未完 MVP」） |
| **本轮 git（已 push `main`）** | 以 `git log origin/main` 为准；含 **controlled reachability stabilization** `db0e024`、**migration execution wired** `c142da3`、**Postgres ledger persistence** `22ffc2d`、**Postgres Pool/adapter 切片** `0b540f4`、**3C** `30bdc57`、**3B** `9f76785` 等。 |
| **push** | **success**（远端与本地一致以 `git log` 为准） |
| **下一阶段建议** | **3C 已交付**；**Postgres Pool/adapter 最小片已交付**（**仍 `NO_GO`**）。**下一** 以 **`docs/177` Postgres 执行线余下切口** 为主缺口 — 见 **`memory/03`**；**不** 在本行立项 Redis/外置队列。 |
| **新发现风险（本轮）** | 无新的 P0；**Postgres 线**见 `memory/04` 新增条目。 |
| **已知边界** | **冻结**：idle GET 200（选项 A）、`faq.fallback_enabled` partial、slug/idle 信息面（MVP 接受）。**待 Phase 24**：明文凭证、单实例 session、**sql.js→Postgres（2A+）** |

---

- Project Name: ChatFlow Pro
- Current Phase: **Phase 25**（Phase 24 强化收口阶段已关闭）。**Phase 23 — SaaS MVP Final Closure** ✅ **已关闭**；Phase **22（22A–22E）** ✅。
- Current Version: **Pro_v1.07.90** (package.json: **1.7.90**；**SaaS MVP 口径已完成**；**3B** + **3C** 同上；**SaaS DB 默认仍为 sqljs**，**Pool + Postgres adapter 最小接线已落地**（**runtime_wired** 前进一步，**整体 Postgres `go/no-go` 仍为 `NO_GO`**)；**session 仍 in-memory**；**非** MI-ready)
- Execution Root: C:\AI_WORKSPACE\Chatflow\ChatFlow_Pro
- Current Project State: 
  - ✅ **Seven-route webhook baseline**: Website, Telegram, WhatsApp, Messenger, Line, Zalo (`POST /webhooks/*` + **`GET /webhooks/*`** verification per docs/141)
  - ✅ Lead capture complete flow: detection → cross-turn merging → file persistence → i18n prompts
  - ✅ Optional **lead notify**: `CHATFLOW_LEAD_NOTIFY_URL` (+ optional secret header) → async POST on first JSONL persist (**Pro_v1.07.39**)
  - ✅ FAQ integration: multilingual matching (4 languages), language priority, 20 entries across 5 topics
  - ✅ Intent dispatch system: 4 intent types, 4 dispatch stages, smart routing between FAQ/lead
  - ✅ Infrastructure: in-memory session store (1000 cap, 24h TTL) behind **`SessionStore` / `getSessionStore()`**（**3B**；**非** multi-instance），JSONL rotation with cleanup (max 5 files, 50MB total)
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
- Current Completion Point: **Pro_v1.07.90** — **SaaS MVP sealed**；**包 3B** ✅；**包 3C** ✅；**Postgres runtime 底座切片** ✅；**Postgres `saas_schema_migrations` ledger persistence** ✅；**migration execution wired** ✅；**controlled reachability stabilization** ✅（默认 `NO_GO`、受控可达、`overall_go_not_implied`；**默认 live DB 仍为 sqljs**）；**Postgres 整体** 仍 **`no_go`**（以当前 go/no-go 门禁为准）。
- Pro Target Channels (product scope, Bryan-locked): **Telegram**, **WhatsApp**, **Facebook Messenger**, **Line**, **Zalo**; architecture must keep an **extension slot** for additional messaging platforms later. **Website live chat** remains part of Pro (already implemented alongside messaging channels).
- Current Channel Boundary (runtime today): **All seven channels live** — unified pipeline; **Telegram** real outbound when token + not sandbox (**optional proxy**); **WhatsApp** real outbound when token + phone number ID + not sandbox; **Messenger** real outbound when token + page ID + not sandbox; **Line** real outbound when token + not sandbox; **Zalo** real outbound when token + OA ID + not sandbox; **Website** real outbound when `WEBSITE_OUTBOUND_URL` configured + not sandbox/disabled; **WhatsApp/Messenger/Line/Website** POST signature validation when secret configured; **Zalo** inbound relies on IP whitelisting (per official docs).
- **Pause Status**: **Not blocked on staging** — 默认门槛：**T0 build + T1 `staging:docker-smoke`**（**`docs/158`** *Default staging ladder*）；公网/T3、Zalo OA、157 B/C 为**可选增强**，不挡合并与后续功能开发
- Next Unique Priority Action: **Phase 24 — Postgres 执行线**（**`docs/177`**；下一最小切口见 **`memory/03` 顶栏 / 本节 Postgres 段**，**未**预设已开工）；**仍 `NO_GO`**。**MVP 回归**：**T0 + T1** + `docs/175` + **`verify:phase24-3c-jsonl-notify-contract`**。提交前缀：`feat(phase-24):` · `chore(phase-24):` · `docs(phase-24):`。

- ⚠️ **Phase 22C 后遗留风险**（收口承认，非阻塞）：
  - **历史 session 状态不主动清空**：租户开关变更后，进程内既有 session 不回收，仅影响后续轮次行为边界。
  - ~~**非主链路 suppress / send**~~ **Phase 23 收官审计**：七通道 **用户可见回复** 仅 **`src/webhooks/*` → pipeline → `should_send` → `src/channels/outbound-sender/index.ts`**；**无**绕过 `bot.enabled` 的第二路 channel send。`suppress_reply.enabled` 仅经 **`src/channels/conversation-runtime/policy.ts`** handoff 分支 + env（**`src/config/suppress-reply.ts`**）。**例外**：`src/channels/outbound-sender/mock.ts` 为测试辅助，非生产 webhook 路径；**handoff/lead HTTP notify** 受 **`notify.enabled`** 门控，**不受** `bot.enabled`（设计如此，非 channel 回复）。
  - **FAQ fallback 范围**：当前仅接管 resolver 策略 2/3 与 `planDefaultTurn` 文本回显；**不含** `post_capture` / `capture` 阶段引导文案的 tenant 开关（**MVP 已知边界**，见 **`docs/175`** / **`memory/04`**）。
