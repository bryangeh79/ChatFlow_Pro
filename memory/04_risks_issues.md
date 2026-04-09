# Risks and Issues

## Hosted v1 最终门禁前补强后风险（2026-04-09）

- **权限争议风险（已消除）**：knowledge publish/review 已有服务端硬拒绝，readonly 不再依赖前端限制。
- **前后端提示一致性风险（低）**：前端已优先展示服务端 `message`，错误可解释性提升。
- **剩余风险（低）**：本轮未扩面，当前仅需按 hosted v1 签核流程固化证据。

## 商业 SaaS 后台 UX 第二阶段（P1 首批短回归后）风险（2026-04-09）

- **首批回归稳定（低）**：Reports 下钻、Knowledge 状态流、Setup/Overview 一致性未见新增显性回归。
- **权限边界一致性风险（中）**：Knowledge publish 的 readonly 限制当前以前端提示为主，建议补服务端硬校验后再冲 hosted 100%。
- **低频 residual 风险（中）**：仍有少量 legacy 路径待触达清理，但不阻塞当前首批闭环。

## 商业 SaaS 后台 UX 第二阶段（P1 首批实现后）风险（2026-04-09）

- **状态语义映射风险（中）**：Knowledge 使用最小状态映射（draft/needs_review/published）已可用，但后续若引入更细治理规则需再收敛字段语义。
- **跨页筛选上下文风险（低）**：Reports 下钻采用 query 参数预设过滤，若后续筛选词典变化需同步更新映射表。
- **角色边界风险（中）**：当前为最小 readonly 限制提示，后续应补强服务端角色校验与审计策略（P1 后续批次）。

## 商业 SaaS 后台 UX 第二阶段（P1 前置 residual 预修后）风险（2026-04-09）

- **P1 高概率写路径风险（低）**：knowledge / faq / platform settings 关键写链已预修并验证通过，短期风险显著下降。
- **低频 legacy 路径残留（中）**：仍有少量 `getSaaSDatabase` 读写路径存在于低频旧接口中；当前不阻塞 P1 主计划，但需在实施期监控。
- **建议**：P1 执行期采用“触达即清理”策略，避免无边界全量重构。

## 商业 SaaS 后台 UX 第二阶段（P0 稳定观察）风险更新（2026-04-09）

- **主链稳定性风险（低）**：重复冒烟通过，当前 P0 hosted 最小链路未观察到波动。
- **P1 前置残留风险（中）**：`repository.ts` 仍有若干 `getSaaSDatabase`/sqljs-only 写路径（FAQ/knowledge/platform settings 局部），若直接开 P1 可能在真实 Postgres 路径触发兼容问题。
- **建议处置**：P1 开工前先做 targeted adapter 化（仅高概率写路径），控制范围并减少实现期返工。

## 商业 SaaS 后台 UX 第二阶段（P0 真实阻塞修复后）风险（2026-04-09）

- **同类残留风险（中）**：`repository.ts` 仍有部分未覆盖路径使用 sqljs-only 写法/`getSaaSDatabase()`（如 platform settings 与部分旧流程）；本轮已覆盖 P0 必经链路，但仍建议逐步清理。
- **Webhook 接入误配风险（中）**：安全门禁保留后，若实施方忽略 guidance，仍会出现 403；需在交付 SOP 中明确“先配 secret 再打 webhook”。
- **入站语义映射风险（中）**：website 入站已保证 conversation/message 持久化，但 lead 自动生成仍遵循现有业务条件；运营需按既定动作（如 convert）推进。

## 商业 SaaS 后台 UX 第二阶段（P0 实租户冒烟）新增风险（2026-04-09）

- **Postgres 语法兼容风险（高）**：`createTenant` 路径使用 `INSERT OR REPLACE`，在 postgres 模式触发语法错误并导致进程退出，影响 hosted 真环境冒烟。
- **Tenant webhook 门禁可用性风险（中）**：未配置租户级签名 secret 时 webhook 固定 403（`tenant_secret_missing`），新租户初期易出现“已接入但无入站数据”误判。
- **会话生成观测断点（中）**：website webhook 返回 200 但 conversation 未落库，运营链（Inbox/Leads）在未 seed 情况下不可用，需补诊断与校验提示。

## 商业 SaaS 后台 UX 第二阶段（P0 实现）后风险（2026-04-09）

- **Workspace 完成条件与租户名称耦合**：`setup_checks.company_info_complete` 由租户基础信息判定，页面保存 workspace_profile 不直接改变该判定，需在后续统一“完成条件来源”。
- **Leads 状态映射为最小实现**：前端 follow-up 对不同状态做最小推进映射，需与销售流程最终状态机再对齐。
- **部分步骤仍依赖外部真实环境**：如 channel test、AI key test、go-live 检查会受环境变量/凭据影响，演示环境需准备好最小可用配置。
- **P1/P2 仍未落地**：Reports 深下钻、Knowledge 复核流程、导出等仍为后续阶段。

## 商业 SaaS 后台 UX 第二阶段（设计真源）阶段风险（2026-04-09）

- **设计到实现断层风险**：若未按 P0 优先落地，客户仍会遇到“可点不可完成”。
- **跨入口心智分裂风险**：Setup 与主导航并行入口若无强引导，用户可能中途掉链。
- **状态误判风险**：若 `Draft/Published` 与 `Open/Pending/Closed` 不做可复核反馈，用户仍会误以为已配置完成。
- **范围漂移风险**：本阶段是 UX 设计真源，非 D-C / E 旧主线扩面；实现时需保持边界。

## 租户后台 UI 最终收口轮后风险（2026-04-09）

- **交互能力仍为壳层**：多数按钮与动作文案已统一，但真实写入/发布/分配仍未接后端，演示时需明确“UI ready ≠ write-ready”。
- **跨语言文案仍混排**：中文业务说明与英文动作词共存，已统一语义但仍可在后续国际化轮次做语言彻底收敛。
- **Reports 深层细节仍可微调**：本轮以全局一致性优先，Reports 深度交互与图表语义未扩面。

## 租户后台 UI 第 9 轮后风险（2026-04-09）

- **统一语言已扩到 Overview/Settings，但 Reports 仍有局部旧样式**：全局观感已提升，若追求像素级一致，仍需最终收口轮。
- **Overview/Settings loading 为壳层 skeleton**：当前为进入页静态占位，不代表真实异步数据流。
- **Setup/Advanced 仍占位型流程**：视觉已统一，但未接真实保存/校验逻辑，演示需明确边界。

## 租户后台 UI 第 8 轮后风险（2026-04-09）

