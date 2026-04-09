# Completed Work

## Hosted v1 最终门禁前补强（knowledge publish 服务端硬校验）✅（2026-04-09）

**名称**：`Hosted v1 gate hardening / knowledge transition authz`  
**交付**：knowledge 状态推进相关接口新增服务端 readonly 硬拒绝与清晰错误返回；前端错误提示口径改为优先展示服务端 `message`。  
**验证**：tenant_admin 正常状态链通过；tenant_operator_readonly 在 publish/review 被 403 `knowledge_transition_forbidden` 明确拒绝；overview/setup/reports/go-live 复核通过。  
**边界**：未扩功能、未开新主线、未升版本。  
**版本**：**1.7.108**。  

## 商业 SaaS 后台 UX 第二阶段（P1 首批短回归确认）✅（2026-04-09）

**名称**：`P1 first-batch short regression`  
**交付**：完成 Reports 下钻、Knowledge review/publish 状态流、Setup/Overview 一致性短回归，并在 Postgres 实租户路径完成最小复核。  
**验证结果**：关键链路（tenant/knowledge/webhook/inbox/leads/reports/overview）均通过，无新增显性回归。  
**边界**：未扩 P1 新功能、未升版本。  
**版本**：**1.7.108**。  

## 商业 SaaS 后台 UX 第二阶段（P1 首批实现）✅（2026-04-09）

**名称**：`UX Phase 2 / P1 first batch`  
**交付**：`public/tenant-app.html` — Reports 关键下钻（带筛选上下文）、Knowledge review/publish 最小闭环（状态推进+失败反馈+readonly 限制提示）、Setup 与 Overview 完成条件/阻塞提示深化。  
**未做**：P1 全量、复杂图表、富文本编辑器、导出、新页面扩面、版本升级。  
**版本**：**1.7.108**。  

## 商业 SaaS 后台 UX 第二阶段（P1 前置 residual 预修）✅（2026-04-09）

**名称**：`P1 preflight residual fix (knowledge/faq/platform settings)`  
**交付**：`src/saas/repository.ts` 对三条高概率写路径完成 adapter 化与 postgres 兼容处理；避免 P1 触发 sqljs-only 写入崩溃。  
**验证**：Postgres hosted 下最小写入验证通过（knowledge create/disable/enable、FAQ put、platform settings put/get）。  
**未做**：P1 功能实现、页面扩面、版本升级。  
**版本**：**1.7.108**。  

## 商业 SaaS 后台 UX 第二阶段（P0 稳定观察 + P1 放行前确认）✅（2026-04-09）

**名称**：`P0 stability observation closeout`  
**交付 1（重复稳定性）**：在 Postgres hosted 路径再执行完整最小链路冒烟（tenant_create -> webhook -> inbox/leads actions）全部通过，未见波动。  
**交付 2（残留清点）**：完成 sqljs-only / sqlite 方言残留盘点，确认 P0 主链已安全，识别到 P1 可能触发的非主链写路径仍有 `getSaaSDatabase` 依赖。  
**未做**：P1 功能实现、页面扩面、版本升级。  
**版本**：**1.7.108**。  

## 商业 SaaS 后台 UX 第二阶段（P0 真实阻塞修复）✅（2026-04-09）

**名称**：`UX Phase 2 / P0 hosted blockers fix`  
**交付**：
- `src/saas/repository.ts`：修复 Postgres 建租户 SQL 兼容；将 P0 关键运营链路写入（test/runtime/activity/conversation/lead）迁移到 adapter 路径，避免 postgres 触发 sqljs-only 写入崩溃。
- `src/saas/tenant-webhook-http.ts`：`tenant_secret_missing` / `signature_invalid` 增加可执行 guidance 返回，不降低签名安全边界。
- `src/webhooks/website.ts`：新增 website 入站持久化（conversation/message）与 `persistence` 诊断输出。
**验证**：Postgres 真链路二次实租户冒烟通过（建租户、AI、secret、webhook、Inbox/Leads 数据、最小动作均通过）。  
**未做**：P1 实现、新页面扩面、版本升级。  
**版本**：**1.7.108**。  

## 商业 SaaS 后台 UX 第二阶段（P0 真实租户冒烟 + P1 设计真源）✅（2026-04-09）

**名称**：`UX Phase 2 / P0 real-tenant smoke + P1 design source`  
**交付 1（验证）**：完成最小路径实租户冒烟，确认 P0 主链可执行能力与真实阻塞点（postgres 建租户崩溃、tenant webhook secret 门禁、website->conversation 生成断点）。  
**交付 2（设计）**：新增 `docs/internal/chatflow-pro-saas-admin-ux-phase2-p1-design-source.md`，覆盖 Reports 关键下钻、Knowledge 发布/复核闭环、Setup/首页状态深化，并逐项包含目标/入口/输入/成功/失败/下一步/P1归类/写入需求/hosted签核影响。  
**未做**：P1 实现、新页面扩展、复杂图表、富文本增强、版本升级。  
**版本**：**1.7.108**。  

## 商业 SaaS 后台 UX 第二阶段（P0 实现）✅（2026-04-09）

**名称**：`UX Phase 2 / P0 真闭环实现（Setup + Daily Ops）`  
**交付**：`public/tenant-app.html` — `fetchSetupSnapshot`、真实 Setup 步骤状态计算与阻塞展示；Setup step detail 接入真实 API 动作（settings/ai/channels/knowledge/test/go-live）；Overview/Settings/Setup 真实联动；Inbox/Leads/Handoff 至少各一条真实动作链闭环（含成功/失败反馈与刷新）。  
**未做**：P1/P2、后端结构性改造、新页面扩展、版本升级。  
**版本**：**1.7.108**。  

