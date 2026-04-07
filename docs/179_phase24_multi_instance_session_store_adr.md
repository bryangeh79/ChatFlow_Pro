# ADR — Phase 24 / 包 3A — Multi-instance session / store（仅决策，无实现）

> **状态**：Accepted（**3A = ADR 文档**；**不**改 `sql.js` / Postgres foundation 行为、**不**动租户 webhook runtime、**不**改 auth/RBAC 主行为）。  
> **真源**：`package.json` **1.7.90+**；SaaS MVP **sealed**（`docs/175`）。**Postgres Foundation（2A–2M）** 已封（`docs/177` §13、`memory/01`）— **`go/no-go` 仍为 `no_go`**；**本 ADR 不替代 Postgres runtime 专线**。  
> **工程进度**：**3B** — **`SessionStore` 接口** + **`getSessionStore()`** 默认 **in-memory**；**未** 接 Redis / **未** 实现多实例一致性。  
> **关联蓝图**：`docs/GPT_PLANNER_HANDOFF_BLUEPRINT.md`（多实例一句指向 Phase 24）。

---

## 1. 背景

托管侧从 **单进程** 扩到 **多副本** 时，下列能力若仍依赖 **进程内存** 或 **本地磁盘单写者**，会出现 **会话分叉**、**重复 notify**、**JSONL 损坏/交错**、**handoff 分配漂移** 等问题。  
**Postgres Foundation（2A–2M）** 已把 **DB 侧契约与门禁** 立好，但 **真实 `pg` runtime 仍未接线**；若在未理清 **会话与旁路持久化边界** 前硬上 DB，容易把 **「会话态」误塞进错误层** 或与 **JSONL 运维模型** 冲突。

**因此**：在 Phase 24 内 **先** 用本 ADR 固定 **multi-instance 假设与收口顺序**，**再** 并行/后续推进 Postgres runtime（仍以 **`saas:db:postgres:go-no-go`** 为准）。

---

## 2. 当前实现盘点（只读）

### 2.1 Session（进程内）

| 项 | 现状 |
|----|------|
| **主模块** | `src/channels/session-context/in-memory-store.ts` — 模块级单例 **`InMemorySessionStore`**，`Map<string, UnifiedSessionContext>` |
| **读写入口** | `src/channels/session-context/index.ts` — `createOrUpdateSessionContext` / `commitSessionContext` |
| **Key 命名空间** | `namespacedSessionIdForMessage`：`channel:external_user_id:external_session_id`，若存在租户 context 则前缀 **`${tenantId}:`**，降低跨租户串线 |
| **TTL / 上限** | **24h TTL**（`last_seen_at`）；**最多 1000** session；过期惰性清理 + 满容 FIFO 淘汰最旧 |
| **多实例** | 文件头注释已写明：**不支持多实例**；重启 **全丢** |

### 2.2 JSONL 与旁路持久化

| 路径 | 文件 | 模块 |
|------|------|------|
| Lead | `data/local-captured-leads.jsonl` | `src/channels/lead-capture-hook/persistence.ts` → `appendJsonlRecord` |
| Handoff assignment | `data/handoff-assignments.jsonl` | `src/channels/handoff-trigger/assignment-persistence.ts` |

**共享工具**：`src/shared/jsonl-persistence.ts` — **同步** append、**轮转**（大小/行数）、**备份清理**（最多 5 个备份、总大小上限 50MB）。  
**隐含假设**：**单机可写 `process.cwd()/data`**；多进程/多副本 **无协调** → **交错写 / 丢行 / 双份** 风险。

### 2.3 Notify（HTTP）

| 类型 | 配置 | 行为 |
|------|------|------|
| Lead | `CHATFLOW_LEAD_NOTIFY_URL`（+ optional secret） | `scheduleLeadCaptureNotify` — 与 JSONL 行 **同形** POST；**fire-and-forget** |
| Handoff | `CHATFLOW_HANDOFF_NOTIFY_URL` | `scheduleHandoffNotify` — 在 **handoff 首次进入 pending** 时触发（pipeline 内与 session 前态比较） |

**幂等**：Lead 侧 **仅在 captured 首次** 调 `appendCapturedLeadRecord`；Handoff 侧 **依赖 session 状态跃迁**（前态非 pending → 后态 pending）。**多实例** 下若 **两副本同时认为「首次」** 或 **session 不同步**，可能 **重复 POST**（下游需 **幂等 key**，见 §7）。