- **状态语义收敛副作用**：视觉词典统一为 `st-*` 后，`Contacting / Converted` 等在视觉上并入 Open/Closed 语义；若运营要细分状态，仍需看文案与详情字段。
- **Loading skeleton 为壳层**：当前仅页面进入时展示静态 skeleton，未接真实分页/分块 loading。
- **统一动作区仍占位**：三页顶部 action 按钮均为占位 alert，不代表真实业务写入能力。
- **统一范围限制**：本轮只覆盖 Inbox/Leads/Knowledge，Reports/Settings 仍存在样式差异，需后续轮次继续收口。

## 租户后台 UI 第 7 轮后风险（2026-04-09）

- **状态映射启发式**：`/knowledge` 返回字段当前未直接包含 `Draft/Published/Needs review/Archived`，页面采用 `is_active + source_type + 索引` 推导，可能与未来正式内容工作流不一致。
- **语言筛选占位化**：语言来自条目字段与 mock 汇总，未接多语言治理规则；筛选结果仅用于浏览，不代表发布策略。
- **Related usage**：右栏 usage 为文案占位，非真实检索统计；不能当作“该知识已被 AI 实际使用”的证据。
- **阅读优先，无编辑闭环**：当前编辑/发布/创建/mark review 均为占位 alert；若对外演示需明确“本轮只做阅读与判断”。

## 租户后台 UI 第 6 轮后风险（2026-04-09）

- **时间范围 UI vs API**：工具条含 **30d / 90d / custom**，后端 `parseRange` **仅** `today|last7d|all_time` — 选占位项时 **不**再打摘要 API，页面显示 **说明横幅** + mock/上次数据语义以代码为准；勿对外宣称已支持 30d/90d 真统计。
- **Trend / Breakdown**：**静态示意**，与真实会话/渠道分布 **无关**；渠道筛选 **未**驱动 breakdown — 演示勿当分渠道报表。
- **Channel health**：由 handoff + 开放会话 **启发式**文案，**非** SLO/告警真源。
- **分组子页**：除 Overview 外主要为 **壳层说明**，深度报表 **未**接。

## 租户后台 UI 第 5 轮后风险（2026-04-09）

- **KPI「今日新增」**：按 `_rawCreated`/`_rawUpdated` **日期前缀**粗算，与时区/业务日切 **可能不一致**。
- **优先级条**：`leadPriorityUi` 为 **id 哈希 mock**，非业务优先级；勿当排序真源。
- **状态桶**：`leadBucket()` 与后端 `status` 枚举 **可能错位**；接 API 后需对齐契约。
- **功能回归**：原 Leads 表内 **to qualified** 已移除；需 **Leads 详情 API** 或别入口恢复快捷晋级直至产品重新定义。

## 租户后台 UI 第 4 轮后风险（2026-04-09）

- **Inbox 时间线与侧栏**：**示意/模板文案**，与真实 thread、lead、handoff **不一致**；演示或截图勿当作生产行为。
- **状态桶映射**：`inboxBucket()` 对 `status` 字符串 **启发式归类**；与后端枚举不完全一致时会出现 **错误标签** — 接 API 后需对齐契约。
- **功能回归**：原 Inbox **Convert to lead / Resolve** 已从主 UI 移除（改为占位）；依赖快捷表格操作的运维须用 **Leads/其他入口** 直至下一迭代接回。

## 租户后台 UI 第 3 轮后风险（2026-04-09）

- **双轨 Channels**：接入中心/向导为 **产品壳**，**旧版 `<details>` 面板** 仍可 **真实写凭证** — 须对外说明「向导未闭环前以旧版或后续迭代为准」，避免客户以为向导已保存。
- **卡片状态 vs 向导占位**：只读 API 显示 **Connected**，但向导内 **无**同步展示密钥 — 易误解「向导未完成却显示已连接」；下一迭代应统一文案或只读摘要块。
- **侧栏 Channels 高亮**：同时覆盖 `/app/settings/channels/*` — Settings 内调渠道时主导航 Channels 亦亮，属刻意 **IA 一致**；若需「仅业务页高亮」须再改 `setNav` 规则。

## 租户后台 UI 第 2 轮后风险（2026-04-09）

- **Settings Setup 进度与步骤状态**：**纯 mock** — 与真实租户配置 **可严重不一致**；接 API 前禁止当作 onboarding 真源或 SLA 依据。
- **双入口认知**：Advanced 下 AI/Channels/Team 仍链到 **旧版长表单页** — 易与「控制台分组」心智短暂割裂，直至表单迁入 Settings 分组或 Channels 向导化。
- **签核 / Recovery**：仍为 **占位 + alert**，无提交与只读审计数据。

## 租户后台 UI 第 1 轮后风险（2026-04-09）

- **Overview 示意数据**：与真实租户指标 **不一致** — 须在文档/ handoff 标明，下一迭代接 API 前勿对外当作真实看板。
- **签核链接**：当前为 **alert 仓库路径**，非内嵌文档 — 若需一键打开，须静态托管 `docs` 或内嵌摘要页。
- **AI / Team 隐藏入口**：书签用户仍可访问 — 迁移 Settings 后勿删路由直至替代完成。

## Phase E overall closeout 后风险（2026-04-09）

- **closeout 当已达标**：`phase-e-overall-closeout.md` **明确不**等于 **具体环境 hosted v1 已签核** — 误读 → 对外话术事故。
- **挂靠 Phase E 偷扩**：以「还差小功能」加 `verify:e-*`、改 bundle — **禁止**；须 **新 phase**。
- **报告 / CI 替代签核**：E3 输出或 CI 绿 **替代**模板 E/F — **仍禁止**。
- **D-C4 混淆**：恢复子集 **≠** 全量 hosted v1 — closeout **不**改变该边界。

## Phase E3 只读聚合交付后风险（2026-04-09）

- **报告当签核**：E3 输出 **替代** `signoff-template` E/F — **禁止**；须重复 **报告 ≠ Go**。
- **无设计并入 D-C4C**：把生成器 **绑进** governance bundle **无** ADR — **违反** closed 边界。
- **默认加 verify:e3**：须 **另 Go**；当前 **未**授权。
- **脚本偷写**：`e3-hosted-v1-readonly-aggregate-report.mjs` **须**保持 **只读 + stdout**；**禁止**扩成写 DB/改文件。
- **E2 耦合偷改 chk**：**禁止**反向改 E2 规格。

## Phase E3 设计阶段风险（归档 · 2026-04-09）

- 设计误读、无设计并入 bundle、报告当签核等 — 见上节 **仍适用**。

## Phase E2 规格交付后风险（2026-04-09）