## 商业 SaaS 后台 UX 第二阶段（设计真源）✅（2026-04-09）

**名称**：`UX Phase 2 / 首次配置到日常运营闭环设计真源`  
**交付**：`docs/internal/chatflow-pro-saas-admin-ux-phase2-design-source.md` — Scope Lock、User Journey Map、Onboarding Flow、Daily Ops Flow、Blocker Map、P0/P1/P2 清单、Next Implementation Recommendation、Final Recommendation。  
**未做**：代码实现、后端改动、真实写入接线、新页面扩展、版本升级。  
**版本**：**1.7.108**（设计阶段）。  

## 商业 SaaS 租户后台 UI — 最终收口轮（全主面一致性总校）✅（2026-04-09）

**名称**：`Tenant app / 全主面 UI 一致性收口`  
**交付**：`public/tenant-app.html` — 七个主面统一文案系统、动作命名、fallback banner、placeholder alert 语气、状态语义边界；完成结构与间距总校（标题区、toolbar、card、list、side panel、empty/loading/fallback）。  
**未做**：后端改动、真实写入接线、新页面扩展、`package.json` 升级。  
**版本**：**1.7.108**。

## 商业 SaaS 租户后台 UI — 第 9 轮（polish Overview / Settings）✅（2026-04-09）

**名称**：`Tenant app / Overview + Settings 统一语言扩展`  
**交付**：`public/tenant-app.html` — 新增 `ov-*`、`stg-*`；Overview 状态条/KPI/任务与事件/快速动作统一；Settings 首页/Setup hub/Setup detail/Advanced shell 统一 status chip、banner、action 区、loading 壳。  
**未做**：后端改动、真实写入、新页面扩展、Reports 深 polish、**未**升 patch。  
**版本**：**1.7.108**。

## 商业 SaaS 租户后台 UI — 第 8 轮（统一列表页细化）✅（2026-04-09）

**名称**：`Tenant app / Inbox + Leads + Knowledge 统一 workbench 体验层`  
**交付**：`public/tenant-app.html` — 新增 `wb-*` 通用层与统一状态语义 `st-*`；三页统一 toolbar / list row / detail & side panel / empty & banner / loading skeleton；顶部动作区统一含保存视图与占位动作。  
**未做**：真实写入、真实发布/分配、后端变更、**未**升 patch。  
**版本**：**1.7.108**。

## 商业 SaaS 租户后台 UI — 第 7 轮（Knowledge 阅读 / 管理壳层）✅（2026-04-09）

**名称**：`Tenant app / Knowledge 内容中心 — 工具条 + 三栏阅读结构 + 状态筛选 + 上下文侧栏 + 业务跳转`  
**交付**：`public/tenant-app.html` — Knowledge 专用 CSS；`MOCK_KNOWLEDGE`、`normalizeKnowledgeEntry`、`statusTagClass`、`statusLabel`、`knowledgeFiltered`、`viewKnowledge` 重写；支持搜索/分类/状态/语言筛选、统一空态、详情阅读区与右侧 Quick actions。  
**未做**：真实知识写入/发布、富文本编辑器、版本历史、真实 usage 统计、**未**升 patch。  
**版本**：**1.7.108**。

## 商业 SaaS 租户后台 UI — 第 6 轮（Reports 管理视角壳层）✅（2026-04-09）

**名称**：`Tenant app / Reports 报表中心 — 工具条 + KPI + Trend/Breakdown/Exceptions + 分组导航 + 闭环跳转`  
**交付**：`public/tenant-app.html` — Reports 专用 CSS；`REPORT_TABS`、`REPORT_RANGE_API`、`MOCK_REPORT_CARDS`、`reportsSectionFromPath`、`repNavHtml`、`repSectionPanel`、`viewReports` 重写；`route` 支持 `/app/reports/*`；`setNav` 激活 `/app/reports` 前缀；`/app/reports/` 归一。  
**未做**：真实导出、保存视图持久化、30d/90d/custom 后端 range、复杂图表、Knowledge 深页、**未**升 patch。  
**版本**：**1.7.108**。

## 商业 SaaS 租户后台 UI — 第 5 轮（Leads 中心壳层）✅（2026-04-09）

**名称**：`Tenant app / Leads 三栏线索中心 + KPI + 筛选 + 时间线占位`  
**交付**：`public/tenant-app.html` — Leads 专用 CSS；`MOCK_LEADS`、`normalizeLead`、`leadBucket`、`leadsFiltered`、`leadsKpiStats`、`buildLeadTimelineHtml`、`viewLeads` 重载。  
**未做**：真实 lead 更新、follow-up/转化关闭 API、Reports 深页、**未**升 patch。  
**版本**：**1.7.108**。

## 商业 SaaS 租户后台 UI — 第 4 轮（Inbox 工作台壳层）✅（2026-04-09）

**名称**：`Tenant app / Inbox 三栏工作台 + 筛选 + 时间线/侧栏占位`  
**交付**：`public/tenant-app.html` — Inbox CSS；`MOCK_INBOX_CONVERSATIONS`、`normalizeInboxConversation`、`inboxFiltered`、`buildInboxTimelineHtml`、`viewInbox` 重载。  
**未做**：真实回复发送、handoff/状态写入、Leads 深页、**未**升 patch。  
**版本**：**1.7.108**。

## 商业 SaaS 租户后台 UI — 第 3 轮（Channels 向导壳层）✅（2026-04-09）

**名称**：`Tenant app / Channels 接入中心 + Settings 子总览 + 六渠道四步向导`  
**交付**：`public/tenant-app.html` — `fetchChannelsBundle`、`buildIntegrationCardsHtml`、`viewSettingsChannelsOverview`、`viewChannelWizard`、`mountLegacyChannelsEditor`；路由与 `setNav` 联动；`setup/channels` → `settings/channels`。  
**未做**：向导真实写入、webhook 真校验、统一 test message 深逻辑、Inbox、**未**升 patch。  
**版本**：**1.7.108**。

