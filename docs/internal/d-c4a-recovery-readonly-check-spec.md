# D-C4A — 恢复后只读核查 pack（实现真源）

**Phase**：D-C4A（**已实现**）  
**性质**：**只读**；**不是**修复器、**不是**自动补偿、**不是** D-C3C。  
**版本**：**1.7.106**（D-C4A 实现 patch）。  

## 边界

| 允许 | 禁止 |
|------|------|
| `queryOne` / `queryAll`、本地 `fs.stat` 存在性 | 任何 `execute` 对业务库；修表；批量 repair |
| 调用 **D-C3A** `listDedupeConsistencyGaps`（不改其语义） | 调用或包装 D-C3B apply |
| 组合 ledger / tenants / dedupe / state / audit / JSONL 只读 | UI、公开 API、Redis、队列、cron |

## 核查顺序（对齐 D-C4 §3.2）

| Order | Step id | 说明 |
|-------|---------|------|
| 1 | `ledger_migration` | `saas_schema_migrations` vs `listSaasDbMigrations()`：缺迁移或 checksum 不一致 → **freeze** |
| 2 | `pg_core_tenants` | `tenants` 可读与行数 |
| 3 | `dedupe_consistency` | D-C3A stale processing 报告；`row_count>0` → 整体可标 **manual_d_c3b_only**（在 1–2、4 均非 freeze 时） |
| 4 | `pg_state_counts` | 三层 state 表；任一张 **缺失** → **freeze** |
| 5 | `pg_audit_counts` | 审计表 COUNT；缺失仅作信息 |
| 6 | `jsonl_presence` | `data/*.jsonl` 存在性/mtime（可 `--no-jsonl` 跳过） |

## 结果分层 `overall_tier`

| Tier | 含义 |
|------|------|
| `freeze_no_go` | **不要**开放流量；先解决 ledger/core/dedupe 查询失败/state 表缺失等 |
| `manual_d_c3b_only` | 只读无硬故障，但存在 **stale dedupe 候选** — 仅允许按 D-C3 走 **证据 + 单键 D-C3B** |
| `observe` | 本 pack 内未见上述阻断；**仍须**结合渠道/日志与变更单判断是否接流 |

**`driver=sqljs`**：不跑 PG 序列，返回 `postgres_only: true`、`overall_tier: observe`（带说明）— **不作为** 托管恢复真源。

## 运维入口

- `npm run saas:recovery:readonly-check -- [--stale-minutes=] [--tenant-id=] [--max-dedupe-rows=] [--no-jsonl]`
- 验证：`npm run verify:d-c4a-recovery-readonly-check`（build 后）

## 与评审包关系

放行依据：`docs/internal/d-c4-design-review-package.md`。本实现 **不**扩大评审包 §3 范围。

## 输出怎么用（D-C4B · 不改本 pack 语义）

将 `overall_tier` 与 `steps` 交给运维决策表：[`d-c4b-recovery-decision-table.md`](./d-c4b-recovery-decision-table.md)（**规程**；**不是**自动执行 D-C3B）。

## 与 D-C4C 只读 bundle（不改本 pack 语义）

CI/回归链复用 **`verify:d-c4a-recovery-readonly-check`**：见 [`d-c4c-readonly-governance-bundle-spec.md`](./d-c4c-readonly-governance-bundle-spec.md)（**仅** sqljs 烟测 + 源码约束；**不**扩大本 pack 运行时语义）。