- **`chk_id` 与模板脱钩**：改模板 A/B/C **不**同步 `phase-e2-hosted-v1-checklist-spec.md` → 审计对不上；**须**同 PR 或工单成对更新。
- **规格当自动化**：`checklist-spec` **不**授权新增 verify/CI gate — **E3 扩面**须 **另 Go**。
- **偷跑 E3 扩面**：在 E2 修订中夹「失败则跑 X 脚本」— **违反** E2/E3 边界。
- **D-C4 混淆**：注册表 **不得**扩成 repair/apply 步骤；**仅**证据与人工门槛。
- **与 E1 双真源**：签核结论 **以**模板 E/F **为面**；**以** Phase E 设计 §2–§6 + checklist-spec **为规格**；冲突时 **不得**口头绕过 D 节 No-Go。

## Phase E1 交付后风险（2026-04-09）

- **模板当自动化**：签核表 **不**会自行跑 CI — **禁止**未填表即宣称 v1。
- **只读 D-C4 当全量**：入口已分 **必读 vs D-C 专用** — 现场若 **只**跑 recovery 链 **跳过** Phase E 全表 → No-Go。
- **E2 creep**：借「补全 checklist」之名加 `verify:e-*` — **须**另 Go。

## Phase E 设计阶段风险（2026-04-09）

- **挂靠 D-C**：把 E 标成 D-C5 — **禁止**。
- **与租户 go-live 混淆**：`runTenantGoLiveCheck` **≠** 平台 hosted v1。
- **范围 creep**：UI、补偿、新中间件 — **违反** Scope Lock。
- **CI 绿即 v1**：须 **书面**签核（模板 §E）。
- **静默实现**：未 **Go** 即写 gate 代码 — **No-Go**。

## Phase D-C4 overall closeout 后风险（2026-04-09）

- **名义挂靠**：在未新 phase 下把增量写成「D-C4 小补」— **禁止**；须新真源标题与 ADR。
- **误读 closeout**：`d-c4-overall-closeout.md` **不**授权 D-C3C、**不**降低 D-C3B 门控、**不**把 CI bundle 当生产接流依据。
- **静默改 bundle 成员**：改 `verify-d-c4c-readonly-governance-bundle.mjs` 或 `ci.yml` **须**显式 PR 与评审（仍属工程变更，**非** D-C4 子线）。
- **设计长文仍读**：R1–R7、§4.2 黑名单、§3.1 最低标准 — **不**因 D-C4 closed 而失效。

## Phase D-C4C C1+C2 落地后风险（2026-04-09）

- **bundle 绿 = 业务可发布**：**错误** — 仍须 D-C4 §3.1 / 评审包 M5；本链 **不**含生产 PG `saas:recovery:readonly-check`。
- **CI 压力 / 误删门禁**：改动 `ci.yml` 须 PR 评审 **勿**静默拿掉 D-C4C step。
- **bundle 输出接 D-C3B**：**禁止**；失败应 **人**走 D-C4B 决策表。
- **migration assets verify 副作用日志**：加载 dist 可能刷 server 日志 — **已知**；**不**引入写路径。
- **与 D-C3C 混淆**：D-C4C **不是**补偿引擎。

## Phase D-C4C 设计阶段风险（归档 · 2026-04-09）

- 设计 **曾**要求第二次 Go — **已实现** C1+C2；后续扩线 **仍**须新门禁。

## Phase D-C4B B1+B2 交付后风险（2026-04-09）

- **版本锚点**：**1.7.107** 仅标记 B1+B2 文档收口；**勿**误读为 D-C4C 已隐含放行。
- **表读成许可**：决策表 **明示**非 apply 许可；现场若仍「照 tier 直接 D-C3B」→ 退回培训 + 工单审计。
- **SOP 写了但不跑**：restore/rollback **跳过** D-C4A → 与 D-C4 §3.2 冲突；应用 **交付验收** 抽问。
- **B3/B4 creep**：把「更多脚本交叉引用 / 新 verify」偷塞进 D-C4B 名义 — **另**立项；**D-C4C** **不**自动开。
- **D-C4 状态**：**Phase D-C4 overall 已 closed**（`d-c4-overall-closeout.md`）— 与历史条「勿误关闭」已 **更替**；**禁止**再写「总线仍开放待表决」。
- **历史条（设计期）**：`d-c4b-design-scope-lock.md` 曾约束「第二次 Go」— 已实现 B1+B2 **仅文档**；**仍禁止**半自动修复叙事。

## Phase D-C4A 落地后风险（2026-04-09）

- **误用为修复器**：`overall_tier` **仅**辅助决策；**不得**接 D-C3B 批量或自动写 — 仍须工单 + 证据。
- **sqljs 路径**：`postgres_only` **不是**恢复验收；托管须 **Postgres** 上跑全序列。
- **observe ≠ 可接流**：`observe` 仅表示 pack 内无硬阻断；**仍须**变更单 + 外部日志/渠道核对（设计长文 §7）。
- **ledger 全绿 ≠ 业务一致**：与评审包 M5 同义。

## Phase D-C4 设计评审阶段风险（2026-04-09）

- **D-C4A 漂移**：只读 pack 易被当成 **恢复修复器** — 须 checklist **C4** + 输出 **禁止「建议 closed」**（见评审包 §5 M6）。
- **Partial restore**：**默认高风险**；**不能**靠多跑脚本掩盖（M4）。
- **与 D-C3C 混淆**：D-C4 **不**承诺自动补偿（M1–M2）。

## Phase D-C3 Closeout 后口径（2026-04-09）

- **勿误读 closeout**：收口文档 **不**授权启动 D-C3C；**不**降低「先日志、后人工」门槛。
- **verify 边界**：`verify:d-c3-closeout` **不**连接生产 Postgres；生产演练走 **acceptance-checklist §B**。
- **接手依赖**：运维须读 `d-c3-operator-runbook.md`；restore/rollback **禁止**先批量改 dedupe。

## Phase D-C3B 落地后风险（2026-04-09）

- **`release_for_retry` 双发风险**：删行后管线可重新 `INSERT`；**必须**日志证明下游未成功 + `ack` + 长证据串；误用等同 **手动触发二次 notify/outbound**。
- **审计表未迁移**：`dedupe_manual_repair_audit_events` 不存在时 apply 报错 — 部署须 **先 apply `pg_0015`**。
- **apply 门控**：未设 `CHATFLOW_DEDUPE_MANUAL_REPAIR_ENABLED=1` 时拒绝 — 防脚本误跑；**不**防具备 env 的恶意 DBA（与任意 SQL 同级）。
- **Postgres 适配器 transaction 非真正 BEGIN/COMMIT**：单键影响面小；知悉审计与 dedupe 更新 **非**强原子同一事务。

## Phase D-C3A 落地后 → D-C3B 配套风险（2026-04-09）

