# ChatFlow Pro 商业 SaaS 后台 UX 第二阶段设计真源

## 0) Scope Lock

- 阶段名称：**商业 SaaS 后台 UX 第二阶段设计真源**
- 阶段目标：把“页面看起来像 SaaS”推进到“客户首次配置与日常运营可走通”
- 边界：
  - 仅设计，不改代码
  - 不改后端，不新增页面
  - 不把旧 D-C / E 主线扩面到本阶段
- 版本口径：**1.7.108**（纯设计，不升 patch）

---

## 1) User Journey Map（全局）

### Journey A：首次 Onboarding（首次可用）

1. 进入 `Overview` -> 理解当前状态与下一步
2. 进入 `Settings` -> 打开 `Setup Flow`
3. 按顺序完成：Workspace -> AI -> Channels -> Knowledge -> Test -> Go-live
4. 回到 `Overview` 验证状态条与关键卡片
5. 进入 `Inbox` 开始处理真实会话

### Journey B：Daily Ops（日常运营）

1. 从 `Inbox` 处理会话，识别需转线索/人工接手项
2. 到 `Leads` 进行阶段判断与跟进动作
3. 发生交接时，回 `Inbox` 执行 handoff 相关动作
4. 到 `Reports` 看趋势、异常与优先处理方向
5. 必要时回流到 `Settings` / `Knowledge` / `Channels` 做配置修正

---

## 2) Onboarding Flow（逐步设计）

## Step 1: Workspace / Tenant
- 用户目标：确认租户身份、基础信息无误
- 页面入口：`Settings` -> `Setup` -> `Workspace`
- 必要输入：显示名、时区、slug（或等价基础档案）
- 成功反馈：状态由 `Open` -> `Closed`，出现“已完成”摘要
- 失败/卡点：不知道字段影响范围；保存后无明确结果
- 下一步引导：显式 CTA `Continue setup -> AI`

## Step 2: AI Key
- 用户目标：让 AI 回复链可用
- 页面入口：`Setup` -> `AI`
- 必要输入：API key、模型、基础开关
- 成功反馈：连通性检测结果 + 最近测试时间
- 失败/卡点：测试失败但原因不明确；用户误以为“保存=可用”
- 下一步引导：`Review result` + `Continue setup -> Channels`

## Step 3: Channels
- 用户目标：至少接通一个真实对外渠道
- 页面入口：`Setup` -> `Channels`（联动 `Settings/Channels` 与主导航 `Channels`）
- 必要输入：渠道凭据、回调 URL、测试触发
- 成功反馈：渠道卡从 `Open/Pending` 到 `Closed`，且有最近测试记录
- 失败/卡点：入口多（Setup/Settings/主导航）导致心智分裂
- 下一步引导：当至少 1 个渠道为 `Closed` 时放行 `Continue setup -> Knowledge`

## Step 4: Knowledge
- 用户目标：让 AI 有可引用内容
- 页面入口：`Setup` -> `Knowledge`（联动主导航 `Knowledge`）
- 必要输入：至少 1 条 `Published` FAQ/Article
- 成功反馈：显示“可用于 AI 回复”摘要与条目计数
- 失败/卡点：以为草稿可直接用于回复；状态含义不清
- 下一步引导：`Open Knowledge` + `Continue setup -> Test`

## Step 5: Test
- 用户目标：验证“渠道收发 + AI + 知识”基础链路
- 页面入口：`Setup` -> `Test`
- 必要输入：目标渠道、测试消息、期望结果
- 成功反馈：一次完整测试记录（成功/失败 + 时间 + 简要原因）
- 失败/卡点：只有按钮无可复核记录；失败原因不可执行
- 下一步引导：失败时 `Open Channels / AI / Knowledge`；成功时 `Continue setup -> Go-live`

## Step 6: Go-live
- 用户目标：完成可运营前的最小签核
- 页面入口：`Setup` -> `Go-live` / `Settings` -> `Go-live / Signoff`
- 必要输入：检查项确认、证据链接、责任人
- 成功反馈：状态 `Closed`，Overview 显示可运营
- 失败/卡点：签核路径只给文档，不知道“当前租户是否已通过”
- 下一步引导：`Open Inbox` 开始日常运营

---

## 3) Daily Ops Flow（逐步设计）

## Step A: Inbox
- 用户目标：处理新会话、识别需人工与需转线索项
- 页面入口：主导航 `Inbox`
- 必要输入：搜索/筛选、选会话、执行动作（handoff、状态）
- 成功反馈：会话状态变更、动作可追溯
- 失败/卡点：动作仅占位；用户误以为已执行
- 下一步引导：需要销售跟进时 `Open Leads`

## Step B: Leads
- 用户目标：做阶段判断并安排跟进
- 页面入口：主导航 `Leads` 或 Inbox 侧栏动作
- 必要输入：阶段更新、负责人、跟进动作
- 成功反馈：阶段状态变化 + 时间线记录
- 失败/卡点：可点但不落地；跟进动作无结果反馈
- 下一步引导：需交接时回 `Inbox`，需策略判断时去 `Reports`

