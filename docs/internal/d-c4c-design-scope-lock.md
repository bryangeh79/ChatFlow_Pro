# Phase D-C4C — 设计真源 / 范围锁定（Design-only）

**性质**：**设计锁定真源**；**C1+C2 已按实现 Go 落地**（只读 bundle + 门禁文档）；**不是**修复器；**不是** D-C3C；**不是** A/B 扩面重命名。  
**版本基线**：`package.json` **1.7.108** / **Pro_v1.07.108**（D-C4C C1+C2 实现 patch）。  
**前置**：D-C3 **sealed**；D-C3C **冻结**；D-C4A/B/C **completed**；**Phase D-C4 overall closed** — [`d-c4-overall-closeout.md`](./d-c4-overall-closeout.md)。  
**日期**：2026-04-09  

---

## 唯一要答清的问题（钉死）

**在 D-C3B、D-C4A、D-C4B 都已成立的前提下，D-C4C 还要补什么，且为什么不能被三者替代？**

**答**：补的是 **恢复与一致性治理的「可重复机械证明 + 门禁归属」层** — 即 **在不动业务写路径的前提下**，把 **只读信号**（主要来自 D-C4A，及未来允许的 **纯只读** 部署元数据读取）变成 **可挂在 CI/发布流水线/Staging 的验证包** 与 **演练/审计所需的结构化证据口径**。  

| 能力 | D-C3B | D-C4A | D-C4B | D-C4C（本设计所指） |
|------|-------|-------|-------|---------------------|
| 单键受控写 + 审计 | ✅ | ❌ | ❌ | ❌ **不**重复 |
| 恢复后 **单次**只读聚合 + tier | ❌ | ✅ | ❌ | ❌ **不**改 `runRecoveryReadonlyCheck` 语义 |
| 人工分流、runbook、纸面演练清单 | ❌ | ❌ | ✅ | ❌ **不**重复规程正文 |
| **verify 包边界**（哪些只读脚本算「恢复治理回归」） | ❌ | ❌ | ❌ | ✅ **仅此层** |
| **CI/RC/Staging 上何时必须跑、失败是否挡发布** | ❌ | ❌ | 仅叙述 | ✅ **策略真源** |
| **演练/审计用的机器可读证据字段**（文件名、最小 JSON 键、保留期） | ❌ | ❌ | 纸面为主 | ✅ **可选极小模板** |

因此：**D-C4C 不新增「第四种修复引擎」**；它补的是 **长期防漂移** — **不能**被「再多写几段 runbook」替代（B 不定义 **门禁与 bundle**），**不能**被「每次手跑 D-C4A」替代（A 不定义 **流水线契约**），**不能**被 D-C3B 替代（B 是写路径）。

---

## [1] D-C4C Problem Statement

- **问题**：A/B 成立后，现场仍有 **长期缺口**：  
  - **发布回归**：合并/RC **未**强制跑恢复相关只读链 → ledger/tier 语义 **静默退化** 无人知。  
  - **门禁分散**：`verify:d-c4a-*` **存在**，但与 **交付 manifest / deployment-info** 的 **只读**对账 **未**在单一「恢复治理 bundle」里 **写明**。  
  - **证据形态**：D-C4B tabletop **可**执行，但 **缺少**（设计层）**统一**的「归档文件名 / 最小字段」— 审计检索困难。  
- **目标**：用 **最小设计包** 定义 **D-C4C = 只读验证与门禁策略 + 可选证据模板**，**零**业务写。

---

## [2] Why D-C3B / D-C4A / D-C4B Are Not Enough

- **D-C3B**：只回答 **「已决策的键级写」**；**不回答**「每次发布是否仍满足恢复只读基线」。  
- **D-C4A**：回答 **「此刻跑一次」** 的 tier/steps；**不回答**「谁、在何种流水线、以何失败策略 **必须**跑」；**不**内置 deployment tag 与 ledger 的 **bundle 成员表**。  
- **D-C4B**：回答 **「人该怎么做」**；**不回答**「CI 是否挡合并」；**不**把只读检查 **编排** 成 **命名 verify**。  
- **三者之间缺口**：**机械可重复性 + 门禁归属 +（可选）证据 schema** — 即 **D-C4C**。

---

## [3] D-C4C Boundary Lock

