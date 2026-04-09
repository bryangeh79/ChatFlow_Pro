# D-C4B — 恢复后处置决策表（B1 · Operator decision support）

**Phase**：D-C4B **实现（仅 B1+B2 文档）**  
**版本基线**：`package.json` **1.7.106** 起；本表 **不**改 D-C3A / D-C3B / D-C4A 代码语义。  
**性质**：**规程真源**；**不是**修复器、**不是**自动分流服务、**不是** D-C3C。  
**配套**：[`d-c3-operator-runbook.md`](./d-c3-operator-runbook.md) §6 · [`d-c4a-recovery-readonly-check-spec.md`](./d-c4a-recovery-readonly-check-spec.md) · [`d-c4-recovery-consistency-design.md`](./d-c4-recovery-consistency-design.md)  

---

## 0. 使用前必读（门禁）

- **本表的任何格子都不是「许可你执行 D-C3B apply」**。Apply **唯一**合法入口仍是：工单 + env + `--confirm-ticket` + dry-run + [`d-c3b-manual-repair-spec.md`](./d-c3b-manual-repair-spec.md)。  
- **输入信号**：以 `npm run saas:recovery:readonly-check` 产出的 **`overall_tier`** + **`steps`** 为主；并结合 **场景标签**（R1–R7，见 D-C4 §2）与 on-call 判断。  
- **Partial PG restore / 混合时间点备份**：默认 **P0**；在未按书面程序完成定损前，**视同** `freeze_no_go`（见下行「覆盖规则」）。

### 0.1 覆盖规则（tier 与场景冲突时）

| 条件 | 有效结论 |
|------|----------|
| CLI 报 `freeze_no_go` | **以 freeze 为准**，即使主观认为「只是小问题」。 |
| CLI 报 `observe` 或 `manual_d_c3b_only`，但确认 **R3 部分恢复未配对验证** | **升级为 freeze 处置**：停写、升级、**禁止** D-C3B。 |
| CLI 报 `observe`，但确认 **R2 全库回到 T−Δ 且流量曾开放** | **默认不自动接流**；须 **P0/P1 定损 + 书面签字** 后才可进入「有限接流」评估。 |
| `driver=sqljs` / `postgres_only` | **不**作为托管恢复真源；转 **Postgres** 环境重跑 D-C4A，**禁止**仅凭 `observe` 对托管下结论。 |

---

## 1. 主决策表：`overall_tier` × 运维动作

**列说明**

| 列 | 含义 |
|----|------|
| **输入信号** | 以 D-C4A 为主 |
| **风险等级** | P0 = 停写与升级优先；P1 = 可控但须证据；P2 = 低敏观察 |
| **允许动作** | 仅 **只读**、沟通、流程；D-C3B 仅当表内写明且 **另**满足 D-C3 runbook |
| **禁止动作** | 违反则视为事故扩大 |
| **升级** | 是否必须拉 on-call / 管理层 / 书面灾难程序 |
| **可 reopen traffic** | 是否 **允许**开始或恢复 **正常写路径业务流量**（与「健康检查绿」不等价） |