### 2.4 其他进程内状态

- **`assignmentTracker`**（`src/channels/handoff-trigger/assignment-tracker.ts`）：内存中的 **负载均衡 / 轮询** 记录 — **多实例各有一份**，**非全局一致**。  
- **Handoff sticky TTL**：`CHATFLOW_HANDOFF_ASSIGN_STICKY_TTL_MIN` / `assign_sticky_ttl_min`（`src/config/handoff-assign.ts`）— **语义上假设「同 session 粘性」**；多实例无共享 session 时 **粘性失效或不稳定**。  
- **SaaS DB（sql.js）**：`persistSaaSDatabase` **单文件全量导出** — **隐式单 writer**；与 **Postgres 多连接** 模型不同（已在 `docs/177` / `memory/04` 述及）。

---

## 3. 单实例假设清单（摘要）

1. **Session 全在进程堆**：另一副本 **看不到** 本轮对话状态。  
2. **Sticky session 若缺失**：LB 轮询会导致 **同用户打不同副本 → 状态分裂**。  
3. **`data/*.jsonl` 本地 append**：N 副本 → **文件级竞争** 或 **每副本一份碎片文件**。  
4. **Notify 重复**：无全局 **「已通知」** 记录时，**at-least-once** 多发。  
5. **assignmentTracker 分片**：每实例 **独立计数**，**全局不均衡** 或 **重复分配策略分叉**。  
6. **sql.js 文件库**：与 **多 writer** 不兼容（Postgres 专线解决 DB 层；**不**在本包实现）。

---

## 4. 为什么现在切 3A，而不是直接进 Postgres runtime

| 理由 | 说明 |
|------|------|
| **正交** | **会话/旁路日志** 与 **业务表事务库** 生命周期不同；混在一刀易产生错误抽象。 |
| **门禁仍 NO_GO** | **`evaluatePostgresGoNoGo()`** 仍为 **`no_go`**；应先 **文档化多实例边界**，避免团队误以为 **「上 PG 就自然多实例」**。 |
| **风险顺序** | 多副本下 **最先爆** 的往往是 **session 丢失** 与 **JSONL/notify 重复**，而非单条 SQL。 |
| **回滚** | ADR 层决策 **不改运行时**；后续 3B/3C 可按包开关与灰度。

---

## 5. 目标 / 非目标

### 5.1 目标

- 统一 **「何时必须外置 / 何时可保留单写者」** 的口径。  
- 为 **session store**、**JSONL**、**notify**、**handoff 分配辅助状态** 分别标明 **多实例风险等级** 与 **推荐演进路径**。  
- 约定 **幂等键** 与 **`request_id` 利用** 原则，便于下游集成。  
- 给出 **3B / 3C** 分包建议，便于实现阶段控面。

### 5.2 非目标（3A）

- **不** 实现 Redis / Postgres session / 消息队列。  
- **不** 修改 webhook、pipeline、auth、**sql.js 默认路径**、**Postgres foundation 模块行为**。  
- **不** 在本 ADR 内定稿云厂商与 SLA — 仅 **候选方向**。

---

## 6. Session / store 分层建议

| 层 | 内容 | 多实例要求 |
|----|------|------------|
| **L1 请求内** | 单次 webhook 解析、trace | 无状态即可 |
| **L2 会话工作集** | `UnifiedSessionContext`（lead/handoff/FAQ 上下文） | **必须跨副本一致** 或 **sticky 到同一副本** |
| **L3 旁路审计/集成** | JSONL、HTTP notify | **至少一次** 语义 + 下游幂等；长期应 **外置队列或 DB 出站表** |
| **L4 权威业务数据** | sql.js / 未来 Postgres | **事务 + 单逻辑库**；与 L2 分离演进 |

---

## 7. Sticky vs 外置 session store

| 方案 | 优点 | 缺点 |
|------|------|------|
| **LB sticky** | 实现快、**可不**改代码 | 副本缩容/故障 **丢粘**；**不均衡**；**仍丢** 重启内存 |
| **外置 session store**（如 **Redis**） | **显式 TTL**、跨副本一致、利于 **水平扩** | 运维与 **网络分区** 语义；需 **序列化契约** 与 **版本迁移** |