| 边界 | 内容 |
|------|------|
| **对 D-C3B** | **零**调用、**零**包装 apply；**禁止**「verify 失败则建议 repair」叙事。 |
| **对 D-C4A** | **不**改 `runRecoveryReadonlyCheck`、CLI 参数、枚举；**允许**在设计中定义 **bundle 包含** 现有 `verify:d-c4a-recovery-readonly-check`（实现时再合）。 |
| **对 D-C4B** | **不**重写决策表/runbook；**仅**可 **引用** 并 **对齐**演练证据字段；B 仍为 **人读** 主真源。 |
| **对 D-C3C** | **禁止**异步补偿、队列重试、自动 completed；D-C4C **仅**只读 + 策略。 |
| **对「恢复修复器」** | **禁止**任何根据 tier **触发写**、半自动 D-C3B、批量 repair。 |

---

## [4] Candidate Scope Options（必须极小）

**优先级：策略 / bundle 定义 / 模板先于代码。**

| ID | 候选（极小） | 交付形态（设计→未来实现） |
|----|----------------|---------------------------|
| **C1** | **只读 verify bundle 规格** | 1 页：成员列表（**至少**含 `build` + `verify:d-c4a-recovery-readonly-check`；**可选**将来只读读 `deployment-info` / manifest 与 migration 摘要比对）；**明确** sqljs 下 **跳过/期望行为** |
| **C2** | **CI / RC / Staging 门禁策略** | 文档：**何时**跑 C1、**失败是否挡** merge 或挡 promote、**不在生产**跑需 DB 的 verify 的默认 |
| **C3** | **演练与审计证据模板** | Markdown/JSON schema **示例**（路径建议、`overall_tier`、`run_id`、操作者 **不含** secret）— **对齐** `d-c4b-delivery-drill-checklist.md` |

**默认不包含（除非另立项）**：新 npm 脚本名 **在实现前不强制**；Redis/队列；Admin API；改 D-C3A 报告格式。

---

## [5] Go / No-Go Conditions

### 可进入 **D-C4C 实现** 的条件

- Bryan **书面确认** 候选 ⊆ **§4 C1–C3**；  
- 明确 **bundle 内** 仅 **只读** + 现有 verify **组合**，**无** `execute`；  
- **不**要求 D-C4A 改语义。

### 应 **停留在设计** 的条件

- 讨论滑向「verify 里顺便 close 掉 stale」或「staging 定时 apply」；  
- 与 D-C2C2 / D-C3C **绑在一起**立项。

### **D-C4C 根本不该立项** 的信号

- 组织 **拒绝**任何 CI 门禁，只接受 **手跑** — 则 C2 无落地价值，**仅保留** C3 纸面亦可；或  
- 要求 D-C4C **同时**交付 **写路径** — 违反本 lock，应 **退回** 重划为别包。

---

## [6] Risks of Mis-scoping

- **把 bundle 做成 triage 服务**：在 verify 输出里 **建议** D-C3B 参数 → 弱修复器。  
- **生产跑需密钥的 verify**：策略须默认 **Staging/CI**；生产 **仅**手跑 D-C4A（与现 runbook 一致）。  
- **与 D-C3 closeout verify 混名**：`verify:d-c3-closeout` **不**替代 D-C4C；**另列** `verify:d-c4c-*`（实现时再定全名）。  
- **ledger 绿 = 可发布**：须 **重复** D-C4 评审包 M5 类提醒 — bundle **不**等价业务一致性。

---

## [7] Final Recommendation

| 结论 | 说明 |
|------|------|
| **D-C4C 定位** | **只读治理回归 + 门禁策略 +（可选）证据模板**；**零**新修复能力。 |
| **C1+C2 已实现** | **只读 bundle** + **CI/RC/Staging 门禁文档** — 见 [`d-c4c-readonly-governance-bundle-spec.md`](./d-c4c-readonly-governance-bundle-spec.md)、[`d-c4c-ci-rc-staging-gates.md`](./d-c4c-ci-rc-staging-gates.md)；npm `verify:d-c4c-readonly-governance-bundle`；**C3** 仅 **示例** JSON。 |
| **历史** | 曾要求「第二次 Go」— C1+C2 已按实现 Go 落地；**仍禁止**修复器/写路径。 |

---

## 文档状态

| 项 | 值 |
|----|-----|
| **阶段** | **D-C4C 子切片 completed** |
| **实现** | **C1+C2 已落地**；**Phase D-C4 overall** 已 **closed** — 见 [`d-c4-overall-closeout.md`](./d-c4-overall-closeout.md) |