## 商业 SaaS 租户后台 UI — 第 2 轮（Settings IA 壳层）✅（2026-04-09）

**名称**：`Tenant app / Settings — Setup vs Advanced 信息架构 + 子路由骨架`  
**交付**：`public/tenant-app.html` — `viewSettingsHome`、`viewSettingsSetupHub`、`viewSetupStepDetail`、`viewAdvancedShell` 等；路由见 `memory/05`；`setNav` 对 `/app/settings` 前缀激活 Settings。  
**未做**：真实配置读写、Channels 深向导、go-live 提交、Recovery 深页、像素级品牌。  
**版本**：**1.7.108**（**未**升 patch）。

## 商业 SaaS 租户后台 UI — 第 1 轮（App Shell + Overview）✅（2026-04-09）

**名称**：`Tenant app / 浅色壳层 + 主导航 + Overview 行动首页骨架`  
**交付**：`public/tenant-app.html` — 7 项导航、顶栏、折叠 API 连接、Overview **MOCK_OVERVIEW**（状态条 / 四卡 / 双栏 / 快捷操作）；签核模板 **alert** 提示仓库路径（`docs/internal/...`）。  
**未做（第 1 轮时点）**：后端改动、Overview 接真实 API；Settings 深层已由 **第 2 轮壳层** 部分承接（仍无真实写入）。  
**版本**：**1.7.108**。

## Phase E — Hosted v1 Gate ✅ Overall Closeout / Sealed（2026-04-09）

**名称**：`Phase E overall / Hosted v1 门禁真源总收口`  
**状态**：**closed / sealed**；**无**业务代码；**无**新增 verify；**不**升 `package.json`。

**交付**：
- **Closeout 真源**：`docs/internal/phase-e-overall-closeout.md` — 解决/未解决边界、E1/E2/E3 清单、可交付 100% vs hosted v1 达标、禁止 E 扩面。
- **交叉更新**：`phase-e-hosted-v1-go-live-gate-design.md`、`phase-e-hosted-v1-index.md`、`d-c4-overall-closeout.md`（后续主线句）。
- **口径**：**可卖 / 可交付（规程包）= 100%**；**hosted v1 须实际签核**。

**明确未做**：E2-e、E3 扩面、自动化判定器、改 D-C3/D-C4 语义。

## Phase E1 — Hosted v1 文档包 ✅ 已交付（2026-04-09）

**名称**：`Phase E1 / SOP 交叉引用 + 签核模板 + 文档入口`  
**状态**：**仅 Markdown**；**无**新 npm scripts、**无** verify、**无**业务代码；**不**改 D-C3/D-C4 **实现语义**。

**交付**：
- **入口**：`docs/internal/phase-e-hosted-v1-index.md` — 必读 vs D-C 专用、已具备/未具备、E2/E3 边界。
- **签核模板**：`docs/internal/phase-e-hosted-v1-signoff-template.md` — Block / Manual / Evidence、Build·CI·Staging·RC·Prod、No-Go、Go/No-Go、签核人。
- **SOP**：`install-sop.md`、`backup-restore-sop.md`、`rollback-sop.md` — Hosted v1（Phase E）节；`d-c3-operator-runbook.md` — 标明 **非**全量 hosted v1 门禁。
- **设计稿更新**：`phase-e-hosted-v1-go-live-gate-design.md` — E1 落地指针与文档状态表。
- **版本**：**1.7.108**（**不**升 patch）。

**明确未做（交付时点）**：E2 规格实现、E3、脚本化 gate — **E2-a~d 已于后续文档交付**（见下节）。

## Phase E2 — Hosted v1 清单规格化 设计真源 ✅ 已交付（设计稿 · 2026-04-09）

**名称**：`Phase E2 / 检查清单规格 · 证据 schema · 环境矩阵 — 设计`  
**状态**：范围锁定 **仍有效**；**E2-a~E2-d** 见下节 **规格真源**。

**交付**：
- **设计真源**：`docs/internal/phase-e2-hosted-v1-scope-lock-design.md` — E2 独有价值 vs E1、与 D-C4/E3 边界、候选 E2-a～e、Go/No-Go、误扩风险、建议。
- **交叉更新**：`phase-e-hosted-v1-go-live-gate-design.md` §7、`phase-e-hosted-v1-index.md` 必读表与 §4。
- **版本**：**1.7.108**（**不**升 patch）。

## Phase E2 — E2-a ~ E2-d 规格真源 ✅ 已交付（文档实现 · 2026-04-09）

**名称**：`Phase E2 implementation / chk_id 注册表 + 证据字段 + 环境矩阵 + 签核前置`  
**状态**：**仅 Markdown**；**无** verify、**无** npm scripts、**无**业务代码；**不**改 D-C3/D-C4 **实现语义**；**不**改 E1 模板 **结构**（仅 **真源行** 增链）。

**交付**：
- **规格真源**：`docs/internal/phase-e2-hosted-v1-checklist-spec.md` — E2-a 注册表、E2-b 证据 `kind` 与必填/选填、E2-c `CI/RC/Staging/Prod` 格、E2-d 前置与 Phase E §4.2 对照。
- **交叉更新**：`phase-e2-hosted-v1-scope-lock-design.md`（文档状态）、`phase-e-hosted-v1-go-live-gate-design.md`、`phase-e-hosted-v1-index.md`、`phase-e-hosted-v1-signoff-template.md`（真源指针）。
- **版本**：**1.7.108**（**不**升 patch）。

