# Phase D-C4 — 设计真源：恢复后一致性治理

**总线状态**：**closed** — 收口与封板见 [`d-c4-overall-closeout.md`](./d-c4-overall-closeout.md)（**不再**立项 D-C4 后续子线；下文条款仍为 **历史真源**）。  

**性质**：**设计长文**（实现已按 A/B/C 子切片交付完毕）；**不**等于 D-C3C（自动补偿）。  
**前置**：Phase **D-C3 已关闭**（只读定位 + 单键人工闭环 + 审计 + `verify:d-c3-closeout`）。  
**版本锚点**：设计稿首次携带 **1.7.105**；总线 closeout 锚 **1.7.108**。  
**日期**：2026-04-09  
**评审收口**：[`d-c4-design-review-package.md`](./d-c4-design-review-package.md)

---

## [1] Phase D-C4 Scope Lock

### 本轮 D-C4 **要做**（设计层面）

- 定义 **restore / rollback / partial restore** 之后，**一致性恢复的最低标准**（可验收语句）。
- 规定 **dedupe / state / audit / JSONL / backup** 五类持久化面之间的 **只读核查顺序** 与 **产物**（报告/门禁/人工门槛）。
- 将恢复后异常分级：**仅告警**、**允许 D-C3B 单键闭合**、**必须停写/冻结/升级**。
- 列出 **runbook 危险动作黑名单** 与 **重新开放流量** 的硬条件。
- 给出 **D-C4A / D-C4B / D-C4C** 建议实现拆包顺序（供立项用）。

### 本轮 D-C4 **禁止**

- 自动补偿、D-C3C、UI、公开管理 API、Redis/队列/cron、批量 repair。
- 修改 **D-C3 已收口** 工具逻辑（`dedupe-consistency-readonly`、`dedupe-manual-repair`、相关 verify）。
- 回头重开 **D-C2C2** 或把 D-C4 写成「大杂烩补丁池」。
- **默认**引入新基础设施（若未来实现需新依赖，须单独 ADR）。

---

## [2] Recovery Consistency Gap Matrix

**列说明**

| 面 | 含义（本设计口径） |
|----|---------------------|
| **PG dedupe** | `tenant_inbound_dedupe` / `tenant_outbound_dedupe` / `tenant_notify_dedupe` |
| **PG state** | `tenant_session_state` / `tenant_processing_state` / `tenant_delivery_state` |
| **PG audit** | `dedupe_manual_repair_audit_events`、`break_glass_audit_events`、`tenant_admin_principal_audit_logs`、`tenant_credential_rotation_events`、平台相关 PG 表等 |
| **JSONL** | 进程内约定路径的 lead/handoff/assignments 等落盘文件（若部署启用） |
| **Backup / ledger** | 备份集时间戳、**`saas_schema_migrations` 迁移版本**、交付包 `deployment-info` / 运行镜像版本 |

**行：典型恢复场景 → 最可能裂隙 → 风险等级 → 默认可做动作**