## Step C: Handoff（跨 Inbox/Leads）
- 用户目标：把 AI 无法处理的会话转给人工
- 页面入口：Inbox/Leads 的 Quick actions
- 必要输入：交接理由、目标队列/负责人、优先级
- 成功反馈：队列可见、状态变化、可追踪
- 失败/卡点：当前仅占位；看起来能操作但无法闭环
- 下一步引导：人工处理后回 Inbox，周期性回 Reports 看积压趋势

## Step D: Reports
- 用户目标：看趋势、异常、优先处理方向
- 页面入口：主导航 `Reports`
- 必要输入：时间范围、渠道筛选（管理者视角）
- 成功反馈：能定位“下一步应去哪个业务页”
- 失败/卡点：深层下钻未落地；部分范围仍占位
- 下一步引导：`Open Inbox / Leads / Channels / Settings`

## Step E: 回流修正
- 用户目标：修正策略与配置，提升运营质量
- 页面入口：Reports 异常项/Quick links
- 必要输入：进入对应页执行修正
- 成功反馈：下一周期指标改善
- 失败/卡点：修正动作若无真实写入，回流价值会下降
- 下一步引导：回 Reports 验证结果（闭环）

---

## 4) Blocker Map（阻塞点地图）

## A. 认知阻塞
- 用户不清楚 Setup 哪些步骤必须完成、哪些可跳过
- 不理解 `Draft/Published`、`Pending/Open/Closed` 的业务含义
- 不知道 Reports 中“示意数据”与“真实数据”边界

## B. 流程阻塞
- 完成某一步后缺少明确下一步 CTA
- Setup 与主导航入口并存时，用户容易跳出主链路
- Inbox -> Leads -> Handoff -> Reports 的循环路径仍有断点提示不足

## C. 操作阻塞
- 多个动作仍为占位，用户“可点击但不可完成”
- 测试、发布、交接等关键动作缺少可复核结果
- 失败反馈多为提示文本，缺少“可执行下一步”

---

## 5) P0 / P1 / P2 落地清单（真实落地 vs 占位）

## P0（必须真落地）
- Setup 六步中的最小闭环动作：
  - Workspace 保存
  - AI Key 保存 + 测试
  - Channels 至少 1 路接通 + 测试记录
  - Knowledge 至少 1 条 Published
  - Test 结果落库（成功/失败）
  - Go-live 最小签核状态写入
- Inbox/Leads 关键动作最小闭环：
  - handoff 提交
  - lead 跟进状态更新
  - 基础审计记录
- 统一成功/失败反馈（可复核）

## P1（建议真落地）
- Reports 的关键下钻（至少 2 条：Pending -> Inbox、New leads -> Leads）
- Knowledge 的发布/复核动作（Draft -> Published/Needs review）
- Setup 完成度与 Overview 状态条真实联动

## P2（可继续占位）
- 富文本编辑器
- 复杂图表交互
- 高级导出与自定义视图持久化
- 多语言高级治理

---

## 6) 关键问题定稿回答

1. 客户第一次进后台最先看什么？  
   - `Overview` 的统一状态条 + 明确 CTA：`Open Setup Flow`

2. 哪些配置必须按顺序完成？  
   - Workspace -> AI -> Channels -> Knowledge -> Test -> Go-live（P0）

3. 哪些步骤可跳过？  
   - 仅当已有有效配置时可“标记通过”，但必须有可复核依据

4. 最容易“以为配好了其实没配好”的点？  
   - Channels 已保存但未测试、Knowledge 仅 Draft、AI 保存未连通

5. 日常最常用动作链？  
   - Inbox -> Leads -> Handoff -> Reports -> 回流修正（Settings/Knowledge/Channels）

6. 哪些地方最像“看起来能点但做不完”？  
   - handoff、lead follow-up、knowledge publish、test 结果留存、部分 reports 下钻

7. 下一阶段最该先做哪几个真实动作闭环？  
   - Setup P0 六步最小可用闭环 + Inbox/Leads 关键动作写入 + 审计反馈

8. 哪些页面可继续阅读壳，哪些不能再占位？  
   - 可继续壳：Reports 深图表、富文本编辑等  
   - 不能再占位：Setup 关键步骤动作、Inbox/Leads 核心运营动作

---

## 7) Next Implementation Recommendation（实现建议）

- 实施顺序建议：
  1. **P0-1** Setup 最小可用闭环（六步）
  2. **P0-2** Inbox/Leads/Handoff 核心动作闭环
  3. **P1-1** Reports 关键下钻
  4. **P1-2** Knowledge 发布/复核闭环
- 验收门槛：
  - 客户可在首次进入后 30 分钟内完成“可运营启动”
  - 日常运营动作不再出现“可点不可完成”

---

## 8) Final Recommendation

- 结论：**建议放行 UX 第二阶段实现**（先 P0，再 P1）。
- 判定依据：
  - UI 第一阶段已完成（视觉与结构一致）
  - 当前主要风险已转向“动作闭环缺失”，适合进入真实落地阶段
- 边界重申：
  - 本文档是 UX 第二阶段设计真源，不属于 D-C/E 扩面

