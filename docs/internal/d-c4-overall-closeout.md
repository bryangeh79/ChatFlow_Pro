# Phase D-C4 — 总线正式收口（Overall Closeout）

**状态**：**Phase D-C4 overall = closed / sealed**（Bryan 决策：**不再**立项新的 D-C4 后续子线）。  
**Closeout 版本锚点**：`package.json` **1.7.108** / **Pro_v1.07.108**（纯 closeout **不**升 patch）。  
**日期**：2026-04-09  

**历史设计长文**（条款与矩阵仍有效，**不**因收口删除）：[`d-c4-recovery-consistency-design.md`](./d-c4-recovery-consistency-design.md)  
**评审包**：[`d-c4-design-review-package.md`](./d-c4-design-review-package.md)  

---

## 1. D-C4 解决了什么

- **恢复与一致性语境下的最低标准与顺序**：restore/rollback/partial restore 相关的 **只读核查顺序**、异常分级、runbook 黑名单、重新开放流量的 **硬条件**（设计钉在 `d-c4-recovery-consistency-design.md`）。  
- **可重复的只读技术信号（D-C4A）**：Postgres 上 `runRecoveryReadonlyCheck` + CLI + verify；`overall_tier` 三档；**零** `execute`。  
- **人工分流与交付对齐（D-C4B）**：`overall_tier` → 允许/禁止动作的 **决策表**；runbook §6；交付 SOP 与 **演练清单**。  
- **长期防漂移的机械门禁（D-C4C）**：只读 **governance bundle** + **CI/RC/Staging 门禁策略** + 极小证据示例；复用 D-C4A verify，**不**改其语义。  

---

## 2. D-C4 刻意没有解决什么（收口后仍真）

| 领域 | 说明 |
|------|------|
| **D-C3C** | 自动补偿、异步重试队列 — **仍冻结**，**不属于** D-C4 交付范围。 |
| **恢复写修复器 / 批量恢复** | **不**交付；单键写 **仅** D-C3B，门槛不变。 |
| **半自动闭合** | **禁止**；不得把 D-C4A/B/C 输出接成「建议 apply」流水线。 |
| **生产 CI 默认跑** `saas:recovery:readonly-check` | **不**采纳；生产/真实 PG 信号 **仍**手跑 + D-C4B 决策表。 |
| **deployment-info 与运行镜像在线对账** | **未**作为 D-C4C C1 成员；若未来要做，须 **新 phase / 新真源**，**不得**挂靠 D-C4。 |
| **D-C4B B3/B4** | 未承诺；若复活须 **新立项**，**不得**称「D-C4 续作」而不经新 ADR。 |

---

## 3. 子切片交付清单（均为 **completed**）

| 子线 | 交付摘要 | 版本锚点（历史） |
|------|----------|------------------|
| **D-C4A** | `recovery-readonly-check` 模块 + CLI + `verify:d-c4a-recovery-readonly-check`；规格 `d-c4a-recovery-readonly-check-spec.md` | **1.7.106** |
| **D-C4B** | B1 决策表、B2 交付/演练、`d-c3-operator-runbook.md` §6、交付 SOP 交叉引用 | **1.7.107** |
| **D-C4C** | C1 bundle 规格 + orchestrator + npm scripts；C2 门禁文档；CI 接入；证据 JSON 示例 | **1.7.108** |

---

## 4. 为什么 D-C4 到这里应关闭

- **目标已闭环**：从「恢复后事实聚合」→「人工规程」→「回归门禁」三层均已落地，且 **全程**与「**无**业务写路径」一致。  
- **Bryan 明确不再扩面**：不增加 D-C4D/E 等名义续包，避免 **范围 creep** 与「大杂烩补丁池」复发（与原设计 §1 禁止项一致）。  
- **后续增量应显式换名**：任何新能力（例如在线 manifest 对账、Staging 定时 job）若立项，应 **新 phase + 新设计真源**，以便审计与门禁 **清晰归属**。  

---

## 5. 为什么后续不能继续算作 D-C4 扩面

- **命名冻结**：`D-C4*` 在仓库内已绑定 **恢复治理三条线（A/B/C）**；继续堆功能会 **模糊** closeout 边界与 verify 契约。  
- **门禁已写死**：`verify:d-c4c-readonly-governance-bundle` 成员表与 CI 步骤 **不应**在「仍叫 D-C4」的前提下无限膨胀。  
- **与 D-C3 对称**：D-C3 已 **sealed**；D-C4 以 **overall closed** 对齐同一 **封板**纪律。  

---

## 6. Closeout 后运维仍须遵守（不新功能，仅提醒）

- **真源阅读顺序**：本 closeout → 设计长文 §3–§7 → D-C4B 决策表 → D-C4A 规格 → D-C4C bundle 规格与门禁文档。  
- **禁止**：以「D-C4 还有一点没做」在 **未**新立项的情况下 **偷偷**加脚本成员或改 tier 语义。  

---

## 后续主线（**非** D-C 扩面）

- **Phase E** — Hosted v1 Go-Live Gate：**overall closed / sealed** — [`phase-e-overall-closeout.md`](./phase-e-overall-closeout.md)；设计真源仍读 [`phase-e-hosted-v1-go-live-gate-design.md`](./phase-e-hosted-v1-go-live-gate-design.md) · **入口** [`phase-e-hosted-v1-index.md`](./phase-e-hosted-v1-index.md)。**不得**将 E 标为 D-C5 或 D-C 子线。

---

## 文档状态

| 项 | 值 |
|----|-----|
| **Phase D-C4 overall** | **closed** |
| **D-C4A / B / C** | **completed** |