| `overall_tier` | 输入信号（典型） | 风险 | 允许动作 | 禁止动作 | 升级 | 可 reopen traffic |
|----------------|------------------|------|----------|----------|------|-------------------|
| **`freeze_no_go`** | `steps` 中 **ledger 不一致 / 缺迁移**、**state 表缺失**、**核心查询失败**、`dedupe_consistency` **不可完成** | **P0** | 维持/切入 **维护**；只读收集 **ledger、镜像 tag、迁移表**；按交付 SOP 停启；**书面**记录现象 | **任何**对 `tenant_*_dedupe` / state 的 **写**；D-C3B apply；批量 repair；**降** readiness 门禁；「先接一单试试」 | **是** | **否** |
| **`manual_d_c3b_only`** | 1–2、4 步无 freeze，但 **D-C3A stale 行 > 0**（dedupe 候选） | **P1**（默认） | **只读**：跑 **D-C3A** 报告到 **具体行**；对齐 **D-C1 日志 + 渠道**；**逐键** dry-run；**仅**在 D-C3 runbook §3 全满足时 apply | **无** ticket/env/**无** dry-run 的 apply；批量 completed；**无证据** `release_for_retry`；用 **对外重发** 代替闭合 | 若 stale **激增** 或伴 **CAS 异常风暴** → **是** | **仅当** 同时满足：无未关闭 P0、§3.1 最低标准、**逐键**闭环已 **书面**确认；**且** tier 经重跑 D-C4A **仍**不是 freeze |
| **`observe`** | 本 pack 内 **无**上述冻结条件；stale **未**达 reporting 阈值或 **0** 行 | **P2～P1** | 继续 **只读**监控；补全 D-C4 §3.1 **书面**勾选；核对 JSONL 与 PG **时间点差**并 **记录** | **因 observe  alone** 认为「可接流」；跳过 §3.1；跳过渠道/日志核对；对 **可疑** dedupe **直接** apply | 若存在 **R4/R5** 声明 unresolved → **是** | **否**，直到 **§3.1 六项 + §7（D-C4）** 与变更单 **书面**通过 |

---

## 2. 场景增强表（R1–R7）：与 tier 的交叉检查

在已定 `overall_tier` 基础上，用本表 **收紧** 允许动作（场景真源：D-C4 §2）。

| 场景 ID | 一句话识别 | 须在决策表基础上的 **额外禁止** | **升级** | **reopen traffic** |
|---------|------------|-----------------------------------|----------|---------------------|
| **R1** | 仅应用 rollback，PG 未动 | 在 ledger 对齐前 **禁止**因「以前能跑」而接流 | 版本不一致时 **是** | 仅当 ledger + readiness **书面** OK |
| **R2** | 全库 PG restore 到 T−Δ | **禁止**自动「对齐」DB 与外部世界；**禁止**批量抹平 | **是** | **否**，直至定损与 §3.1 **书面** |
| **R3** | 单表 / 部分 PG restore | **禁止** D-C3B **与** 正常业务写，直至 **配对验证** 程序完成 | **是** | **否**（默认） |
| **R4** | JSONL 与 PG **不同刻** | **禁止**自动删/改 JSONL **或**改 PG「凑」JSONL | 建议 **是** | 须 **P1 风险接受** 书面 |
| **R5** | PG 新、JSONL 丢 | **禁止**伪造 JSONL | 视业务 **是/否** | 只读确认 + **丢失范围** 书面后可 **逐步** |
| **R6** | 迁移未完全 apply | **禁止**手工改 `saas_schema_migrations`；**禁止**降门禁 | **是** | **否** |
| **R7** | restore 后 stale processing 多 | **禁止**无证据 completed；**必须** D-C3A 清单 + 日志 |  spike 异常时 **是** | 同 `manual_d_c3b_only` 行 |

---

## 3. 「绝对不能自行动手」清单（与 D-C4 §4.2 对齐）

以下 **无论 tier 显示什么**，**单人**不得执行（须升级 + 书面程序）：

1. 批量 `UPDATE` dedupe → `completed` / 随意 `DELETE` 清障。  
2. `TRUNCATE` dedupe/state（除书面灾难程序且 **全流量已停**）。  
3. 混合备份时间点（PG 与 JSONL 无配对验证）。  
4. 伪造迁移 ledger。  
5. 降低 readiness / migration 门禁「先接单」。  
6. 用对外 notify/outbound **重发**代替 dedupe 闭合。  
7. 改 idempotency 主键或乱改 **version**。

---

## 4. 书面留痕（验收最低集）

每次 **生产** 恢复相关处置，工单或变更单 **至少**保留：

1. D-C4A **完整输出**（或等价 JSONL 路径 + hash）。  
2. **最终**采纳的 `overall_tier` 与 **R1–R7** 场景标签（若适用）。  
3. **是否 reopen traffic** 的 **签字人 / 时间** 与依据（指向 §1 哪一行 + D-C4 §3.1）。  
4. 若执行 D-C3B：**ticket_id**、审计表查询截图或导出行（**不含** secret）。

---

## 文档状态

| 项 | 值 |
|----|-----|
| **范围** | **B1** 决策表真源 |
| **代码** | **无** |