| ID | 场景 | 最可能裂隙 | 风险 | 默认可做（设计口径） |
|----|------|------------|------|----------------------|
| R1 | **仅应用 rollback**（镜像/二进制回退，**未**动 PG） | 代码期望 schema **旧于** DB 或 **新于** DB；readiness 误绿 | **P0–P1** | **先**只读核对 migration ledger vs 运行版本（见 §3 顺序）；不满足则 **停写** |
| R2 | **全库 PG restore 到 T−Δ** | dedupe **落后于** 已对外产生的副作用（用户已收消息但本地显示 duplicate）；state **回滚**导致会话重复执行 | **P0** | **停流量** → 只读矩阵核查 → **禁止**自动「对齐」→ 人工定损 |
| R3 | **单表 / 部分 PG restore** | 表间 **外键/逻辑引用** 断裂；dedupe 与 state **时间线不一致** | **P0** | **默认禁止**该操作除非 runbook 有 **显式配对步骤**；否则 **冻结写** |
| R4 | **JSONL 从备份还原，与 PG 时间点不一致** | 坐席/报表与 DB 会话 **分叉**；重复 notify 风险（若上游重放） | **P1–P2** | **告警 + 人工**；**不**自动删 JSONL **不**自动改 dedupe |
| R5 | **PG 最新 + JSONL 丢失（空目录）** | 丢审计/运营轨迹；**不一定**丢幂等（若仅靠 PG） | **P1** | **可**在只读确认后逐步开放；**记录**丢失范围；**不**伪造 JSONL |
| R6 | **迁移未完全 apply 即接流量** | 半 schema 运行；dedupe/state **部分不存在** | **P0** | **readiness 必须失败**；**禁止**手工跳门禁 |
| R7 | **restore 后大量 stale `processing` dedupe** | 与 D-C3 相同：**可能**是慢请求或 **已下游成功未闭合** | **P1（告警）** | **沿用 D-C3A** 清单 + 日志；**仅**在证据下 **D-C3B** 单键 |

**「最危险裂隙」（钉死）**  
与 D-C3 一致，恢复场景下仍优先：**G1/G2 类 — 下游已成功、本地 dedupe 未闭合**；以及 **R2/R3 类 — 时间线混叠导致的双发或重复副作用**。恢复 **放大** 了「DB 与真实世界不同步」窗口，故 **P0 停写** 门槛要更严。

---

## [3] Recovery Policy Spec

### 3.1 一致性恢复「最低标准」（可验收）

在声明 **恢复完成** 前，须 **书面**（工单/runbook 勾选）满足：

1. **版本一致**：运行镜像/二进制 **所期望** 的 migration 集合 ⊆ 实际 `saas_schema_migrations`（或等价 ledger）；无 R6。  
2. **PG 基线**：`tenants` 等核心引用存在；关键表 **可查询**；无已知 **半迁移** 错误。  
3. **幂等基线**：dedupe 表 **无主键破坏**；对 **可疑行** 已跑 **D-C3A 类只读报告**（或等价 SQL）并有 **owner 签字**。  
4. **状态基线**：若使用外置 state，已 **只读** 检查是否存在 **明显 cas/version 异常聚集**（阈值由运维定义，本设计不实现自动化）。  
5. **JSONL 声明**：JSONL 若启用 — 已记录 **restore 点** 与 PG **是否同刻**；若不同刻 — **已标为 P1 风险接受** 或 **未开放流量**。  
6. **重新开放流量**：满足 **§7** 全部硬条件。

### 3.2 只读核查顺序（钉死）

**必须按序**；前一步未通过 **不得**做后一步的「修复型」动作（只允许继续只读或停写）。

| 顺序 | 核查对象 | 目的 | 工具/产物（当前仓库） |
|------|----------|------|------------------------|
| **1** | **Backup / ledger / 版本** | 防 R1/R6 | 交付脚本、`saas_schema_migrations`、镜像 tag；**readiness** |
| **2** | **PG 核心表可访问性** | 防半迁移、连接错误 | SQL 探针、health |
| **3** | **Dedupe** | 防幂等语义崩塌 | **D-C3A** `saas:dedupe:consistency:report`（Postgres） |
| **4** | **State 三层** | 防会话/阶段分叉 | D-C4A `pg_state_counts` 只读 COUNT（**阈值判定仍人工**） |
| **5** | **PG audit 表** | 知悉最后审计点；**不**强求与 JSONL 对齐 | 只读 MAX(ts) / 行数 |
| **6** | **JSONL** | 防 R4/R5 | 文件存在性、mtime、与 PG restore 点 **差值记录** |
| **7** | **交叉结论** | 分级 | 填入 incident 单：P0/P1/P2 |

### 3.3 异常分级与动作

