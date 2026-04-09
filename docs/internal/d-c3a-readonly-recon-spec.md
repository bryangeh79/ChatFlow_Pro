# D-C3A — 只读对账层 · 最小输出字段真源

**Phase**：D-C3A（设计 D-C3 之子切片）  
**性质**：只读；**禁止**写库、自动补偿、修复、UI、Redis、队列、定时任务。

## 可疑键行（`DedupeConsistencyRow`）字段

| 字段 | 说明 |
|------|------|
| `tenant_id` | 租户 id |
| `lane` | `inbound` \| `outbound` \| `notify` |
| `channel` | 入站/出站渠道；notify 无渠道时为空字符串 |
| `event_type` | 仅 notify 有值；其余为空字符串 |
| `idempotency_key_fp` | `idempotency_key` 的 SHA-256 前 16 hex（与 D-C1 `observabilityFingerprint` 一致）；**不落明文键** |
| `current_status` | 当前 `status`（本层仅枚举 `processing` 可疑行） |
| `current_version` | outbound/notify 的 `version`；inbound 无列 → `null` |
| `evidence_http_or_provider` | DB 内可关联证据摘要：inbound=`provider_message_id` 或占位说明；outbound=`message_trace_id`；notify=固定说明「HTTP 成功未落库，需对日志」 |
| `first_seen_at` | 首次见到（ISO） |
| `last_seen_at` | 最后见到（ISO） |
| `recommended_action` | 单行英文动作码 + 短说明（禁止自动重发 / 对日志 / D-C3B 人工） |
| `gap_kind` | `g1_notify_processing_stale` \| `g2_outbound_processing_stale` \| `g3_inbound_processing_stale` |

## 启发式（DB-only）

- **G1/G2/G3 本实现统一启发式**：`status = 'processing'` 且 `last_seen_at < now - stale_minutes`（默认 15，可用 `CHATFLOW_DEDUPE_CONSISTENCY_STALE_MINUTES` 或 CLI 覆盖）。
- **语义**：stale processing **可能**包含「下游已成功但 complete CAS 失败」、**也可能**包含极慢在途请求；`recommended_action` 要求运维 **先对日志与渠道侧再判**，**禁止**仅凭本行自动重发。

## 运行范围

- **仅 Postgres**：`CHATFLOW_SAAS_DB_DRIVER=postgres` 且 dedupe 表存在时查询；`sqljs` 路径返回空行并标注 `postgres_only`（避免误将 compat 当对账真源）。
