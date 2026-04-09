# D-C3 — 演练 / 验收清单（可重复）

**目的**：验证 D-C3A（只读）+ D-C3B（单键）在 **工程边界** 与 **约定口径** 上可交付；**不**替代生产变更审批。  
**自动化**：`npm run verify:d-c3-closeout`（含 build + D-C3A verify + D-C3B verify + 文档资产检查）。

---

## A. 工程自动化（每次发版 / CI 可跑）

| # | 步骤 | 通过条件 |
|---|------|----------|
| A1 | `npm run verify:d-c3-closeout` | 退出码 0 |
| A2 | （等价拆分）`npm run build` | tsc 无错误 |
| A3 | `node scripts/verify-d-c3a-readonly-recon.mjs` | 输出 `D-C3A readonly recon verify passed` |
| A4 | `node scripts/verify-d-c3b-manual-repair.mjs` | 输出 `D-C3B manual repair verify passed` |

**说明**：A3/A4 使用 **sqljs 隔离路径** 验证模块守卫与核心逻辑；**生产对账/修复**仍要求 **Postgres**。

---

## B. Postgres 环境演练（运维在受控库执行）

**前置**：迁移已含 `tenant_*_dedupe` 与 `dedupe_manual_repair_audit_events`（`pg_0010–12` + `pg_0015`）。

| # | 步骤 | 通过条件 |
|---|------|----------|
| B1 | 只读定位可疑键 | `npm run saas:dedupe:consistency:report -- --tenant-id=<T> --max-rows=50` 输出 JSON，`write_policy=readonly`，行字段含 `gap_kind` / `idempotency_key_fp` |
| B2 | 单键 dry-run | `saas:dedupe:manual-repair -- --dry-run ...` 返回 `ok:true`，`write_policy=dry_run_no_writes`，**审计表行数不变** |
| B3 | 单键 apply（测试行） | 仅对 **已确认测试数据**：`CHATFLOW_DEDUPE_MANUAL_REPAIR_ENABLED=1` + `--apply` + `--confirm-ticket=`；`ok:true`，`audit_event_id` 非空 |
| B4 | 审计留痕 | `SELECT * FROM dedupe_manual_repair_audit_events ORDER BY ts_iso DESC LIMIT 5` 可见对应 `ticket_id` / `idempotency_key_fp` / `before_json` / `after_json` |
| B5 | 不产生第二次 notify/outbound | 对 **close_as_completed**：工具执行前后 **无** 新增对 notify URL / outbound API 的调用（由网络抓包或日志证明；**设计真源**：工具无 HTTP 发送代码路径） |
| B6 | processing 不被默认自动 completed | 无后台任务改表；仅 **显式** D-C3B apply 改变目标行；D-C3A **永不**写库 |

**B5/B6 口径**：B5 在 **staging** 可通过观测 outbound/notify 日志与 tcp 侧证；工程侧 **静态边界** 见 `d-c3b-manual-repair-spec.md` 与 `dedupe-manual-repair.ts`（无 notify/outbound 调用）。

---

## C. 文档与接手

| # | 步骤 | 通过条件 |
|---|------|----------|
| C1 | 读 `docs/internal/d-c3-closeout.md` | 理解 D-C3C 冻结与五大问题答复 |
| C2 | 读 `docs/internal/d-c3-operator-runbook.md` | 能按顺序执行 A→B→apply |

---

## D. 签收

- **工程**：A 全程通过。  
- **环境（可选）**：B 在受控 Postgres 演练通过。  
- **文档**：C 完成。  

签收人：___________ 日期：___________