| 级别 | 含义 | 允许动作 | 禁止动作 |
|------|------|----------|----------|
| **观察-only** | 不确定是否影响安全 | 告警、加监控、扩日志采样 | 批量 UPDATE、自动 completed、自动删 dedupe |
| **D-C3B  eligible** | **单键**、证据充分、工单齐全 | **沿用 D-C3B** dry-run → apply | 范围修复、跳过 dry-run、无 ticket |
| **停写 / 冻结** | 版本不匹配、表不一致、疑似双发窗口 | **切维护**、禁 webhook 入口或全局拒信、升级 on-call | **继续正常写** dedupe/state **假装正常** |

### 3.4 哪些「只能观察不能修」

- **R2 全库回滚后**「用户已在外部世界收到的内容」与 DB 的 **语义差** — **不可**靠批量改表「抹平」。  
- **JSONL 与 PG 时间点不一致** 导致的 **历史报表偏差** — **优先**文档化与告警，**不**自动改 PG 去「凑」JSONL。  
- **D-C3A 列出的 stale processing** — **在无日志/渠道证据前** — **只观察**（与 D-C3 真源一致）。

---

## [4] Incident / Runbook Spec

### 4.1 事件类型（建议标签）

- `recovery_full_pg` / `recovery_partial_pg` / `rollback_app_only` / `jsonl_restore_mismatch` / `migration_drift` / `post_restore_dedupe_spike`

### 4.2 Runbook **必须禁止**的危险动作（黑名单）

1. **无工单、无 dry-run** 的 **批量** `UPDATE tenant_*_dedupe SET status='completed'`。  
2. **TRUNCATE** dedupe/state 表 **以清障**（除经书面灾难程序且 **全流量已停**）。  
3. **混合时间点**：从备份 A 恢复 PG、从备份 B 恢复 JSONL **且无**配对验证。  
4. **手工改** `saas_schema_migrations` **伪造**已迁移。  
5. **降低** readiness / migration 门禁 **以先接单**。  
6. **用对外重发**（notify/outbound）**代替** dedupe 闭合。  
7. **改 idempotency 主键 / 乱改 version**（与 D-C3 黑名单对齐）。

### 4.3 恢复后 **必须先做** / **不准先做**

- **先做**：§3.2 顺序 **1→2**；readiness；版本对齐记录。  
- **不准先做**：在未完成 **1→2** 前 **对 dedupe 做任何写**；**不准**先「跑一单真实用户流量试试」。

---

## [5] Verification / Drill Spec

### 5.1 设计期验收（本轮可执行）

- 评审本文件 + D-C3 closeout + D-C3 operator runbook **无矛盾**。  
- 桌面演练：选一场景 R1–R7，填写 **矩阵行 + 分级 + 是否 D-C3B**。

### 5.2 未来实现期（D-C4x）建议

- **Tabletop drill**：每季度 **1 次** R2 纸面演练（不写库）。  
- **自动化**：仅 **只读** 脚本扩展（例如 state 采样、ledger 与镜像 tag 比对），**不**与「自动修复」耦合。  
- **不**把 drill 与 D-C3 `verify:d-c3-closeout` 混为一谈；D-C4 drill **另列** verify 名（实现时再定）。

---

## [6] Suggested Build Order（D-C4A / B / C）

| 分包 | 内容 | 依赖 | 备注 |
|------|------|------|------|
| **D-C4A** | **恢复后只读核查 pack** — **已落地**：[`d-c4a-recovery-readonly-check-spec.md`](./d-c4a-recovery-readonly-check-spec.md)（`runRecoveryReadonlyCheck` + CLI） | D-C3A 已存在 | **不改** D-C3B 语义 |
| **D-C4B** | **B1+B2 文档实现**：[`d-c4b-recovery-decision-table.md`](./d-c4b-recovery-decision-table.md) + [`d-c4b-delivery-drill-checklist.md`](./d-c4b-delivery-drill-checklist.md)；runbook [`d-c3-operator-runbook.md`](./d-c3-operator-runbook.md) §6；交付 SOP 交叉引用。设计锁定见 [`d-c4b-design-scope-lock.md`](./d-c4b-design-scope-lock.md) | D-C4A 已落地 | 仍 **无**自动修复 |
| **D-C4C** | **C1+C2 已落地**：[`d-c4c-readonly-governance-bundle-spec.md`](./d-c4c-readonly-governance-bundle-spec.md) + [`d-c4c-ci-rc-staging-gates.md`](./d-c4c-ci-rc-staging-gates.md)；`verify:d-c4c-readonly-governance-bundle`。设计锁定 [`d-c4c-design-scope-lock.md`](./d-c4c-design-scope-lock.md) | D-C4B 已落地 | **不**引 Redis/队列；**非**修复器 |