- **误把「清单」当「判决」**：D-C3A 的 stale `processing` **不等于** 已证实「HTTP 成功 + CAS 失败」— 必须对 **结构化日志 + 渠道侧** 再判；**禁止**仅凭清单自动重发（**属 D-C3 设计红线**）。
- **绕过受控工具**：若运维直接 SQL 改 `tenant_*_dedupe` — **二次事故**；应走 **D-C3B CLI + 审计**。
- **sqljs / compat**：对账 **空结果** 为预期；**托管默认 Postgres** 下应以 PG 跑报告与修复。

## Phase D-C2B 关闭后 → D-C2C 前风险（2026-04-09）

- **Dedupe / state 表无保留策略**：`tenant_*_dedupe`、三层 `tenant_*_state` 长期增长 → **存储、索引、备份体积、查询延迟**；误删可导致 **重复副作用或 CAS 语义变化** — **属 D-C2C**。
- **审计与日志文件膨胀**：`data/platform-audit-events.jsonl`、结构化日志若落盘、`data/*.jsonl`（lead/handoff 等）— **无轮转/保留** 则磁盘与合规风险 — **D-C2C**。
- **Cleanup 误操作风险**：`apply` 无 dry-run 或阈值不当 → **生产数据不可恢复** — D-C2C 必须 **dry-run 默认、人工确认门槛、备份前置** 写进规格。
- **D-C2B 残留（已缓解项）**：轮换/break-glass/治理日志 **仍不解决** 表膨胀与文件保留 — **勿将 D-C2B 当数据生命周期终点**。

## Phase D-C2A 关闭后 → D-C2B 前风险（2026-04-09）

- **`tenant_credentials` DB 明文（策略：encryption on）**：**已缓解** — 新写入 `cf1:`；迁移脚本 + zero-plaintext verify；**残留**：`CHATFLOW_SAAS_CREDENTIALS_MASTER_KEY` **丢失/泄露** 仍等价于数据不可用或泄露；**备份/导出** 含 sealed blob，需 **备份 ACL** 与 **密钥轮换**（D-C2B）。
- **其它表 / env / JSONL 明文**：**未**纳入 D-C2A；**联系人 JSONL**、**进程 env**、**legacy admin token** 等仍属机密面 — **D-C2B/C 或单列包**。
- **无系统化轮换与 break-glass 闭合**：~~在 D-C2B 落地前~~ **D-C2B 已收口**；残留为 **运维配置面**（误开 TTL、脚本泄露 expected/new）— 仍见 `memory/05`。
- **观测 ≠ 治理**：D-C1 + D-C2B3 **governance_audit** 仍 **不**等于 **存储/cleanup 策略**已闭环 — **D-C2C**。

## Phase D-C1 关闭后 → D-C2 前风险（2026-04-09）

- **观测 ≠ 机密**：D-C1 已收口日志/告警/审计骨架；**租户侧 channel token** 等若仍经 env 或其它表明文，**不**因 D-C1 而消失 — **持续跟踪 `memory/04` 与 D-C2B/C**。
- **D-C1 verify 覆盖边界**：`verify:d-c1-slice3-notify-outbound-observability` 全量断言依赖 **Postgres**；sqljs 环境仅覆盖 notify 轻量路径 — CI 若未跑 PG job，**不得**推断 outbound dedupe 观测未实现。
- **禁止**：在 D-C1 收口后继续加观测切片 — 应 **D-C2B 规格确认后** 再动相关代码。

## Phase D-B 关闭后残留风险（2026-04-09）

- **D-B ≠ 生产合规闭环**：D-B 完成的是托管化 **MVP**（Postgres 默认链、外置三层状态、三线 dedupe）；**KMS、完整补偿引擎、企业审计** 等仍属 **D-C+**。
- **notify / outbound 完成 CAS**：若下游 HTTP 已成功但本地 `complete*DedupeWithCas` 失败，会出现「下游已收到、本地状态不一致」— 需 **D-C** 告警、人工核对或补偿策略（D-B 内未建重试引擎）。
- **inbound 完成写回**：`markInboundDedupeCompleted` **无** `version` CAS；极端竞态依赖 `tenant_inbound_dedupe` 唯一约束 + `processing/completed` 语义。
- **验证脚本依赖**：`verify:dedupe-d-b3-closeout` 需真实 Postgres 与租户 context，**默认 CI 未必启用** — 勿将「未跑脚本」等同「功能未交付」。
- **禁止**：在 D-B 已关闭后 **继续堆 D-B 范围**（第四条幂等线、全链重试、Redis）— 应 **新开 D-C 包**。

## Phase D-B3 初始风险（2026-04-08）

- **幂等键设计风险**：若 inbound/outbound/notify 键结构不统一，容易出现“重复未挡住”或“误杀正常请求”。
- **语义一致性风险**：`200 duplicate` / `202 accepted` / `409 conflict` 分界不清会导致上游调用方错误重试。
- **重试边界风险**：无限或跨层重试会放大并发冲突；D-B3 必须限定重试次数和可重试错误类型。
- **历史兼容风险**：现有发送链与新 dedupe 线并行期间，需防止旧路径绕过幂等入口。

## Phase D-B2 首刀风险（2026-04-08）

- **接线未完成风险**：当前仅有 session state 表与 repository 边界，尚未接入 runtime session store，实际流量仍可能依赖进程内 session。
- **CAS 语义风险**：`version` CAS 已定义但未进入全部写路径；后续接线前需防止“看似有 version、实际未用”。
- **JSON 载荷风险**：`state_json` 为完整会话快照，若字段无限增长会带来行膨胀与 IO 成本上升。
- **TTL 治理风险**：`expires_at` 已预留，尚未建立定时清理策略，需在 D-B2 后续刀补齐。

## Phase D-B1 新增风险（2026-04-08）

- **兼容门风险**：`CHATFLOW_SAAS_SQLJS_COMPAT=1` 为兼容留口，若误用于托管环境会偏离默认 Postgres 口径。
- **脚本依赖风险**：PG backup/restore 依赖 `CHATFLOW_PG_DUMP_COMMAND` / `CHATFLOW_PG_RESTORE_COMMAND` / `CHATFLOW_PG_ROLLBACK_COMMAND`，运维未配置会阻断流程。
- **迁移门禁风险**：`CHATFLOW_SAAS_MIGRATION_IN_PROGRESS=1` 时 readiness 必须 503，若部署流程未正确清理该标志会造成假性不可用。
- **覆盖面风险（已知）**：当前仓库仍存在 sqljs 兼容路径，D-B1 之后需在 D-B2/D-B3 前持续避免把兼容路径误当 hosted 默认路径。

## 战报顶栏（2026-04-07）

