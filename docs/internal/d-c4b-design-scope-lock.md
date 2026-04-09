# Phase D-C4B — 设计真源 / 范围锁定（Design-only）

**性质**：**设计锁定真源** + **B1+B2 已实现（仅 Markdown/SOP，无代码）**；**不是**修复器；**不是** D-C3C；**不是** D-C3B 扩面。  
**版本基线**：`package.json` **1.7.106**（本实现批为 **纯文档**；是否升 **1.7.107** 由发布流程表决）。  
**前置**：D-C3 **sealed**；D-C3C **冻结**；D-C4 设计 + 评审包已完成；**D-C4A** 只读 recovery check **已实现**。  
**日期**：2026-04-09  

---

## 唯一要答清的问题（钉死）

**在 D-C3B 与 D-C4A 都已成立的前提下，D-C4B 还要补什么，且为什么不能被二者替代？**

**答**：补的是 **恢复与一致性场景下的「人工处置分流 + runbook + 交付/演练对齐」** — 即 **把已有信号与已有工具用可执行的决策链串起来**，并 **强化门禁叙事**，使运维在 **`freeze_no_go` / `manual_d_c3b_only` / `observe`** 与 **D-C3A/D-C3B 工单路径** 之间 **不走样、不跳步、不误用工具**。

| 能力 | D-C3B | D-C4A | D-C4B（本设计所指） |
|------|-------|-------|---------------------|
| 单键 dry-run/apply + 审计 | ✅ | ❌ | ❌ 不重复实现 |
| 恢复后只读聚合 + 分层信号 | ❌ | ✅ | ❌ 不重复实现 |
| **从信号到「该开哪份 runbook / 填哪些工单字段 / 何时停写」的决策表** | ❌（只管执行面） | ❌（只产出 tier + steps） | ✅ **仅此层** |
| 与 **install/upgrade/rollback/backup** 文档的 **逐步交叉引用** | 部分在 D-C3 runbook | 未系统化 | ✅ **文档与流程对齐** |
| **桌面演练脚本（纸面/tabletop）** 与验收勾选 | 有 D-C3 acceptance | 未与恢复 tier 绑定 | ✅ **可选附录** |

因此：**D-C4B 不新增「第三种修复引擎」**；它补的是 **组织与文档层面的最小闭环**，**不能**被「再多跑几次 D-C4A」或「直接上 D-C3B」替代 — 因为 **A 不给处置规程，B 不给恢复语境分流**。

---

## [1] D-C4B Problem Statement

- **问题**：恢复/rollback 后，现场已有 **D-C4A JSON 输出** 与 **D-C3 系列 runbook**，但 **缺少一份专绑恢复语境的、极短的「分流 + 门禁」真源**，易导致：  
  - 看到 `observe` 就 **误以为**可无条件接流；  
  - 看到 `manual_d_c3b_only` 就 **跳过** D-C3A 证据与工单；  
  - 看到 `freeze_no_go` 仍 **手工改表**「试试」。  
- **目标**：用 **最小文档包** 把 **D-C4A 的 `overall_tier` + `steps`** 映射到 **明确的人类动作集合**（停写 / 只观察 / 走 D-C3A→D-C3B），并与 **交付 runbook** 对齐。

---

## [2] Why D-C3B / D-C4A Are Not Enough

- **D-C3B**：解决 **「已知主键 + 已决策动作」** 的 **受控写**；**不回答**「恢复后该不该接流」「freeze 时先查备份还是先看 ledger」。  
- **D-C4A**：解决 **「恢复后只读事实聚合」**；**不回答**「tier 变化后运维话术、工单模板、与 rollback 脚本顺序」—— 这些是 **规程**，不是 SQL。  
- **二者之间缺口**：缺少 **显式分流表 + runbook 附录 + 可选演练清单**，即 **D-C4B**。

---

## [3] D-C4B Boundary Lock