**分包顺序**：A→B→C **已按序 completed**；**Phase D-C4 overall** **已 closed** — [`d-c4-overall-closeout.md`](./d-c4-overall-closeout.md)（**不再**立项 D-C4 后续子线）。

---

## [7] Risk / Gap Notes

- **单真源错觉**：restore 后 PG 与 JSONL **可能永远不完全同刻** — 设计接受 **文档化差值**，**不**追求静默自动对齐。  
- **Partial restore 极高风险**：默认 **不推荐**；若业务强制需要，须 **单独** 程序设计（超出 D-C4 第一版实现范围）。  
- **D-C3C 仍冻结**：任何「恢复后自动 reconcile」**不属于**本设计默认路径。  
- **D-C2C2**：保留策略/cleanup **仍**未放行；恢复后磁盘膨胀 **不**在本文件解决。

---

## [8] 核心问题自检（七问钉死）

| # | 问题 | 结论（本设计） |
|---|------|----------------|
| 1 | restore/rollback 后 **最危险**裂隙？ | **时间线混叠**下的 **双发/重复副作用** + **G1/G2（下游已成功、dedupe 未闭）** 在恢复窗口放大。 |
| 2 | dedupe/state/audit/JSONL/backup **核查顺序**？ | **§3.2**：ledger/版本 → PG 可访问 → **dedupe（D-C3A）** → state → audit → JSONL → 交叉分级。 |
| 3 | 哪些异常 **只能观察**？ | 无证据的 stale processing；JSONL/PG 时间差；全库回滚后的「外部已发生」语义差。 |
| 4 | 哪些可 **沿用 D-C3B**？ | **单键**、证据链齐全、工单+env+确认、且 **非** P0 停写场景下的 dedupe 闭合/受控 release。 |
| 5 | 哪些必须 **停写/冻结**？ | migration/版本不一致（R1/R6）；partial PG restore 未配对验证（R3）；确认双发窗口未关闭（R2 处置期）。 |
| 6 | runbook **黑名单**动作？ | **§4.2** 七类（批量 completed、TRUNCATE、混备份、伪造 ledger、降门禁、重发代闭合、改主键/version）。 |
| 7 | 什么算 **可重新开放流量**？ | **§3.1 最低标准** 六项全满足 + **无未关闭 P0** + on-call **书面**确认（或等价变更单）。 |

---

## 与 D-C3 的关系（只增不减）

- **D-C3 已关闭**：不扩自动补偿/批量/UI。  
- **D-C4** 在 **恢复语境** 下 **复用** D-C3A/B 的 **能力**，**不**改变其 **工具契约**。  
- **D-C3C** 仍 **不是** D-C4；D-C4 **不**预设自动补偿。

---

## 文档状态

| 项 | 值 |
|----|-----|
| **Phase D-C4 overall** | **closed** — [`d-c4-overall-closeout.md`](./d-c4-overall-closeout.md) |
| **D-C4A** | **completed** — `d-c4a-recovery-readonly-check-spec.md` |
| **D-C4B** | **completed** — B1+B2 文档与 SOP |
| **D-C4C** | **completed** — C1+C2 只读 bundle + 门禁文档 |
| **本文件** | **设计真源（保留）** — §1–§8 条款与矩阵仍有效 |