- **版本 / Phase**：**1.7.90**；**Phase 24** — **仍 `no_go`**；**3A ✅** **`docs/179`**；**3B** — **`SessionStore` 抽象**，**in-memory**；**3C ✅** — JSONL/notify **`idempotency_key` 契约**（**不**消除重复 POST、**非** MI-safe）；**Phase 23 / SaaS MVP 主线已关闭**。  
- **本轮 git**：以 `git log origin/main` 为准。  
- **新风险（tenant_settings 只读 adapter 化）**：repository 过渡期双路径仍在；若后续误把写路径与此读路径混改，可能引入 sqljs/pg 语义不一致。当前已锁定为单函数只读改动。  
- **新风险（runtime_wired 窄硬门禁）**：受控前置判定若定义不严谨，可能出现误 hard fail 或误 skip；本刀已约束为“前置满足才硬失败，前置不足只 skip”。  
- **新风险（受控实测脚本）**：若将专用实测脚本误挂入默认链，可能影响无 PG 环境稳定性；本刀已隔离为显式命令触发。  
- **新风险（证据固化执行）**：若记录模板字段不统一，会降低复核可比性；本刀已固定模板字段并要求 `overall_go_not_implied` 同步留痕。  
- **新发现风险（本轮）**：**Postgres 迁移线**见下节「Phase 24 — Postgres 迁移线（2A+）」；其余见 **Phase 24 预期风险**。  
- **已知边界**：**冻结（MVP）** — `docs/175` + `memory/04` §「Known SaaS MVP boundaries」；**待后续（v1）** — 凭证 KMS、多实例 store、**sql.js→Postgres（2B/2C）**。  
- **勿再当 backlog**：非主链路 channel send / handoff suppress（Phase 23 已审计 **covered**）。

## Phase 24 — 预期风险域（立项时展开）

- **认证与授权**：单一 `CHATFLOW_SAAS_ADMIN_TOKEN` 不适多用户托管；误配可导致越权或锁死运维。  
- **收口（Phase 24 包 1A）**：迁移路径与验收见 **`docs/176_phase24_saas_admin_auth_rbac_adr.md`**；**实现落地前** 仍为 **open operational risk** — 须限制 token 分发面、rotation 与 break-glass 流程；落地后改为跟踪 RBAC 漏配与审计缺口。  
- **包 1B**：已落地 **`admin-auth.ts` 桥接层**（**已完成**）。  
- **包 1C**：authorization scaffold — **已完成**。  
- **包 1D**：RBAC 语义 — **已完成**。  
- **包 1E**：tenant **admin** env bridge — **已完成**。  
- **包 1F**：**tenant_admin + tenant_operator_readonly** 双 env bridge — **已完成**；泄露风险同下。  
- **包 1G**：**principal 行已入库** — **已完成**。  
- **包 1H**：hash-at-rest — **已完成**；**仍无** KMS、加盐、**token rotation policy engine**。  
- **包 1I**：principal 变更审计摘要 — **已完成**；**仍无**完整 **登录会话审计**、SIEM、**轮换策略引擎**、password/JWT 产品面。  
- **包 1J**：bridge / break-glass **cutline 已文档化+registry** — **子里程碑已封**；**不再堆新型 bridge**；真实 tenant auth **另立项**。  
- **多实例**：内存 session、JSONL 追加、notify 幂等 — 需 sticky 或外置 store（**决策见 `docs/179`**）。  
- **凭证**：DB 明文 → KMS/信封加密、轮换与审计面。

## Phase 24 — Multi-instance session / store（3A+，ADR：`docs/179_phase24_multi_instance_session_store_adr.md`）

- **3A（ADR）**：已固定 **单实例假设清单**、**sticky vs 外置 store**、**JSONL 单写者边界**、**notify 幂等 / `request_id`**、**3B/3C 分包**；**无代码行为变更**。  
- **3B（session store 抽象）**：**`SessionStore` + `getSessionStore()`** — **默认单例 in-memory**；**行为与 3B 前一致**；**`external_stub` 仅类型预留**；**仍非** 多实例安全。  
- **Session**：`InMemorySessionStore` **非** 多副本安全；**生产多实例** 须 **外置 store（如 Redis，后续包）** 或 **严格 sticky + 书面风险**（**过渡**）。**3C** 仅 JSONL/notify **契约**，**不** 含 Redis。  
- **JSONL**：`data/*.jsonl` **同步 append** — 多 writer **损坏/交错**；**勿** 默认假设 NFS 多机安全。  
- **Notify**：lead/handoff HTTP POST **至少一次** — 下游 **必须** 幂等；**双副本** 可能 **重复发**。  
- **assignmentTracker**：进程内 — 多实例 **分配统计不一致**。  
- **与 Postgres**：**正交**；**`go/no-go` NO_GO** 不阻碍先 **收口会话叙事**，但 **DB 专线** 仍须 **`go-no-go` 转 go** 后才可宣称生产 PG runtime。

## Phase 24 — Postgres 迁移线（2A+，ADR：`docs/177_phase24_postgres_migration_adr.md`）

