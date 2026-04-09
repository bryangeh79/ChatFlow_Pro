# D-C3B — 单键人工闭环工具 · 设计真源

**Phase**：D-C3B（D-C3 子切片；**默认关闭**）  
**性质**：在 D-C3A 只读对账之上，提供 **受控、可审计、单键、显式二次确认** 的人工修复；**禁止**自动补偿、批量修复、UI、公开管理 API、Redis、队列、cron、范围修复。

## 1. 修复入口边界

一次调用 **恰好** 针对 **一条** dedupe 行（主键级唯一定位）：

| 字段 | 必填 | 说明 |
|------|------|------|
| `tenant_id` | 是 | 租户 |
| `lane` | 是 | `inbound` \| `outbound` \| `notify` |
| `channel` | inbound/outbound 必填 | 与表 `channel` 一致 |
| `event_type` | notify 必填 | 与表 `event_type` 一致 |
| `idempotency_key` | 是 | 明文幂等键（与 PK 一致）；**不允许**仅凭 fp 写库（fp 仅可作校验） |
| `expect_idempotency_key_fp` | 否 | 若提供，必须等于 `observabilityFingerprint(idempotency_key)`，否则拒绝 |
| `action` | 是 | 见 §2 |
| `reason` | 是 | 运维说明（最短长度由实现校验） |
| `ticket_id` | 是 | 工单 / 变更单号 |
| `operator` | 是 | 操作者标识（账号、工号等） |
| `mode` | 是 | `dry_run`（默认）\| `apply` |

**apply 额外必填**：

- `apply_confirm_ticket`：**必须**与 `ticket_id` **完全一致**（二次确认）。
- 环境变量：`CHATFLOW_DEDUPE_MANUAL_REPAIR_ENABLED=1`（或 `true`），否则 **拒绝 apply**（dry-run 仍可在 Postgres 上跑只读预演）。

**运行面**：与 D-C3A 一致，**仅 Postgres**；`sqljs` 路径 **整段拒绝**（不当作对账/修复真源）。

## 2. action 白名单（最小）

仅两类：

| action | 语义 |
|--------|------|
| `close_as_completed` | 将 **单条** `status=processing` 行 **账本闭合** 为 `completed`（notify/outbound 走 **CAS**：`version` 仅允许在成功闭合时 `+1`，与线上一致） |
| `release_for_retry` | **删除**单条 `status=processing` 行，使后续管线可重新 `INSERT`（**仅当**可证明下游未成功时使用；见 §3） |

不增加其它 action；不扩展为范围操作。

## 3. 写入前置条件（按 action）

### 3.1 共用

- 行必须存在，且当前 `status === 'processing'`。
- 禁止修改 `tenant_id`、禁止改 `idempotency_key` 语义（不 UPDATE 主键列值）。
- 禁止任意写死/批量改 `version`；仅允许 CAS 成功路径上的 `version + 1`（与 `complete*DedupeWithCas` 一致）。

### 3.2 `close_as_completed`

| 项目 | 内容 |
|------|------|
| **允许** | 运维已根据日志/渠道侧确认 **下游已成功**（G1 notify / G2 outbound）或 inbound 管线证据充分（G3）；需写入 `reason`/`ticket_id` |
| **禁止** | 行已为 `completed`；行不存在；notify/outbound **CAS 冲突**（版本已被他处更新） |
| **必要证据** | 流程外（日志/渠道）；工具内 **不** 自动判定「已成功」 |
| **dry-run 输出** | `before_snapshot`（`idempotency_key` 在快照中 **脱敏为 fp**）、`would_mutate: true`、拟执行 SQL 语义摘要 |
| **apply 输出** | `after_snapshot`、审计行 id、`result: ok` \| 结构化 `denied` 原因 |

**G1/G2 验收语义**：本动作 **只写 dedupe 状态**，**不调用** notify HTTP、不触发 outbound send，因此 **不会**因本工具产生「第二次 notify / 第二次 outbound」。

### 3.3 `release_for_retry`

| 项目 | 内容 |
|------|------|
| **允许** | 与共用条件一致，且操作者显式提供 **下游未成功** 的联合证明（见下） |
| **禁止** | 缺证明；`status !== 'processing'`；**G1/G2 在未提供证明时** 禁止（防止「用重试代替对账」） |
| **必要证据** | `ack_downstream_not_success === true` **且** `downstream_evidence` 非空且达到最小长度（实现校验） |
| **dry-run 输出** | `before_snapshot`、`would_delete: true`、提醒双发风险 |
| **apply 输出** | `after_snapshot: null`（行已删）、审计 |

**G3**：不默认 `completed`；若用 `release_for_retry`，同样 **必须** `ack` + `downstream_evidence`，避免无证据删行导致重复处理。

## 4. 审计要求

每次 **apply**（无论成功或业务拒绝）在表 `dedupe_manual_repair_audit_events` 留痕（dry-run **不写库**，满足「dry-run 无任何写入」）：

- who：`operator`
- why：`reason`
- `ticket_id`
- target：`tenant_id` + `lane` + `channel`/`event_type` + `idempotency_key_fp`
- `before_json` / `after_json`：行快照 JSON（**不含明文** `idempotency_key`，仅存 fp）
- `ts_iso`
- `mode`：表中仅持久化 `apply`（dry-run 不落库）
- `result`：`ok` \| `denied` \| `error`
- `detail_json`：可选（如 `downstream_evidence` 摘要、拒绝码）

可回放：凭审计行 + 迁移后表结构可还原操作意图；**不**记录密钥类字段。

## 5. 危险动作黑名单（写死）

- 禁止改 `tenant_id`
- 禁止改 `idempotency_key` 主键语义（不通过 UPDATE 换键）
- 禁止脱离 CAS 任意改 `version`
- 禁止批量 `UPDATE`/`DELETE`（实现仅允许带全主键条件的单条语句且 `RETURNING`/影响行数校验）
- 禁止通过本工具「重发一次」消告警（本工具 **无** HTTP/队列调用；`release_for_retry` 仅删 dedupe 行且需下游未成功证明）

## 6. CLI

见 `scripts/dedupe-manual-repair.mjs`：`--dry-run` 默认；`--apply` 需 env + `--confirm-ticket=<同 ticket_id>`。

## 7. 与 D-C3A 关系

- D-C3A 产出可疑清单；D-C3B **不**重复对账逻辑，仅对 **已知主键** 做人工闭环。
- 红线延续：**默认宁可告警，不可双发**；已成功下游场景 **禁止**用 `release_for_retry` 代替 `close_as_completed`。