**明确未做**：**E2-e**、**E3 扩面**、JSON Schema 文件、自动化 gate、verify 扩面。

## Phase E3 — Hosted v1 只读聚合 设计真源 ✅ 已交付（设计稿 · 2026-04-09）

**名称**：`Phase E3 / 只读聚合 — 范围锁定（设计）`  
**状态**：范围锁定 **仍有效**；**只读聚合实现** 见下节。

**交付**：
- **设计真源**：`docs/internal/phase-e3-hosted-v1-readonly-aggregate-scope-lock-design.md` — E3 唯一问题、与 E1/E2/D-C4C 边界、无设计合并 bundle 禁令、非 gate/非修复器、E3-a~d 极小候选、Go/No-Go、风险、建议。
- **交叉更新**：`phase-e-hosted-v1-go-live-gate-design.md`、`phase-e-hosted-v1-index.md`、`phase-e-hosted-v1-signoff-template.md`（真源指针）。
- **版本**：**1.7.108**（**不**升 patch）。

## Phase E3 — Hosted v1 只读聚合报告 ✅ 已交付（实现 · 2026-04-09）

**名称**：`Phase E3 implementation / 只读聚合报告工件`  
**状态**：**规格 + 模板 + 样例 + 可选脚本**；**无** verify、**无** `package.json` script；**无**业务写路径；**不**改 D-C3/D-C4/E1/E2 **语义**。

**交付**：
- **实现规格**：`docs/internal/phase-e3-hosted-v1-readonly-aggregate-report-spec.md` — E3-a~d。
- **模板 / 样例**：`phase-e3-hosted-v1-readonly-aggregate-report.template.md`、`docs/internal/samples/phase-e3-hosted-v1-readonly-aggregate-report.example.md`。
- **可选生成器**：`scripts/e3-hosted-v1-readonly-aggregate-report.mjs` — **仅** fs 读白名单、`stdout` Markdown。
- **交叉更新**：`phase-e3-hosted-v1-readonly-aggregate-scope-lock-design.md`（文档状态）、`phase-e-hosted-v1-go-live-gate-design.md`、`phase-e-hosted-v1-index.md`、`phase-e-hosted-v1-signoff-template.md`。
- **版本**：**1.7.108**（**不**升 patch）。

**明确未做**：`verify:e3`、D-C4C bundle 成员变更、自动化 gate、业务代码扩面。

## Phase E — Hosted v1 Go-Live Gate 设计真源 ✅ 已交付（设计稿 · 2026-04-09）

**名称**：`Phase E / Hosted v1 Go-Live Gate — 设计`  
**交付**：`docs/internal/phase-e-hosted-v1-go-live-gate-design.md`（**仍**为矩阵真源；E1 在其上叠文档包）。

## Phase D-C4 — 总线 ✅ Closed / Sealed（2026-04-09）

**名称**：`Phase D-C4 overall / 恢复后一致性治理 — closeout`  
**状态**：**Bryan 正式收口** — **不再**立项 D-C4 后续子线；**无**新代码、**无**新 verify、**无**版本 bump（保持 **1.7.108**）。

**交付**：
- **Closeout 真源**：`docs/internal/d-c4-overall-closeout.md` — 解决/未解决边界、A/B/C 交付表、关闭理由、禁止 D-C4 扩面。
- **交叉更新**：`d-c4-recovery-consistency-design.md` 页眉与文档状态、`d-c4-design-review-package.md` posture、`d-c4c-design-scope-lock.md` 文档状态脚。
- **子切片**：**D-C4A、D-C4B（B1+B2）、D-C4C（C1+C2）= completed**（历史条目见下文，**不**删除）。

**明确未做**：任何新 D-C4 子线、D-C3C、自动补偿、修复器。

## Phase D-C2C1 — dedupe retention cleanup（第一刀）✅ Accepted / Completed（2026-04-09）

**归档摘要（最终）**：**Completed & Archived**。本轮 scope **已冻结**（不新增定时任务、告警、state cleanup、audit/file 保留、D-C3、UI、Redis 等扩展）。**sqljs** `verify:d-c2c1-dedupe-retention` 已通过；**Postgres** 全库/租户 dry-run、apply、second apply 已通过；联调 **`deleted=0`** 因当时库内 **无** cold completed（`COALESCE(completed_at,last_seen_at) < cutoff` 未触发），**非实现缺陷**。**未来**仅当库内出现上述 cold completed 样本时，**按原脚本**补跑 **dry-run → apply → second apply**，验证 `deleted>0` 与二次 apply 归零。

**名称**：`Phase D-C2C1 / D-B3 dedupe 表冷 completed 清理脚本 + dry-run|apply + verify`  
**状态**：**验收通过**；**不进入 D-C2C2**；**不扩**定时任务、告警、state cleanup、audit/file retention、D-C3、UI、Redis。

**交付**：
- **实现**：`src/saas/dedupe-retention-cleanup.ts`；`scripts/saas-dedupe-retention-cleanup.mjs`（`--dry-run` | `--apply`，`--max-rows`，`--tenant-id`，`CHATFLOW_DEDUPE_RETENTION_DAYS`）；仅删 `status=completed` 且 `COALESCE(completed_at,last_seen_at)<cutoff`；`processing` **永不删**，仅 `processing_stale_count` 统计。
- **sqljs 验证**：`npm run verify:d-c2c1-dedupe-retention` **已通过**（种子 → dry-run → apply → processing/近期 completed 保留 → 二次 apply 幂等）。
- **真实 Postgres 联调**：全库 dry-run、租户范围 dry-run（`t_d_b3_unified`）、小 `max_rows` 连续两次 apply **均已通过**；**本轮三表 `deleted=0`** — 因目标库当前 **无** 满足 cutoff 的 **cold completed** 样本（`COALESCE(completed_at,last_seen_at) < cutoff` 未触发），属 **样本条件未触发**，**非实现缺陷**。
- **npm**：`saas:dedupe:retention:dry-run` / `saas:dedupe:retention:apply`；版本收口见 `package.json`（本线 **1.7.102**）。