**默认推荐口径（3A）**：**中长期以外置 store 为主**；sticky **仅** 可作为 **过渡** 或 **与 store 并存** 的优化，**不能** 作为唯一故事。

**Redis**（**仅 ADR 候选**）：适合 **TTL 会话**、**低延迟读写的 key-value**；**不**替代 Postgres **事务业务表**。最终选型在 **3B/3C** 结合托管环境与成本定。

---

## 8. 子系统多实例风险与收口优先级

| 子系统 | 首要风险 | 建议收口顺序 |
|--------|----------|--------------|
| **Session** | 用户可见 **状态跳变/重复引导** | **P0** — 外置或严格 sticky + 短 TTL 文档化 |
| **Lead JSONL + notify** | **双份线索**、文件损坏 | **P0** — 幂等键 + 外置 sink 或单写者角色 |
| **Handoff JSONL + notify** | **重复 handoff 工单** | **P0** — 同 lead；依赖 `request_id` / `session_id` + 下游去重 |
| **assignmentTracker** | **全局不均衡** | **P1** — 迁到外置计数或 DB；或 **文档化「仅单实例有效」** |
| **sql.js 文件库** | 多 writer 损坏 | **随 Postgres runtime**（**非 3A**） |

---

## 9. 幂等与 `request_id`

- **已有字段**：`CapturedLeadRecord` / handoff notify payload 可带 **`request_id`**（来自 HTTP **`X-Request-Id`** 链路）。  
- **建议契约**：下游将 **`(tenant_id, session_id, event_type, request_id)`** 或 **`message_id`**（若稳定）作为 **幂等键**；**至少一次** POST **必须** 可安全重放。  
- **JSONL**：行级 **uuid** 或 **确定性 hash** 可在 3B 引入，**3A 仅提议**。

---

## 10. JSONL 单写者边界（过渡策略）

在 **未** 外置前，运维上可明确：

- **每环境仅一个 writer 进程**（或 **单副本**），或  
- **挂载共享块存储 + 单 Pod 写**（仍脆弱，**非长期推荐**）。

**3A 默认口径**：JSONL **不是** 多副本安全源；**生产多实例必须** 有 **外置 sink** 或 **角色化单写者** 的 **书面** runbook。

---

## 11. 回滚策略

- **3B/3C 实现时**：session store 切换应 **可配置回退** 到 **内存**（**仅 dev/单副本**），并在 **启动时打印警告**。  
- **特性开关**：建议 **`CHATFLOW_SESSION_STORE=memory|redis|...`** 类 **单一真源**（实现包再定具体值）。  
- **数据**：外置 store **清空** ≠ 丢 DB 业务数据；需 **运维说明** **会话重置** 影响。

---

## 12. 分包建议

| 包 | 建议范围 |
|----|-----------|
| **3B** | **Session store 抽象** + **首实现后端选型**（如 Redis driver 或 **加固 sticky 文档** 二选一为 MVP）；**不改变** webhook 契约；**租户前缀 key** 延续。 |
| **3C** | **JSONL / notify** — **外置 outbound 表或队列**、**幂等键**、**handoff/lead 统一出站模型**；与 **3B** 可部分并行，但 **依赖 session 一致性** 的 notify 顺序需在集成测试里对齐。 |

**Postgres runtime**：仍跟 **`docs/177`** / **`go-no-go`**；**可在 3B/3C 之后或与中后期并行**，**不**要求 3A 完成后再开写 `pg` query。

---

## 13. 核心决策一句话

**多实例下必须先明确 session 与 JSONL/notify 的边界与幂等策略，默认以外置 session store 为方向；在 Postgres runtime 仍为 `no_go` 时，用 3A ADR 固定叙事与分包，避免「探针/契约齐备=可投产」的误读。**

---

## 14. 参考路径（只读）

- `src/channels/session-context/in-memory-store.ts`  
- `src/channels/session-context/index.ts`  
- `src/channels/lead-capture-hook/persistence.ts` · `notify-outbound.ts`  
- `src/channels/handoff-trigger/assignment-persistence.ts` · `notify-outbound.ts` · `assignment-tracker.ts`  
- `src/channels/unified-inbound-pipeline/index.ts`  
- `src/shared/jsonl-persistence.ts`  
- `src/config/handoff-assign.ts`（sticky TTL）  
- `docs/177_phase24_postgres_migration_adr.md` §13  