- **Migration 机制（2D–2G）**：**registry + SQL + checksum + execution + async ledger contract**；**`PostgresSaasMigrationLedger`** 在 **runtime_wired** 下可读写 **`saas_schema_migrations`**（**表须运维执行 DDL 资产**；**无自动 apply**）；**`FakeSaasMigrationLedger`** 仍供 verify / dry-run — **勿将单表可读写当 Postgres 生产就绪**。  
- **Metadata readiness（2H）**：**`postgres-metadata`** / **`saas:db:postgres:readiness`** 可探测 **ledger 表存在性**（**`table_missing` / `ready` 等**）；**仍非** 全库健康检查 — **勿将 `ledger_persistence_wired` 当 migration 已应用或 GO**。  
- **Postgres client gate + loader（2I / 2J）**：**`CHATFLOW_SAAS_POSTGRES_CLIENT=1`** 才 **动态 `import('pg')`**（见 **`docs/178`**）；**gate 关** → **不加载** `pg`，**勿误判安装失败**。**`postgres_client_runtime_wired`** 仅 **driver=postgres + gate + 合法连接配置 + 受控只读探测成功** 时为真 — **勿将「池已建」或 module 可解析当迁移/ledger/生产就绪**。  
- **Connection config（2K）**：**`CHATFLOW_SAAS_POSTGRES_URL` 或分字段** 仅 **解析/校验 stub** — **`connection_config_valid` 不代表 DB 可达**；**无 pool、无真实 SSL 材料读取** — **勿当生产凭据或健康检查终态**。  
- **TCP probe（2L）**：**`CHATFLOW_SAAS_POSTGRES_PROBE=1`** 时 **仅** **`connect`/`end`** — **`probe_connect_ok` 不等于 schema/ledger/业务可用**；**默认关闭**、**不** 进 sql.js 启动链 — **勿将探针当迁移或 RBAC 就绪信号**。  
- **Go/no-go（2M）**：**`saas:db:postgres:go-no-go`** 默认 **`no_go`** — **已有 probe/config 也不等于可投产**；**勿将 CLI 绿字误解为 runtime 已 fully ready**。  
- **Execution wired（新切片）**：apply 已真实执行 SQL + ledger（单 migration 一事务、失败回滚并 fail-fast）；**但 execution wired ≠ Postgres ready**，仍需其余硬门槛同时满足才可能 GO。  
- **受控可达性验证**：受控链必须显式开关启用；`runtime_wired + ledger_ready` 拉通仅代表门槛可达，**不自动等于 GO**；无 PG/前置不足按 `skip` 处理，避免把环境缺失误判为失败。  
- **Postgres adapter（2C）**：**最小 query/execute 已接线**（共享 Pool、`?`→`$n`）；**仍** 无 repository 全量迁 PG；**execution wired** 仍不等于生产 DB 全路径 ready — **勿当 Postgres / 迁移 / 生产 DB 就绪**。  
- **adapter 过渡期（2B+）**：**repository 双路径** — principals/audit 走 **`SaaSDbAdapter`**，其余表仍 **`getSaaSDatabase` + stmt**；新增功能若接错路径易出现 **持久化语义不一致**（忘记 `persistIfNeeded` / 混用连接）— **扩表时必须跟 adapter 模式或显式文档例外**。  
- **数据迁移 / 一致性**：单文件 SQLite（sql.js）→ 托管 Postgres 需 **显式导出/导入或双写窗口**；多租户表外键与索引需 **一次性校验**，避免部分表成功导致 **orphan** 或 **unique 冲突**。  
- **回滚**：若生产已切 Postgres 而应用回滚到仅 sql.js 版本，**数据分叉** — 需 **迁移前快照**、**可重复迁移脚本**、**环境变量明确 backend**（避免静默写错库）。  
- **连接池 / 并发**：当前 **单进程内存 DB + 全量 `export` 写盘**；Postgres 后需 **pool 上限、语句超时、重试策略**；长事务与 Admin 批量写可能与 webhook 读争用 — 需 **隔离或限流**（实现阶段定）。  
- **多实例一致性**：文件库 **隐式单 writer**；多副本 + Postgres 为常态，**无**全局 `persistSaaSDatabase()` 语义 — 依赖 **DB 事务** 与 **迁移后不再依赖进程内单例 sqlite**。  
- **方言与隐式 SQLite 特性**：现有 schema 使用 `datetime('now')`、`PRAGMA table_info`、`部分唯一索引 WHERE ...`（SQLite）；Postgres 需 **等价类型/默认/索引** 与 **独立 migration runner**（非仅 `CREATE TABLE IF NOT EXISTS` 字符串复用）。  
- **local vs prod 分叉**：长期 **双后端**（sql.js + postgres）若测试不足，易出现 **「本地绿、线上红」** — CI 建议 eventually **Postgres job** 或 contract 测试（2B/2C 定）。

---

## Existing Risks
- Do not mistake the current minimal real webhook entrypoints for a fully completed product.
- Do not expand into menu / command / state systems just because the webhook baselines are now alive.
- Do not let channel-specific changes pollute shared core behavior without a hard reason.
- Continue protecting the **seven-route baseline**: All 7 channels must remain independently verifiable and non-breaking.
- The current version is **Pro_v1.07.67** (package.json **1.7.67**; **SaaS MVP sealed (Phase 23 closed)**；**Phase 24** = v1 hardening). Truth → **`memory/01_project_status.md`**.
- The biggest recurring error to avoid is confusing stable minimal entrypoints with full platform completion.
- Regression risk remains live whenever shared contracts or routing paths are touched.
- **Pause Status**: **Not blocked** — default gate **T0 build + T1 `docker-smoke`** (incl. `smoke:webhooks` + `verify:lead-capture-states`); read-only agent env → **docs/155** *T1 equivalence* + **`npm run report:github-ci`**. No public staging URL does **not** block dev; **docs/157** Phase 0 waits on **HTTPS** staging.

## New Risks from Phase 11.40 Lead Capture Implementation
- **Field extraction accuracy**: Simple regex-based extraction may have false positives/negatives
- **Intent detection limitations**: Keyword-based detection may miss nuanced contact requests
- **Session state persistence**: Lead capture state is stored in session but not persisted to database
- **Validation gaps**: No validation of email format, phone number format, or name sanity
- **Performance impact**: Additional processing in pipeline could affect response time (minimal)

## New Risks from Phase 11.41
- **Cross-turn state management**: Session must be passed correctly between turns for merging to work
- **Outbound prompt consistency**: lead_capture_prompt logic must not interfere with other response flows
- **FAQ priority enforcement**: Captured confirmation must only show when FAQ truly misses

## New Risks from Phase 11.42
- **File system permissions**: data/ directory may not be writable in some deployments
- **Disk space**: Unbounded JSONL growth without rotation/cleanup
- **Concurrent writes**: Multiple webhook instances could cause file corruption (append-only mitigates)
- **Data security**: Plain-text JSONL files contain contact info (git-ignore helps)