**待未来触发项**：当库内出现 cold completed 样本后，用**同一脚本**再跑一轮，验证 **`deleted>0`** 且 **第二次 apply 三表 `deleted=0`、候选归零**。

## Phase D-C4C — C1+C2 实现 ✅ 已交付（2026-04-09）

**名称**：`Phase D-C4C / 只读 verify bundle + CI·RC·Staging 门禁（仅 C1+C2）`  
**状态**：**只读** orchestrator + 文档 + CI 一步；**无**业务写路径；**不**改 D-C3A/B/D-C4A/D-C4B 源码语义。

**交付**：
- **C1 规格**：`docs/internal/d-c4c-readonly-governance-bundle-spec.md` — 成员表、环境、失败语义。
- **C2 门禁**：`docs/internal/d-c4c-ci-rc-staging-gates.md` — **Block / manual review / evidence** 分表；CI vs RC vs Staging vs 生产。
- **脚本**：`scripts/verify-d-c4c-readonly-governance-bundle.mjs`；npm `verify:d-c4c-readonly-governance-bundle`、`verify:d-c4c-readonly-governance-bundle:ci`。
- **CI**：`.github/workflows/ci.yml` — Build 后跑 `:ci`（**block merge**）。
- **证据示例**：`docs/internal/d-c4c-evidence-run-record.example.json`（**C3** 极小落地）。
- **交叉更新**：`d-c4c-design-scope-lock.md`、`d-c4-recovery-consistency-design.md` §6、`d-c4-design-review-package.md`、`d-c4b-delivery-drill-checklist.md` 指针。
- **版本**：**1.7.108**。

**设计真源（仍有效）**：`docs/internal/d-c4c-design-scope-lock.md`。

**明确未做**：`saas:recovery:readonly-check` 进 CI 默认、deployment-info 在线对账、D-C3B 联动、自动补偿；**D-C4 总线已关闭**，**不**再开新 D-C4 子线。

## Phase D-C4B — B1+B2 文档实现 ✅ 已交付（2026-04-09）

**名称**：`Phase D-C4B / runbook + 决策表 + 交付演练对齐（仅 B1+B2）`  
**状态**：**仅 Markdown + SOP 指针**；**无** TS/业务写路径、**无**新 verify、**不**改 D-C3A/B/D-C4A 源码语义。

**交付**：
- **B1 决策表**：`docs/internal/d-c4b-recovery-decision-table.md` — `overall_tier` × 允许/禁止/升级/reopen；R1–R7 交叉；书面留痕。
- **B2 交付/演练**：`docs/internal/d-c4b-delivery-drill-checklist.md` — restore/rollback/install 口径、tabletop 最小步骤、验收表。
- **Runbook §6**：`docs/internal/d-c3-operator-runbook.md` — Post-restore 固定顺序（先 D-C4A → 决策表 → 条件允许再走 D-C3A/B）。
- **交付 SOP**：`docs/internal/backup-restore-sop.md`、`rollback-sop.md`、`install-sop.md` — Post-restore / post-rollback / install 升格路径。
- **交叉更新**：`d-c4-recovery-consistency-design.md` §6、`d-c4-design-review-package.md`、`d-c4a-recovery-readonly-check-spec.md`（「输出怎么用」指针）、`d-c4b-design-scope-lock.md` 文档状态。
- **版本收口**：**1.7.107** — `package.json` 作为 **D-C4B（B1+B2）文档交付** 锚点 patch。

**明确未做**：B3/B4、D-C4C、任何 repair/apply 自动化、业务代码/verify 增量。

## Phase D-C4A — 恢复后只读核查 pack ✅ 已交付（2026-04-09）

**名称**：`Phase D-C4A / recovery-readonly-check`  
**状态**：**已实现（只读）**；**不**含写路径、**不**绑 D-C3B 批量。

**交付**：
- **规格**：`docs/internal/d-c4a-recovery-readonly-check-spec.md`。
- **模块**：`src/saas/recovery-readonly-check.ts` — `runRecoveryReadonlyCheck`；**仅** `queryOne`/`queryAll` + `listDedupeConsistencyGaps` + `fs.stat`。
- **CLI**：`scripts/recovery-readonly-check.mjs`；`npm run saas:recovery:readonly-check`。
- **验证**：`npm run build && npm run verify:d-c4a-recovery-readonly-check`。
- **版本**：**1.7.106**。

**明确未做**：D-C4B/C、自动补偿、修表、UI/API、Redis/队列、改 D-C3A/B 行为。

## Phase D-C4 — 设计评审收口包 ✅ 已交付（评审文档 · 2026-04-09）

**名称**：`Phase D-C4 / 设计评审包 — 可评审·可放行·可拒绝`  
**状态**：**仅评审文档**（历史）；**现** D-C4A/B/C **completed**，**Phase D-C4 overall closed** — `d-c4-overall-closeout.md`。

**交付**：
- **评审入口**：`docs/internal/d-c4-design-review-package.md` — Review scope、解决/不解决、**D-C4A 极小候选锁**、Bryan checklist、误判清单 M1–M6、Go/No-Go、六问、Final recommendation。
- **上游设计**（不变）：`docs/internal/d-c4-recovery-consistency-design.md`。

**明确未做**：D-C4A 代码、新 verify、改 package.json、改 D-C3A/B、自动补偿。

