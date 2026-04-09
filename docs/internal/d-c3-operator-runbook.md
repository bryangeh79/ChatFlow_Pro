# D-C3 — 运维极小 Runbook（D-C3A + D-C3B）

**适用**：Postgres 托管真源（`CHATFLOW_SAAS_DB_DRIVER=postgres`）；`sqljs`/compat **不做**对账与修复真源。  
**真源**：[`d-c3-closeout.md`](./d-c3-closeout.md)  
**恢复后分流（D-C4B）**：[`d-c4b-recovery-decision-table.md`](./d-c4b-recovery-decision-table.md) · [`d-c4b-delivery-drill-checklist.md`](./d-c4b-delivery-drill-checklist.md)  
**Hosted v1 全量上线门禁**：**不**在本 runbook — 见 Phase E 入口 [`phase-e-hosted-v1-index.md`](./phase-e-hosted-v1-index.md)（本文件 **仅** D-C3 对账/单键修复与恢复后 §6 链）。

---

## 1. 什么时候先跑 D-C3A

- 出现 **notify/outbound/inbound** 相关告警或怀疑 **dedupe 悬挂** 时。  
- **任何** D-C3B 操作 **之前**，应用 D-C3A 缩小范围到 **tenant + lane +（可选）key**。  
- 命令示例：

```bash
npm run build
npm run saas:dedupe:consistency:report -- --tenant-id=<T> --lane=notify --stale-minutes=15
```

- **禁止**：把 D-C3A 清单 **当作**「已证实下游成功/失败」— 必须再结合 **D-C1 结构化日志** 与 **渠道侧**。

---

## 2. 什么时候才能跑 D-C3B dry-run

- 已有 **D-C3A 行** 或 **已知主键**（`tenant_id` + `lane` + `channel` 或 `event_type` + `idempotency_key`）。  
- 已有 **ticket_id / operator / reason**（reason 长度满足工具校验）。  
- 命令：`npm run saas:dedupe:manual-repair -- --dry-run ...`（`--help` 查看参数）。

---

## 3. 什么时候允许 apply

**全部**满足才可：

1. **日志/渠道证据**已支持拟执行动作（G1/G2 闭合前须确认 **下游已成功**；`release_for_retry` 须确认 **下游未成功** 且填 **ack + downstream_evidence**）。  
2. 已跑 **dry-run**，输出与预期一致。  
3. 环境：`CHATFLOW_DEDUPE_MANUAL_REPAIR_ENABLED=1`（或 `true`）。  
4. CLI：`--apply` 且 **`--confirm-ticket=` 与 `--ticket-id=` 完全一致**。  
5. 迁移 **`pg_0015`** 已应用，表 **`dedupe_manual_repair_audit_events`** 存在。

apply 后：查审计表对应行（`before_json` / `after_json` / `result`）。

---

## 4. 哪些动作仍然禁止

- 批量修复、改主键、乱改 version、无证据 `completed`、用 **重发 HTTP** 代替闭合。  
- 跳过 D-C3A 与日志核对 **直接** apply。  
- 在 **未确认下游成功** 时对 G1/G2 使用 `release_for_retry`（双发风险）。

---

## 5. Restore / rollback 类问题时：先看什么、不准先改什么

**先看**：

- 部署与 DB **迁移版本**是否一致（`saas_schema_migrations` / 交付 runbook）。  
- **健康与 readiness**（`/saas/v1/health`、托管门禁）。  
- **D-C3A 报告**是否异常增多（回滚后可能出现旧 processing）。  
- **结构化日志**中与 dedupe 相关的 milestone / CAS conflict 行。

**不准先改**：

- **不准**先批量 UPDATE `tenant_*_dedupe` **清 processing**。  
- **不准**先删 dedupe 行「试试能不能好」。  
- **不准**在未比对 **备份/restore 点** 与 **当前主键** 的情况下改 **idempotency_key** 或 **version**。  

恢复顺序应遵循 **交付/rollback 脚本真源**；D-C3 工具 **仅**用于已核对后的 **单键** 治理。

---

## 6. Post-restore / rollback：**先 D-C4A，再按 tier 分流**（Postgres）

**适用**：`CHATFLOW_SAAS_DB_DRIVER=postgres`；**backup/restore**、**delivery rollback**、**PG 全库/部分恢复** 之后（与 §5 互补；**本节约束更细、优先执行**）。

**不适用**：`sqljs` — D-C4A 返回 `postgres_only`；**不得**仅凭该结果对 **托管**恢复下 Go/No-Go（见 [`d-c4a-recovery-readonly-check-spec.md`](./d-c4a-recovery-readonly-check-spec.md)）。

### 6.1 固定操作顺序（可执行）

| Step | 动作 | 说明 |
|------|------|------|
| 1 | **停写或维持维护态** | 在读完 **`overall_tier`** 前，**不要**对生产 dedupe/state 做写操作；Webhook/入口策略按 [`d-c4b-recovery-decision-table.md`](./d-c4b-recovery-decision-table.md)。 |
| 2 | `npm run build` | 与 D-C3 / D-C4A 验证链一致。 |
| 3 | `npm run saas:recovery:readonly-check -- [--stale-minutes=…] [--tenant-id=…] [--max-dedupe-rows=…] [--no-jsonl]` | **只读** pack；顺序对齐 D-C4 §3.2 与 D-C4A 规格。 |
| 4 | **书面留痕** | 将 **完整 CLI 输出**（或 JSONL 路径 + 校验和）附 **工单/变更单**（字段见 `d-c4b-delivery-drill-checklist.md` §4）。 |
| 5 | 读取 **`overall_tier`** | 仅三类：`freeze_no_go` \| `manual_d_c3b_only` \| `observe`。 |
| 6 | 打开决策表并对照 **R1–R7** | [`d-c4b-recovery-decision-table.md`](./d-c4b-recovery-decision-table.md) §0–§2；**禁止**跳步；**禁止**把 tier **当作** D-C3B apply 许可。 |
| 7 | **仅当**决策表允许 **且** §1–§4 门禁全满足 | 方可进入 **§1 D-C3A** → **§2 dry-run** → **§3 apply**。 |

### 6.2 `overall_tier` 与 §1–§5 的边界（钉死）

| Tier | 含义（运维） | 与 D-C3A / D-C3B |
|------|--------------|------------------|
| **`freeze_no_go`** | **不要**开放业务流量；先解 ledger / core / state 缺失 / 查询失败等 P0 | **不要**跑 D-C3B apply；D-C3A **不能**替代 ledger 修复 |
| **`manual_d_c3b_only`** | 存在 **stale dedupe 候选**（D-C3A 子集）；**仅**允许在 **证据 + 工单** 下 **单键** 治理 | **必须**再跑 §1 **缩小到行**；D-C4A **不**替代逐键证据与 dry-run |
| **`observe`** | 本 pack **未见**上述阻断 | **不等于**可接流；须 D-C4 §3.1 **六项书面** + 渠道/日志 + 变更单（见决策表） |

### 6.3 何时「绝对不能自行动手」

以 [`d-c4b-recovery-decision-table.md`](./d-c4b-recovery-decision-table.md) §3 与 D-C4 §4.2 **黑名单**为准；**尤其**：`freeze_no_go`、**R2/R3**、或 **无工单** 时 **任何** dedupe/state **写**。
