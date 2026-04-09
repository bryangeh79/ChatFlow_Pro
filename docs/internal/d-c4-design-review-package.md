# Phase D-C4 — 设计评审收口包（Review Package）

**性质**：**评审入口**；**不是**开工许可；**不是**实现交付。  
**上游真源**：[`d-c4-recovery-consistency-design.md`](./d-c4-recovery-consistency-design.md)（完整设计）。  
**版本**：`package.json` **1.7.105**（**不**因本包升 patch）。  
**日期**：2026-04-09  

**读者**：Bryan / 工程负责人 — 用于 **放行或拒绝 D-C4A 实现** 的显式决策，而非自动进入编码。

---

## [1] D-C4 Review Scope

| 项 | 内容 |
|----|------|
| **本包回答** | D-C4 解决/不解决什么；D-C4A **最小候选**边界；评审 checklist；误判与漂移风险；D-C4A **Go/No-Go** 条件；**六问**钉死。 |
| **本包不回答** | 具体排期、实现 PR 设计、新表结构、自动化修复算法。 |
| **当前阶段** | **D-C4 设计评审阶段** — D-C3 **sealed**；D-C4A **未启动实现**。 |
| **与 D-C3C** | **D-C4 ≠ D-C3C**；本包 **绝不**构成自动补偿立项依据。 |

---

## [2] What D-C4 Solves / Does Not Solve

### 2.1 本设计解决什么

- **语义**：在 restore / rollback / partial restore 之后，用 **可验收** 的语言定义 **一致性恢复最低标准** 与 **只读核查顺序**（ledger → PG → dedupe → state → audit → JSONL → 定级）。  
- **分级**：哪些异常 **只告警**、哪些 **可走 D-C3B 单键**、哪些 **必须停写/冻结**。  
- **Runbook 边界**：恢复动作 **黑名单** 与 **重新开放流量** 条件（见上游设计 §3–§7）。  
- **拆包建议**：D-C4A/B/C **建议顺序**（仅规划，非承诺）。

### 2.2 本设计不解决什么

- **不**提供自动补偿、批量 repair、UI、公开 API、Redis/队列。  
- **不**替代 **D-C3B** 的人工闭环与工单门控。  
- **不**消除 **partial restore**、**PG/JSONL 时间点不一致** 的根本风险 — 仅 **暴露与分级**。  
- **不**保证「多跑脚本」即安全 — **recovery check ≠ repair**。

### 2.3 为什么现在还不能直接开工

1. **设计到实现存在漂移面**：脚本易被误用为「恢复修复器」；须先 **评审** 锁边界。  
2. **D-C4A 若不做 scope lock**，最小增量也会滑向 **写路径** 或 **扩大 D-C3B 语义**。  
3. **Bryan 显式放行** 是刻意门禁 — **本评审包不是许可**。

---

## [3] D-C4A Candidate Scope Lock（极小候选包）

**D-C4A 若放行，允许且仅允许：**

| 允许 | 说明 |
|------|------|
| **恢复后只读核查 pack** | 文档化清单 + 与上游 §3.2 **顺序一致** 的检查步骤；输出 **只读报告**（stdout/JSON 文件均可，**不写**业务表）。 |
| **可选只读脚本** | 例如：migration ledger vs 期望集合比对模板、state 三层 **SELECT** 聚合、JSONL 存在性/mtime **列举** — **仅只读**。 |

**D-C4A 必须同时满足：**

| 约束 | 说明 |
|------|------|
| **不改 D-C3A / D-C3B 既有语义** | 不修改 `dedupe-consistency-readonly.ts`、`dedupe-manual-repair.ts` 行为；**可**从 pack **调用**已有 CLI（如 `saas:dedupe:consistency:report`）作为步骤之一。 |
| **不产生任何写修复路径** | **无** `UPDATE`/`DELETE`/`INSERT` 进业务或 dedupe/state 表；审计表 **仅**若未来单独 ADR 允许，**本候选包默认不包含**。 |
| **不扩大 D-C3B** | 不新增 action、不批量封装 apply、不把 D-C4A 输出标为「建议自动修复」。 |

**若评审认为以下任一条无法满足 → D-C4A 应 No-Go 或缩回纯文档 pack。**

---

## [4] Review Checklist（Bryan / 工程直接勾选）

| # | 项 | 期望答案（D-C4A 放行前提） |
|---|----|---------------------------|
| C1 | **是否只读？** | 是 — 全链路无业务写。 |
| C2 | **是否会引入新写路径？** | 否 — 默认无 DB 写；若仅写本地日志文件须单独标明且非 PG。 |
| C3 | **是否会扩大 D-C3B 语义？** | 否 — 不增 action、不包装批量 apply。 |
| C4 | **是否会被误用成恢复修复器？** | 风险已命名（§5）；pack 须含 **醒目免责声明** 与 **recovery check ≠ repair** 文案。 |
| C5 | **是否需要新 verify？** | **可选** — 若有只读脚本，建议 **独立** `verify:d-c4a-*`（**仅**在 D-C4A **立项后**再做）；**本评审轮不写**。 |
| C6 | **是否需要新 runbook 附录？** | **建议有** — 在 `d-c3-operator-runbook.md` 或交付 runbook 增加 **「恢复后只读核查」附录**（D-C4A 交付时合入）。 |