## Phase D-C4 — 恢复后一致性治理 · 设计真源 ✅ 已交付（设计稿 · 2026-04-09）

**名称**：`Phase D-C4 / restore·rollback·partial restore 后对账与处置 — 设计`  
**状态**：**设计长文**（保留）；A/B/C **已实现**；**Phase D-C4 overall closed**；**不**等于 D-C3C。

**交付**：
- **设计真源**：`docs/internal/d-c4-recovery-consistency-design.md` — scope lock、gap 矩阵（R1–R7）、恢复策略与核查顺序、incident/runbook 黑名单、演练规格、建议拆包 D-C4A/B/C、七问自检。
- **版本**：仍 **1.7.105**（纯设计 **不**升 patch）。

**明确未做**：任何代码、verify 脚本、UI、自动补偿、改 D-C3 工具。

## Phase D-C3 — Closeout（收口真源 + runbook + 验收 + verify bundle）✅ 已交付（2026-04-09）

**名称**：`Phase D-C3 / A+B 收口与验收包`  
**状态**：**文档与脚本收口**；**不**进入 D-C3C；**不**改 D-C3A/B 核心逻辑。

**交付**：
- **Closeout 真源**：`docs/internal/d-c3-closeout.md`（解决/未解决、A/B 边界、D-C3C 冻结理由、最低治理标准、五大问题）。
- **运维 Runbook**：`docs/internal/d-c3-operator-runbook.md`。
- **演练/验收清单**：`docs/internal/d-c3-acceptance-checklist.md`。
- **Verify**：`npm run verify:d-c3-bundle`（build + D-C3A + D-C3B）；`npm run verify:d-c3-closeout`（bundle + `scripts/verify-d-c3-closeout-assets.mjs`）。
- **版本**：**1.7.105**。

**明确未做**：D-C3C、自动补偿、批量/UI/API、Redis/队列、扩 action 白名单。

**关闭声明**：**D-C3 子线正式 sealed** — 不再沿 D-C3 扩补偿/批量/UI。

## Phase D-C3B — 单键人工 dedupe 修复 ✅ 已交付（2026-04-09）

**名称**：`Phase D-C3B / 单键人工闭环工具（默认关闭）`  
**状态**：**已实现**；**验收**：`npm run build` + `npm run verify:d-c3b-manual-repair` **通过**；**禁止**在本刀扩 D-C3C / 批量 / UI。

**交付**：
- **规格**：`docs/internal/d-c3b-manual-repair-spec.md`（入口边界、action 白名单、`close_as_completed` / `release_for_retry` 条件、审计字段、黑名单）。
- **模块**：`src/saas/dedupe-manual-repair.ts` — `runDedupeManualRepair`（Postgres-only gate）、`executeDedupeManualRepairOnAdapter`（验证用）；dry-run **零写入**；apply **审计行** + 可选 `dedupe_manual_repair` 结构化日志。
- **迁移**：`pg_0015_phasedc3b_dedupe_manual_repair_audit.sql`；registry `pg_0015_phasedc3b_dedupe_manual_repair_audit`。
- **CLI**：`npm run saas:dedupe:manual-repair -- ...`（`scripts/dedupe-manual-repair.mjs`）。
- **版本**：**1.7.104**。

**明确未做**：D-C3C、自动补偿、批量 UPDATE/DELETE、后台 UI、Redis/队列/cron、D-C2C2、公开修复 API。

## Phase D-C3A — dedupe 只读对账层 ✅ 已交付（2026-04-09）

**名称**：`Phase D-C3A / G1·G2·G3 可疑键清单（只读）`  
**状态**：**已实现**；**验收**：`npm run build` + `npm run verify:d-c3a-readonly-recon` **通过**；**禁止** D-C3B/C 在本刀混做。

**交付**：
- **规格**：`docs/internal/d-c3a-readonly-recon-spec.md`（最小输出字段：`tenant_id`、`lane`、`channel`/`event_type`、`idempotency_key_fp`、`current_status`、`current_version`、`evidence_http_or_provider`、时间戳、`recommended_action`、`gap_kind`）。
- **模块**：`src/saas/dedupe-consistency-readonly.ts` — `listDedupeConsistencyGaps` **仅 SELECT**；`sqljs` 路径 **零行** + `postgres_only` 说明。
- **CLI**：`npm run saas:dedupe:consistency:report`。
- **启发式**：`processing` + `last_seen_at < cutoff(stale_minutes)` → `g1_notify_processing_stale` / `g2_outbound_processing_stale` / `g3_inbound_processing_stale`（DB-only，可能含慢请求假阳性；`recommended_action` 要求对日志再判）。

**明确未做**：写修复、自动补偿、UI、Redis/队列、定时任务、D-C2C2、D-C3B/C。

## Phase D-C2B — rotation + break-glass + governance closure ✅ 正式收口（2026-04-09）

**名称**：`Phase D-C2B / D-C2B1 rotation ledger + D-C2B2 break-glass TTL + D-C2B3 audit closure bundle`  
**结论**：
- **B1**：`credential-rotation.ts` + `tenant_credential_rotation_events`；`upsertTenantCredentialSealedWithAdapter`；`rotate:tenant-credential:expected`；`verify:d-c2b1-credential-rotation`。
- **B2**：`break-glass-policy.ts`、`break-glass-audit.ts`、`break_glass_audit_events`；`admin-auth` / `admin-routes` TTL 门禁；`verify:d-c2b2-break-glass-ttl`。
- **B3**：`governance-audit-closure.ts`（`GOVERNANCE_AUDIT_CLOSURE_SCHEMA_VERSION`）；rotation / break-glass DB 成功后镜像 **governance_audit** 结构化日志；`verify:d-c2b3-governance-closure`、`verify:d-c2b3-governance-bundle`。
- **版本**：**1.7.101**（本线收口覆盖 patch）。
- **边界**：**未**做主密钥 re-wrap、**未**做 cleanup job、**未**做 D-C3、**未**扩 UI、**未**引 Redis — **归 D-C2C / D-C3**。

