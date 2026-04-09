# D-C4B — 交付与演练对齐清单（B2）

**Phase**：D-C4B **实现（仅 B1+B2 文档）**  
**版本基线**：`package.json` **1.7.106** 起。  
**目的**：把 **D-C4 恢复治理** 接入 **交付脚本口径** 与 **桌面/演练验收**，**不**新增写路径、**不**改 D-C3A/B/D-C4A 语义。  

**交叉引用**：

- 交付：`docs/internal/backup-restore-sop.md`、`rollback-sop.md`、`install-sop.md`  
- 治理：`docs/internal/d-c4-recovery-consistency-design.md`、`d-c4b-recovery-decision-table.md`  
- CI/门禁：`docs/internal/d-c4c-ci-rc-staging-gates.md`（**Block / manual review / evidence** 与 bundle 入口）  
- 只读工具：`docs/internal/d-c4a-recovery-readonly-check-spec.md`  
- 人工修复：`docs/internal/d-c3-operator-runbook.md`  

---

## 1. 交付路径中「恢复后」统一口径

| 交付动作 | 恢复/变更后 **额外**最低步骤（在既有 verify 之外） |
|----------|-----------------------------------------------------|
| **`npm run delivery:restore`** | 服务按 SOP 启停后 → **Postgres** 上跑 **`npm run saas:recovery:readonly-check`** → 将输出 **附** restore 工单 → 按 [`d-c4b-recovery-decision-table.md`](./d-c4b-recovery-decision-table.md) 分流 → **书面**确认是否满足 D-C4 §3.1 再接流 |
| **`npm run delivery:rollback`** | `delivery:rollback:verify` **通过后** → **仍须**跑 **D-C4A**（rollback 属 R1 类风险）→ 决策表 → **书面**留痕 |
| **`npm run delivery:install`**（净环境） | 常规：`delivery:health:l1` / `l2` / smoke；若后续 **从备份灌库** 或 **非空库接入**，则 **升格** 为恢复路径，**必须** D-C4A + 决策表 |
| **`npm run delivery:backup`** | 备份本身 **不**替代恢复核查；备份完成后 **无**额外 D-C4 步骤（与 D-C4B 无冲突） |

---

## 2. 恢复演练 — 最小步骤（tabletop，**不写库**）

**频度建议**：每季度 **≤1 次**纸面；与 `verify:d-c3-closeout` **独立**（不混验证名）。

| Step | 参与者动作 | 期望证据 |
|------|------------|----------|
| T1 | 选一个场景：**R2**（全库 restore）或 **R1**（仅 rollback） | 场景卡（写 R ID） |
| T2 | 口述 **操作顺序**：先停写 → `build` → `saas:recovery:readonly-check` → 保存输出 | 白板或工单模板 |
| T3 | 给定 **模拟** `overall_tier`（三选一），查决策表 **允许/禁止** | 勾「禁止」项是否识别 |
| T4 | 若 `manual_d_c3b_only`：口述 **下一步** 必须是 D-C3A 逐行 + 证据，**不是**直接 apply | 明确说出 ticket + dry-run |
| T5 | 若 `freeze_no_go`：口述 **禁止** D-C3B 与接流 | 写出升级对象 |
| T6 | 填写 **是否 reopen traffic** 与 **签字栏** | 书面完成 |

**失败标准**：任一参与者认为「observe = 可以接流」或「tier = 允许 apply」→ **演练不通过**。

---

## 3. 验收口径（B1+B2 合包）

| # | 验收项 | 通过条件 |
|---|--------|----------|
| A1 | 范围 | 仅 **文档**；无新业务写路径、无 repair 脚本 |
| B1 | Runbook | `d-c3-operator-runbook.md` §6 可单独执行且与 D-C4A 规格一致 |
| B2 | 决策表 | `d-c4b-recovery-decision-table.md` 覆盖三 tier + R1–R7 + 覆盖规则 |
| C1 | 交付对齐 | backup/rollback/install SOP **显式**指向 D-C4A + 决策表 |
| C2 | 演练 | 本文件 §2 可 **纸面**执行并产生书面记录 |
| D1 | 边界 | 正文 **无**「半自动恢复」「一键闭合」表述 |

---

## 4. 必须书面留痕的字段（与决策表 §4 一致）

- D-C4A 输出归档  
- 场景标签（R1–R7，若适用）  
- reopen traffic 决定与签字  
- D-C3B 执行时的 ticket 与审计引用（若适用）  

---

## 文档状态

| 项 | 值 |
|----|-----|
| **范围** | **B2** 交付 / 演练对齐 |
| **代码** | **无** |