---

## [5] Misuse / Drift Risks（风险分歧点清单）

| # | 误判点 | 正确定位 |
|---|--------|----------|
| M1 | **D-C4 = D-C3C** | **否** — D-C4 是 **恢复语境治理与只读核查**；D-C3C 是 **自动补偿**（冻结）。 |
| M2 | **D-C4A = 自动补偿** | **否** — D-C4A 仅为 **只读 pack ± 只读脚本**。 |
| M3 | **recovery check = repair** | **否** — 核查输出 **不得**被脚本自动接 D-C3B apply。 |
| M4 | **partial restore 多跑脚本即可** | **否** — partial restore **默认 P0 风险**；脚本 **不能**掩盖表间不一致。 |
| M5 | **ledger ready = 恢复完成** | **否** — ledger 只说明 **schema 迁移**；**不等于** dedupe/state/JSONL **业务一致**或 **可接流量**（见上游 §3.1 / §7）。 |
| M6 | **D-C4A 输出「建议 closed」** | **禁止** — 易滑向无工单修复；**仅允许**「观察到异常等级 + 指向 D-C3A/B 人工流程」。 |

---

## [6] Go / No-Go Conditions for D-C4A

### 6.1 Bryan 应 **显式放行** D-C4A 的条件（建议同时满足）

1. 上表 **C1–C4** 评审为 **通过** 或 **有条件通过**（条件写入变更单）。  
2. **实现范围** 不超过 §3 候选包（**只读 pack + 可选只读脚本**）。  
3. 已指定 **owner** 与 **验收**：例如「staging 一次 R1 桌面演练 + 输出物归档」。  
4. **不**在本包上附带「顺便做 D-C3C / 批量 repair」等范围 creep。

### 6.2 应 **No-Go** 或 **暂缓** 的典型原因

- 无法承诺 **零业务写** 或无法排除 **误用为修复器**。  
- 需要 **先** 定 partial restore 生产程序（尚无）却要先上脚本。  
- 希望 D-C4A **自动调用** D-C3B 或 **批量** 生成 repair 工单以外的可执行写操作。  
- **无** runbook 附录计划，易导致现场自解释脚本。

---

## [7] Final Recommendation

| 结论 | 说明 |
|------|------|
| **本评审包** | 将 D-C4 从「仅有设计长文」收口为 **可表决** 的 **D-C4A 最小候选 + checklist + 风险清单**。 |
| **默认 posture** | **Phase D-C4 overall = closed** — 见 [`d-c4-overall-closeout.md`](./d-c4-overall-closeout.md)；A/B/C **completed**；**不**再以 D-C4 名义扩线。 |
| **本文件** | 历史评审真源；**曾**明确「评审包≠许可」；实现 **不得**超出评审包 §3 范围。 |

---

## 附录 A — 六问钉死（评审必须通过）

| # | 问题 | 结论 |
|---|------|------|
| 1 | **D-C4 最危险的问题到底是什么？** | **时间线混叠**（备份点 vs 真实世界 vs 多持久化面）导致的 **双发/重复副作用**；以及 **G1/G2** 在恢复窗口放大。 |
| 2 | **为什么 D-C4A 只能先做只读恢复核查？** | 在写路径未评审前，**任何**自动或半自动写都会 **放大误修复**；只读先 **固定事实与分级**，再 **人工** 走 D-C3B。 |
| 3 | **D-C4A 的最小边界是什么？** | **§3** — 只读 pack + 可选只读脚本；**不改** D-C3A/B 语义；**无**写修复。 |
| 4 | **D-C4A 最容易失控变成什么？怎么防？** | 变成 **恢复修复器** 或 **弱补偿** — 防：**scope lock**、**M1–M6**、checklist **C3/C4**、输出 **禁止「建议 closed」**。 |
| 5 | **哪些恢复异常仍只能靠 D-C3B，而不是新工具？** | **单键** dedupe 闭合 / 受控 `release_for_retry`；**任何**需 **证据+工单** 的 **行级** 处置；**批量/模糊** 场景 **不**做新工具，**停写+升级**。 |
| 6 | **什么条件下 Bryan 才应显式放行 D-C4A？** | **§6.1** 全满足且 **§6.2** 无触发项；并以 **单独 Go 记录** 为准（**本包本身不算**）。 |

---

## 文档状态

| 项 | 值 |
|----|-----|
| **阶段** | **D-C4 评审已完成**；**Phase D-C4 overall closed**（`d-c4-overall-closeout.md`） |
| **D-C4A 实现** | 见 [`d-c4a-recovery-readonly-check-spec.md`](./d-c4a-recovery-readonly-check-spec.md)（**不含**写路径） |
| **D-C4B B1+B2** | 见 [`d-c4b-recovery-decision-table.md`](./d-c4b-recovery-decision-table.md)、[`d-c4b-delivery-drill-checklist.md`](./d-c4b-delivery-drill-checklist.md)（**不含**写路径） |
| **D-C4C** | **C1+C2** — [`d-c4c-readonly-governance-bundle-spec.md`](./d-c4c-readonly-governance-bundle-spec.md)、[`d-c4c-ci-rc-staging-gates.md`](./d-c4c-ci-rc-staging-gates.md)；[`d-c4c-design-scope-lock.md`](./d-c4c-design-scope-lock.md) |