## Phase D-C2A — tenant credential at-rest encryption kernel ✅ 正式收口（2026-04-09）

**名称**：`Phase D-C2A / cf1 envelope + migrate + zero-plaintext verify`  
**结论**：
- **Crypto**：`secret-crypto.ts` — v1 前缀 `cf1:`，AES-256-GCM envelope；`isCredentialValueSealedV1` 用于幂等迁移与校验。
- **写路径**：`mergeTenantCredentials` 等在 master key 开启时对 `tenant_credentials.value` **seal**；关 key 时行为与历史一致（明文落库，仅 dev/过渡）。
- **读路径**：`openSealed` **兼容** 历史明文（非 `cf1:` 原样返回）。
- **迁移（运维 / 离线脚本）**：`migrate-tenant-credentials-plain-to-cf1.mjs` + `tenant-credentials-plain-migration.ts` — `dry-run` / `apply`，已 seal 行跳过（不二次加密）。
- **验证**：`verify:d-c2a-credential-at-rest`、`verify:d-c2a-tenant-credentials-zero-plaintext`、`verify:d-c2a-credential-migration-flow`（同进程 e2e，避免 sqljs 父子 skew）。
- **版本**：**1.7.98**（本包收口覆盖 patch）。
- **边界**：**未**做 cleanup job、**未**扩 UI、**未**引 Redis — 轮换/break-glass **已归 D-C2B**；**cleanup/保留** **归 D-C2C**。

## Phase D-C1 — observability + audit closeout ✅（2026-04-09）

**名称**：`Phase D-C1 / runtime observability + platform audit skeleton + milestone logs`  
**结论**：
- **结构化日志**：`src/observability/structured-log.ts`（`writeStructuredLog`、`redactForLog`、`observabilityFingerprint`）；pipeline `pipeline_milestone`；inbound `inbound_dedupe_decision`；outbound `outbound_dedupe_decision`（仓库 `beginOutboundDedupe` 统一写）+ `outbound_milestone` / `outbound_dedupe_cas_conflict`；state 三层 `state_cas_conflict`；notify `notify_milestone` / `notify_dedupe_cas_conflict`（handoff + lead）。
- **Ops 告警分级**：`ops-alert.ts`（P1/P2/P3 JSON 行）。
- **平台审计**：`platform-audit.ts` + `admin-sensitive-audit.ts`；Admin 敏感只读路由审计；`http_access` 等既有观测保持。
- **验证脚本**：`verify:d-c1-observability-skeleton`、`verify:d-c1-slice2-milestones`、`verify:d-c1-slice3-notify-outbound-observability`（Postgres 全量 / sqljs 仅 notify 轻量路径）。
- **版本**：**1.7.94 → 1.7.96**（多 slice 交付）。
- **边界**：无 KMS、无 cleanup job、无补偿引擎、无 Redis、无 UI 扩面；**D-C1 正式关闭**。

## Phase D-B — overall closeout ✅（2026-04-09）

- **D-B1**：Postgres 默认 live 链、启动/readiness fail-fast、交付脚本 install/upgrade/rollback/backup/restore 与 verify 对齐、`sqljs` 降为 compat。
- **D-B2**：`tenant_session_state` / `tenant_processing_state` / `tenant_delivery_state` 外置 + repository + runtime 最小接线 + 三层 `version` CAS。
- **D-B3**：`tenant_inbound_dedupe` / `tenant_outbound_dedupe` / `tenant_notify_dedupe` 三线 + 入口拦截 + 200/202/409 语义 + `verify-dedupe-d-b3-closeout.mjs`。
- **结论**：**Phase D-B（托管化主线）主目标已完成**；后续工作归 **D-C / 后续**，不归 D-B。

## Phase D-B3 — formal closeout ✅

**名称**：`Phase D-B3 / idempotency (inbound + outbound + notify) closeout`  
**结论**：
- inbound：`pg_0010` + `inbound-dedupe-repository` + `guardInboundDedupe`（webhook 层）。
- outbound：`pg_0011` + `outbound-dedupe-repository` + `createChannelSender` 包装。
- notify：`pg_0012` + `notify-dedupe-repository` + lead/handoff notify 出口。
- 返回语义：duplicate completed → **200**；duplicate processing → **202**；完成路径 CAS 冲突 → **409**（outbound/notify）；inbound 完成无 version CAS。
- 最小集成验证：`scripts/verify-dedupe-d-b3-closeout.mjs`（`npm run verify:dedupe-d-b3-closeout`）。
- **D-B3 已关闭**；**D-B 主线已关闭**。

## Phase D-B2 — formal closeout ✅

**名称**：`Phase D-B2 / three-layer state externalization closeout`  
**结论**：
- `tenant_session_state` / `tenant_processing_state` / `tenant_delivery_state` 三层状态线均成立
- 三层均已完成 repository 与 runtime 最小接线
- CAS 硬判定已验证：stale version 不可覆盖，返回 `cas_conflict`
- tenant + postgres 路径未回流 in-memory 双写（避免双真源）
- D-B2 正式关闭，进入 D-B3

## Phase D-B1 — formal closeout ✅

**名称**：`Phase D-B1 / postgres default live chain closeout`  
**结论**：
- 默认 live `db_driver=postgres` 已落地并经过脚本链验证
- `sqljs` 已降级为 dev/single-node/compat 模式（非默认 live）
- rollback 真执行路径与 verify 已通过
- backup -> restore -> restore-verify 最小链已通过
- deployment-info API 与 deployment state 对账已一致（version/current/stable）
- D-B1 正式关闭，后续进入 D-B2