| 边界 | 内容 |
|------|------|
| **对 D-C3B** | **不**扩 action、**不**批量封装、**不**降低 ticket/env/confirm 门槛；仅 **引用** 既有 CLI 与规格。 |
| **对 D-C4A** | **不**改 `runRecoveryReadonlyCheck` 语义与输出枚举；仅 **消费** `overall_tier` / `steps` 做 **文档映射**。 |
| **对 D-C3C** | **不**自动补偿、**不**异步重试队列、**不**「建议 closed」自动生成。 |
| **对「恢复修复器」** | **禁止**任何半自动闭合、脚本接 D-C3B apply、或「一键解冻」叙事。 |

---

## [4] Candidate Scope Options（必须极小）

**优先级：文档 / 流程先于代码。**

| ID | 候选（极小） | 交付形态 |
|----|----------------|----------|
| **B1** | **恢复后处置分流表** | 1～2 页 Markdown：`overall_tier` × 场景（R1–R7 引用 D-C4 设计）→ **允许动作 / 禁止动作 / 下一工具** |
| **B2** | **`d-c3-operator-runbook.md` 附录** | 「Post-restore」一节：先跑 `saas:recovery:readonly-check`，再按 tier 指向 D-C3A/D-C3B 或停写 |
| **B3** | **交付脚本交叉引用** | 在现有 install/rollback/backup 文档中 **增加指向** D-C4A CLI + 分流表（**不改脚本行为**） |
| **B4** | **桌面演练 checklist** | 与 D-C3 acceptance 类似，**纸面**绑定：`freeze` 演练、`manual_d_c3b_only` 演练（**无**新 verify 代码亦可） |

**默认不包含（除非另立项）**：新 npm 脚本、新 TS 模块、新 verify、Admin API。

---

## [5] Go / No-Go Conditions

### 可进入 **D-C4B 实现** 的条件（若未来做「实现」，也应仅限文档合入）

- Bryan **书面确认** 候选范围 ⊆ **§4 B1–B4**；  
- 明确 **不**要求新写路径、**不**改 D-C4A/D-C3 代码；  
- 有 **owner** 做 PR 评审「是否出现半自动修复暗示」。

### 应 **停留在设计** 的条件

- 讨论滑向「加一个小脚本帮 apply」或「tier 自动开 ticket」；  
- 与 D-C2C2 / D-C3C 范围 **搅在一起**。

### **D-C4B 根本不该立项** 的信号

- 组织决定 **仅**用口头传 runbook、**拒绝**任何文档入库；或  
- 要求 D-C4B **同时**交付代码 — 则违反本 scope lock，应 **退回重划** 为别包。

---

## [6] Risks of Mis-scoping

- **把 D-C4B 做成「智能 triage 服务」** → 漂移为弱补偿。  
- **在文档里写「若 tier=X 则建议执行 D-C3B apply」** → 无工单门禁，等同操作许可。  
- **与 partial restore 共存时未强调 P0** → 分流表 **必须**保留 D-C4 **freeze** 口径。  
- **ledger ready = 接流** 再次出现 → 分流表须 **重复** M5 类提醒（见评审包）。

---

## [7] Final Recommendation

| 结论 | 说明 |
|------|------|
| **D-C4B 定位** | **恢复语境下的 operator decision support + runbook/交付对齐**；**零**新修复能力。 |
| **B1+B2** | **已按实现 Go 文档落地**（见 `d-c4b-recovery-decision-table.md`、`d-c4b-delivery-drill-checklist.md`、runbook §6、交付 SOP）。 |
| **B3/B4** | **未**承诺；须 **另**门禁。 |
| **历史** | 曾要求「设计 Go」与「实现 Go」区分 — B1+B2 已实现 **仅文档**。 |

---

## 文档状态

| 项 | 值 |
|----|-----|
| **阶段** | **D-C4B 子切片 completed** |
| **实现** | **B1+B2 已落地（仅文档）**；**Phase D-C4 overall closed** — [`d-c4-overall-closeout.md`](./d-c4-overall-closeout.md) |