## New Risks from Phase 11.43
- **Memory growth**: In-memory Map grows unbounded without session expiration
- **Restart loss**: All session state lost on process restart
- **Single-process limitation**: No multi-instance coordination (sticky sessions required)
- **Concurrency races**: Last-writer-wins with concurrent requests to same session
- **No persistence**: Pure runtime state (complements but doesn't replace file persistence)

## New Risks from Phase 11.44
- **Prompt formatting**: Double newline (`\n\n`) may not render well on all platforms
- **Message length**: Combined text (original + prompt) could exceed channel limits
- **Localization**: Prompts still English-only (needs four-language support)
- **Edge cases**: Empty replyText with prompt (currently not merged)

## New Risks from Phase 11.45
- **Translation quality**: Machine-translated strings may need human review
- **Field name mapping**: Field translations (phone→电话) may not cover all variations
- **Language detection**: Relies on session.current_language which may be inaccurate
- **Fallback chains**: English fallback may not be appropriate for all regions

## New Risks from Phase 11.46
- **FAQ over-matching**: With gate removed, FAQ may match too aggressively
- **Intent placeholder**: Real intent dispatch needed for proper FAQ gating
- **Seed content quality**: Current FAQ seeds are placeholder English-only

## New Risks from Handoff Integration (Pro_v1.07.40)
- **Keyword false positives**: Default keywords may trigger handoff unintentionally
- **Session state persistence**: Handoff state stored in memory only, lost on restart
- **No external notification**: Handoff pending状态无外呼通知（仅进程内）
- **Missing UI integration**: Handoff状态无坐席UI对接
- **Testing coverage**: Handoff触发逻辑需要更多测试场景

## New Risks from Handoff Reply Suppression (Pro_v1.07.42)
- **Silent handoff**: 用户可能不知道已转人工（无bot回复确认）
- **Configuration dependency**: 抑制行为依赖环境变量，部署时易遗漏
- **Channel consistency**: 七通道都使用 `result.response.should_send`，但需确保无硬编码覆盖
- **Default behavior**: 默认不抑制（保持现有行为），但用户可能期望抑制

## New Risks from Conversation Runtime (Pro_v1.07.45)
- **Phase transition logic**: 对话阶段判定可能过于简单，需要更多业务场景验证
- **Policy complexity**: 策略规划可能引入新的回归风险
- **Event emission**: 进程内事件发射可能影响性能（虽然当前是空实现）
- **Qualification tag accuracy**: 资格标签规则（complete_profile, high_intent）可能不够准确
- **Single-field prompting**: 单槽引导可能不够灵活，需要更多业务规则
- **Debug metadata bloat**: 新增的debug字段可能增加响应大小

## New Risks from Phase 18 / 包 1 (Pro_v1.07.47)
- **Backward compatibility**: 新增的 request_id/message_trace_id 字段可能影响旧版接收端解析
- **Auto-assignment conflicts**: 自动分配可能与手动分配冲突
- **Trace context propagation**: request_id 传递链路可能中断（webhook → pipeline → notify）
- **Environment variable management**: 新增 CHATFLOW_HANDOFF_AUTO_ASSIGN_OWNER 需要文档说明

## New Risks from Phase 18 / 包 2 (Pro_v1.07.48)
- **Assignment strategy complexity**: 三种分配模式增加配置复杂度
- **Round-robin stability**: 基于 session_id 哈希的分配可能不够均匀
- **Tag mapping parsing**: TAG_MAP 环境变量解析可能失败（格式错误）
- **Fallback logic**: by_tag 模式的回退逻辑可能不够清晰
- **Debug metadata bloat**: 新增 assign_mode/assign_reason 字段增加响应大小

## New Risks from Phase 18 / 包 3 (Pro_v1.07.49)
- **Memory growth**: 进程内分配历史追踪可能造成内存泄漏（有上限控制）
- **Agent status staleness**: 环境变量中的坐席状态可能过时（需要重启更新）
- **Least-recent accuracy**: 基于进程内历史的 least_recent 策略在重启后失效
- **Sticky TTL complexity**: 粘性分配 TTL 逻辑增加分配复杂性
- **Online agent filtering**: 在线坐席过滤可能意外排除有效坐席
- **Notification payload growth**: handoff notify 新增字段增加 payload 大小

## New Risks from Phase 18 / 包 4 (Pro_v1.07.50)
- **File system dependency**: JSONL 落盘依赖文件系统权限和空间
- **Rotation complexity**: 文件轮转逻辑可能失败（影响后续写入）
- **Data consistency**: 进程重启可能导致分配历史不完整
- **Log ID collisions**: assignment_log_id 短哈希可能冲突（低概率）
- **Performance impact**: 同步文件写入可能影响响应时间
- **Backup management**: 备份文件积累可能占用磁盘空间

## New Risks from Phase 19 / 包 1 (Pro_v1.07.51)
- **File reading errors**: JSONL 文件读取可能失败（权限、损坏）
- **Memory usage**: 流式读取但统计可能消耗内存（大量数据时）
- **Time filter accuracy**: 时间过滤可能不准确（时区、时钟偏移）
- **JSON parsing errors**: 损坏的 JSONL 行可能导致脚本失败
- **Performance**: 大文件处理可能较慢（流式读取缓解）
- **Output format changes**: JSON 输出格式可能不兼容下游工具

## New Risks from Phase 19 / 包 2 (Pro_v1.07.52)
- **Timestamp data quality**: first_pending_at 字段可能缺失或不准确（影响 SLA 计算）
- **Duplicate session handling**: 同 session 重复记录过滤可能误判
- **Percentile calculation accuracy**: p50/p90 分位计算可能不准确（小样本时）
- **SLA target sensitivity**: 默认 15 分钟 SLA 目标可能不适合所有业务场景
- **Timezone handling**: 时间戳时区处理可能不一致
- **Missing data impact**: dropped_missing_timestamps 可能掩盖数据质量问题

## New Risks from Phase 19 / 包 3 (Pro_v1.07.53)
- **Timezone complexity**: 简单时区处理可能不准确（生产环境需要完整 IANA 时区支持）
- **Trend calculation reliability**: 小样本趋势分析可能产生误导性结果
- **Alert false positives**: 警报规则可能产生误报（如低流量时）
- **Date range handling**: 日期范围生成可能受系统时钟影响
- **Performance with large datasets**: 多日数据分析可能较慢（流式读取缓解）
- **Output format stability**: 日报 JSON 结构可能变化影响下游集成

## New Risks from Phase 20 / 包 1 (Pro_v1.07.54)
- **Webhook misconfiguration**: 外呼 webhook URL 误配可能导致警报丢失或发送到错误端点
- **Secret leakage**: CHATFLOW_OPS_ALERT_SECRET 可能泄露（环境变量安全）
- **Throttling bypass**: 简单文件锁节流可能被并发执行绕过
- **Network dependency**: 外呼依赖网络连通性，失败时回退到 stdout 可能不够及时
- **Alert spam**: 即使有节流，频繁变化的 flags 仍可能产生过多警报
- **State file corruption**: .last-alert.json 文件损坏可能导致节流失效

## New Risks from Phase 20 / 包 2 (Pro_v1.07.55)
- **Parameter tuning errors**: 自动调参可能产生错误建议（误调参）
- **Cooldown bypass**: 冷却期可能被手动修改状态文件绕过
- **Aggressive mode risks**: aggressive 模式可能建议不安全的变更
- **State file conflicts**: 多实例运行可能导致状态文件冲突
- **Performance metric reliability**: 基于小样本的性能指标可能不可靠
- **Export command misuse**: 生成的 export 命令可能被误用或误执行

## New Risks from Phase 21 / 选项 B (Pro_v1.07.56)
- **File path security**: 运行时配置文件路径可能指向敏感位置（依赖部署环境）
- **JSON parsing failures**: JSON 解析失败可能导致配置回退，但错误日志可能暴露文件内容
- **SIGHUP availability**: Windows 不支持 SIGHUP，配置重载需重启进程
- **Memory overlay staleness**: 内存覆盖层在进程重启后丢失，需重新加载文件
- **Priority confusion**: 用户可能误解「env 为基底，JSON 仅覆盖文件中出现的键」的优先级规则
- **Whitelist enforcement**: 非白名单键被忽略可能掩盖配置错误
- **Concurrent reload races**: SIGHUP 重载期间可能读取到部分更新的配置

## New Risks from Phase 21.2 (Pro_v1.07.57)
- **Accidental overwrite**: 误开关 CHATFLOW_OPS_AUTOTUNE_WRITE_RUNTIME=1 可能覆盖生产 JSON
- **Merge conflicts**: 深合并策略可能意外覆盖其他手动修改的配置键
- **File permission issues**: autotune 脚本可能没有写入目标文件的权限
- **Timing mismatch**: autotune 写文件后，进程未及时 SIGHUP 导致配置不一致
- **Partial write failures**: 文件写入失败可能导致配置处于不一致状态
- **Whitelist mapping gaps**: autotune 建议的变更可能无法正确映射到运行时配置白名单键

## New Risks from Release Automation Expansion (2026-04-06 evening)
- **Artifact drift**: 多个 zip 产物并存可能导致发错版本（mitigation: `delivery:latest` + SHA256）。
- **Operator over-trust**: 一键脚本成功不代表客户环境已接入（token/HTTPS 仍需 onboarding 执行）。
- **Local environment dependence**: `docs:pdf:162` 依赖本机浏览器打印能力，跨环境可重复性有限。
- **Cleanup misuse**: `delivery:clean` 的 `--keep` 设置过小可能误删需要留档的旧包。

## New Risks from Delivery Message Automation (2026-04-06 late)
- **Stale CI snapshot**: `delivery:message` 读取“最新 ci.yml run”，若刚 push 可能短暂显示 queued/上一条结果（mitigation: 发包前复跑一次该命令确认 completed/success）。
- **Path disclosure risk**: 默认输出本机绝对路径，若对外渠道不适合可改为制品下载链接。
- **Operator copy error**: 人工二次编辑文本可能引入版本/哈希错配（mitigation: 尽量原样复制 `delivery:message` 输出）。

## Pro_v1.06 Known Limitations
- **Session store**: In-memory only, single-process, no TTL expiration
- **JSONL persistence**: Backup accumulation, no automatic cleanup
- **Field extraction**: Regex-based, limited validation (edge cases)
- **FAQ content**: Placeholder seeds, English-only, minimal coverage
- **Intent dispatch**: Placeholder only, no real classification
- **Concurrency**: Single-writer JSONL, session store last-writer-wins

## Mitigation Status (Pro_v1.06)
- ✅ Dual webhook baseline verified intact after changes
- ✅ Compilation passes (npm run build successful)
- ✅ Minimal scope maintained (no state machine, no assignment logic, no handoff integration)
- ✅ Shared pipeline integration (Telegram & Website use same logic)
- ✅ Cross-turn merging tested and working (now across requests!)
- ✅ Evidence alignment verified (session ↔ debug_metadata)
- ✅ Outbound logic tested (partial prompts, captured confirmation)
- ✅ Captured persistence implemented (file-based, failure-safe)
- ✅ Git-ignore prevents real leads in repository
- ✅ In-memory session store enables cross-request continuity (1000 cap)
- ✅ User-visible prompt merge implemented and tested
- ✅ Four-language i18n implemented (zh/en/vi/ms-MY)
- ✅ Empty-reply fallback implemented
- ✅ FAQ matching restored (gate fixed)
- ✅ JSONL rotation implemented (5MB/10k lines)
- ⚠️ Field extraction needs improvement for edge cases
- ⚠️ Session TTL expiration not implemented
- ⚠️ Backup cleanup not implemented
- ⚠️ No validation of extracted/persisted data
- ⚠️ Prompt formatting may need channel-specific adjustments
- ⚠️ i18n translations may need refinement
- ⚠️ FAQ seeds need real content and multilingual support

## New Risks from Phase 22B Closure (Pro_v1.07.62)
- **Historical session residue**: 开关关闭后会阻断新流程推进，但历史内存 session 状态未主动清空，跨轮可能看到旧状态痕迹。

## New Risks from Phase 22C Closure (Pro_v1.07.65)
- **Historical session residue (延续)**：22C 各开关变更后仍**不主动清空**进程内 session；租户侧可能短期看到与旧状态叠加的行为，需运营知晓或后续做显式 session 重置策略。
- ~~**Non-primary suppress/send paths**~~ **Phase 23 收官审计（已核对）**：生产 **channel 用户回复** 仅 **`src/webhooks/*.ts` → `runUnifiedInboundPipeline` → `UnifiedResponse.should_send` → `createChannelSender`（`src/channels/outbound-sender/index.ts`）**；**`real-send` 适配器**无 webhook 外直接调用。**Handoff env suppress** 仅 **`src/channels/conversation-runtime/policy.ts`** + **`src/config/suppress-reply.ts`**，经 pipeline 注入 `suppress_reply_tenant_enabled`。**`src/channels/outbound-sender/mock.ts`** 为测试辅助。**HTTP notify**（lead/handoff）走 **`notify.enabled`**，**非** `bot.enabled` 子集（设计如此）。
- **FAQ fallback scope**：`faq.fallback_enabled` 仅接管 **FAQ resolver 语言/跨语言回落**与 **default 阶段用户原文回显**；**`post_capture` / `capture` 阶段 i18n 引导文案**不在本开关内，产品预期需与文档一致，避免误配。
- **Env vs tenant credential ambiguity**：**租户路径**下 POST/GET 校验已与进程 env **解耦**（22D）；**legacy** 仍依赖 env；**Telegram/Zalo** POST 无 body 验签、与 Meta/Line/Website 行为不一致 — **运维口径见 `docs/175`；租户边界 CI 已 22E 接入**。
- **Phase 22E 尾项（idle GET）— superseded by Phase 23**：**idle GET 保留 200** 为**产品裁决**（选项 A），与 **hub challenge 必配 verify token** 并存；**非矛盾** — 见 **`docs/175`** §「Idle GET — product freeze」与 **`memory/03`**。~~易被误读~~ → 已通过文档冻结缓解。

## Known SaaS MVP boundaries (Phase 23 — accepted, not backlog)

- **Tenant path slug exposure**：`GET /webhooks/t/<slug>/...` — 无效 slug → **404** `tenant_not_found`；有效 slug + idle GET → **200** JSON。存在**租户存在性**推断面；**MVP 接受**，后续若需可改路由/鉴权而非单独「收紧 idle」。
- **Idle GET information surface**：响应含 **`channel`**、**`verification`** 说明串；**无密钥**；与 **legacy** `/webhooks/<channel>` idle 行为同类。**探活**应优先 **`GET /health`**（`src/server.ts`），避免将 webhook URL 当作正式健康契约。

## Phase 23 closure / Phase 24 handoff (2026-04-07)

- **Phase 23 closed**：**SaaS MVP Final Closure** sealed — 见 **`memory/01`**、**`memory/02`**、**`docs/175`**（MVP status 段）。
- **叙事切换**：后续 SaaS 工作为 **Phase 24 — SaaS v1 Hardening**（认证/RBAC、Postgres、多实例 store、凭证安全），**不再**把 MVP 当作未完成功能主线。