## Phase D-B2 — first implementation slice ✅

**名称**：`Phase D-B2 / session state externalization first slice`  
**交付摘要**：
- 新增 migration `pg_0007_phasedb2_session_state`
- 新增 `tenant_session_state` 表（tenant+session 主键，`state_json`，`version` CAS）
- 新增 `src/saas/session-state-repository.ts`（session state 读取 + CAS 写入边界）
- build 通过：`npm run build`
**边界口径**：
- 本刀只开 session state
- 未并行 processing/delivery state 实装
- 未进入 D-B3（幂等/并发治理扩面）

## Phase D-B1 — Postgres default live chain kickoff ✅

**名称**：`Phase D-B1 / postgres default chain kickoff`  
**交付摘要**：
- 默认 `CHATFLOW_SAAS_DB_DRIVER` 切为 `postgres`（sqljs 不再默认 live）
- 增加 hosted readiness gate（启动 fail-fast + `/saas/v1/health` readiness 503 语义）
- `CHATFLOW_SAAS_SQLJS_COMPAT=1` 显式兼容门（仅 dev/单机/兼容）
- 交付脚本改 PG 主口径：`install/upgrade/rollback/backup/restore` 与 verify 口径对齐
- 验证脚本同步默认 driver 预期（`default -> postgres`）

**边界口径**：
- 本轮仅 D-B1；未进入 D-B2/D-B3
- 未引入 Redis/第二状态存储
- 未实现 session/process/delivery 外置表与幂等表

## Phase 25 — closure decision sealed ✅

**名称**：`Phase 25 / closure decision sealed`。  
**结论**：Phase 25 已正式关闭。  
**边界口径**：默认 live 路径仍为 `sqljs`；受控 Postgres 闭环已达 `go`；受控 `go` 不等于默认链/整体已 GO。  
**版本**：`1.7.90 / Pro_v1.07.90`（不变）。  

---

## Phase 25 — controlled postgres closure evidence ✅

**名称**：`Phase 25 / controlled postgres closure evidence`。  
**交付摘要**：在受控目标 Postgres 环境完成闭环复核：`saas:db:migration:bootstrap --mode=apply` 成功（`applied_count=3`）；`saas:db:postgres:readiness --format=json` 显示 `ledger.status=ready`、`ledger_persistence_wired=true`、`execution_wired=true`；受控 `saas:db:postgres:go-no-go --format=json` 为 `overall_status=go`。  
**边界口径**：默认 live 路径仍 `sqljs`；默认链/整体口径不改写为已 GO。  

---

## Phase 25 — tenant credential entrypoint boundary sealed ✅

**名称**：`Phase 25 / tenant credential entrypoint boundary`。  
**交付摘要**：完成凭据读取分流；`getTenantCredentials()` 收敛为兼容壳（委托 outbound 入口）；`repository.ts` 补入口职责文档与弃用标注；新增并接入 `verify:tenant-credentials-entrypoint-boundary`。  
**验证结果**：`npm run build`、`npm run verify:tenant-credentials-entrypoint-boundary`、`npm run verify:saas-db-postgres-go-no-go` 全部通过。  
**边界口径**：默认 live 路径仍为 sqljs，整体 go/no-go 仍为 `NO_GO`。  

---

## Phase 25 — first minimal repository read-path slice ✅

**名称**：`Phase 25 / listTenants read-path adapterization`。  
**交付摘要**：`listTenants()` 已从 sqljs 直连读取切到 `SaaSDbAdapter.queryAll`（只读、语义不变）。  
**边界保留**：`getTenantBySlug()` 已识别进入 tenant webhook 运行时链，按低风险策略暂不推进。  
**门禁口径**：整体 `evaluatePostgresGoNoGo()` 仍按完整门禁为 `NO_GO`；默认 live 路径仍为 sqljs。  

---

## Phase 24 — closure decision sealed ✅

**名称**：`Phase 24 / closure decision sealed`。  
**结论**：Phase 24（强化收口阶段）已正式关闭。  
**边界保留**：当前整体 `evaluatePostgresGoNoGo()` 仍按完整门禁为 `NO_GO`；默认 SaaS DB live 路径仍为 sqljs；本结论不等于 Postgres ready。  

---

## Phase 24 — closeout signoff record archived ✅

**名称**：`Phase 24 / closeout signoff record archived` — **非** Postgres ready、**非** `go` 已达成。  
**交付摘要**：`docs/181_phase24_closeout_signoff_record.md` 已归档并入库，收官评审口径固定：默认链 / 受控链 / `overall_go_not_implied`。  
**门禁状态**：当前整体 `go/no-go` 仍按完整门禁为 `NO_GO`。  
**阶段状态**：建议结束 Phase 24 强化收口工作，并把后续剩余项转入下一阶段管理；当前仍保持 Phase 24，待正式关闭判断。  

---

## Phase 24 — controlled PG evidence package ✅

**名称**：`Phase 24 / controlled PG evidence package` — **非** Postgres ready、**非** `go` 已达成。  
**交付摘要**：完成 `docs/180_phase24_controlled_pg_evidence_runbook.md`，固化收官证据材料：runbook、固定运行记录模板、复核口径（默认链 / 受控链 / `overall_go_not_implied`）。  
**链路边界**：证据固化仅为材料层，不改业务代码，不改默认 verify 链；默认链稳定性保持不变。  
**阶段状态**：当前仍为 Phase 24，等待正式收官判断。默认 live 路径仍为 sqljs。  

---

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
