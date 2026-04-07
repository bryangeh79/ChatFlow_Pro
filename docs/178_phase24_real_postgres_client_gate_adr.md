# ADR — Phase 24 / 包 2I — Real Postgres client：引入条件与 dependency gate

> **状态**：Accepted（**2I = ADR + 代码 gate**；**不**连真实数据库、**不**改默认 **`sql.js`** live 路径、**不**动租户 webhook）。  
> **关联**：迁移总览 **`docs/177_phase24_postgres_migration_adr.md`**；readiness CLI **`npm run saas:db:postgres:readiness`**。  
> **真源**：`package.json` **1.7.85+**；gate **`postgres-gate.ts`**；**2J** 动态加载 **`postgres-client-loader.ts`**。

---

## Phase 24 — 包 2J ✅（wiring skeleton，`pg` 动态加载）

- **`pg`** 列为 **`dependencies`**，但 **gate off 时进程不 `import('pg')`** — sql.js 默认路径 **不依赖** 是否已解析该包（与 **§1** 的安装图担忧对齐：未使用 Postgres 的进程 **不执行** 动态 import）。  
- **`postgres-client-loader.ts`**：**`loadPostgresClientModule()`** / **`getPostgresClientRuntimeSummary()`** / **`isPostgresClientModuleAvailable()`**；**无 pool、无连接串、无 query**。  
- **readiness**：**`postgres_client_module_available`** + **`postgres_client_runtime_wired: false`**（直至后续包接线 pool/adapter）。  
- **验证**：**`npm run verify:saas-db-postgres-client-loader`**。

---

## 1. 背景

Phase 24 已具备：**双 driver 选择**（`CHATFLOW_SAAS_DB_DRIVER`）、**Postgres adapter stub**、**migration registry / execution / ledger contract**、**metadata readiness stub**（2H）。下一步自然趋向 **真实 `pg` 客户端与连接池**，但若 **过早把 `pg` 写进默认依赖或未定义启用条件**，会导致：

- 未使用 Postgres 的部署 **被迫解析/安装** 原生依赖，放大 CI 与本地摩擦；
- **`driver=postgres` 被误读为“已可连库”**，掩盖 **stub 仍抛错** 的事实；
- **运维与开发**缺少 **单一、可审计的开关**，难以做 **渐进接线** 与 **回滚**。

本 ADR 将 **“何时允许走真实 client 代码路径”** 与 **“进程是否实际加载 `pg`”** 拆开：**`package.json` 可含 `pg`（2J）**，但 **仅当 gate on 才动态 `import('pg')`**；**driver + gate** 仍是后续 **pool / query** 接线的硬前置。

---

## 2. 为什么现在还不直接接 `pg`

- **默认生产/本地仍以 sql.js 为真源**；贸然加入 `pg` 会改变 **安装图** 与 **失败面**，违背 “**不让 package 安装状态影响 sql.js 默认启动**”。  
- **连接串、TLS、池大小、健康检查** 尚未与 **SaaS adapter 边界** 对齐；先接库易写出 **半套实现**。  
- **2H readiness** 已提供 **只读契约**；在 **无 gate** 的情况下接 `pg`，容易让监控误报 **“ready”**。  
- **分步交付**：先 **锁条件（2I）**，再 **接依赖与实现（2J）**，再 **ledger / apply 真执行（2K+）**，风险更低。

---

## 3. 引入真实 Postgres client 的前置条件（累计）

以下 **全部** 视为后续 **2J 引入 `pg` 的前置**（本 ADR 只强制 **前两条在代码与文档中成立**；其余在 2J/2K PR 中逐项验收）：

1. **`CHATFLOW_SAAS_DB_DRIVER=postgres`**（显式选择 backend；未知值仍 **fail-fast**）。  
2. **`CHATFLOW_SAAS_POSTGRES_CLIENT=1`**（**feature gate 开启**；未设或 `0` = **关闭**）。  
3. **`DATABASE_URL` 或等价连接配置** 已定义且 **文档化**（具体变量名在 **2J** 锁定）。  
4. **CI / staging** 具备 **可选 Postgres job** 或 **contract 测试**（不阻塞默认 sql.js 流水线）。  
5. **迁移 runner / ledger** 与 **adapter 查询路径** 的 **接线顺序** 在 **`docs/177`** 与 PR 描述中可追溯。

**不满足 1 或 2 时**：代码 **不得** `require('pg')` 或等价动态导入；**只能**维持 **stub / 明确报错**。

---

## 4. Dependency gate 设计

| 项目 | 说明 |
|------|------|
| **环境变量** | `CHATFLOW_SAAS_POSTGRES_CLIENT` |
| **合法值** | 未设置 / 空 / `0` → **关闭**；`1` → **开启**；**其他值** → **fail-fast** `invalid_chatflow_saas_postgres_client:<value>`（与 `CHATFLOW_SAAS_DB_DRIVER` 校验风格一致） |
| **API** | `isPostgresClientEnabled()`、`getPostgresClientGateSummary()`（**`postgres-gate.ts`**） |
| **语义** | Gate **只**表示 **允许动态加载 `pg` 模块**；**不**表示 **pool 已建、已连接、已健康** |
| **readiness** | `getPostgresExecutionReadiness()`（**async**）携带 **`postgres_client_gate_enabled`**、**`postgres_client_module_available`**、**`postgres_client_runtime_wired: false`**（pool/adapter 接线前恒为 `false`） |

**`PostgresSaaSDbAdapter`** 可提供 **`getPostgresClientGateSummary()`** 实例方法，便于调试；**不**在 gate 关闭时 **静默创建 pool**。

---

## 5. 运行时启用条件

**真实 postgres client 路径（2J 及以后）仅在以下逻辑与生效**：

- `getSaaSDbDriver() === 'postgres'` **且**  
- `isPostgresClientEnabled() === true`

否则：

- **`driver=sqljs`**：完全 **不** 评估 Postgres client；**sql.js 启动路径** 与 **是否安装 `pg` 无关**。  
- **`driver=postgres` 且 gate 关闭**：保持 **stub**（当前仍 **`postgres_adapter_not_implemented`**）；readiness **明确 “gate 关闭，非 ready”**，**不** 伪装健康检查通过。  
- **`driver=postgres` 且 gate 开启**：**2J** 起可 **解析 `pg` 模块**；**`postgres_client_runtime_wired` 仍为 `false`**（无 pool / 无 query）。

---

## 6. Local / dev 与 hosted / prod 口径

| 场景 | 建议 |
|------|------|
| **Local 默认** | 不设 `CHATFLOW_SAAS_POSTGRES_CLIENT` → gate **关**；`CHATFLOW_SAAS_DB_DRIVER` 默认/省略 → **sqljs**。 |
| **本地试验 Postgres** | 显式 `CHATFLOW_SAAS_DB_DRIVER=postgres` + `CHATFLOW_SAAS_POSTGRES_CLIENT=1` +（2J 起）连接串；**未接 2J 前** 仍会 **stub / 报错**，符合预期。 |
| **Hosted / prod** | 若仍跑 sql.js：**不要** 开 gate（进程即 **不** `import('pg')`）。若目标 Postgres：**先** 基础设施与 secret，**再** 开 gate + 切 driver + 部署 **2J+** 构建（含 **`pg` 依赖**）。 |

---

## 7. 默认失败策略

- **非法 gate 值**：进程在 **首次调用** `isPostgresClientEnabled()` / `getPostgresClientGateSummary()`（及依赖它们的 readiness）时 **抛错**，避免 **静默当 0**。  
- **`driver=postgres` + gate 关**：**不** 自动降级到 sql.js（避免 **写错库**）；adapter **保持 stub**；操作者从 **readiness / 日志** 看到 **gate 关闭**。  
- **未配置连接串（2J 后）**：应在 **pool 创建前 fail-fast**，具体消息在 **2J** 定义（本 ADR 不展开）。

---

## 8. 回滚策略

- **配置回滚**：`CHATFLOW_SAAS_POSTGRES_CLIENT=0` 或未设置 → **禁止** 真实 client 路径；配合 **`CHATFLOW_SAAS_DB_DRIVER=sqljs`** 回到 **文件 sql.js**。  
- **发布回滚**：回退到 **未合并 2J 的构建** → **无 `pg` 依赖**；gate 仍存在，**行为与纯 2I 一致**。  
- **数据回滚**：见 **`docs/177`** 与 **`memory/04`** — **快照 + 明确 backend 环境变量**，避免 **双写分叉**。

---

## 9. 后续分包建议：2J / 2K

| 包 | 建议范围 |
|----|-----------|
| **2J** | ✅ **骨架**：**`pg` 依赖 + `postgres-client-loader.ts`**（gate on 才动态加载）；**`postgres_client_runtime_wired` 仍为 `false`**。 **后续 2J+ / 2K**：最小 **pool + 连接失败策略**；**`postgres_client_runtime_wired`** 在 **成功创建 pool** 后为 `true`（以 PR 为准）。 |
| **2K** | **migration apply** 与 **DB ledger** 与 **真实连接** 串联；CI Postgres job；**仍不** 改 webhook 默认路径。 |

---

## 10. 验收（2I + 2J）

- `npm run build`  
- `npm run verify:saas-db-postgres-readiness`  
- `npm run verify:saas-db-postgres-client-gate`  
- `npm run verify:saas-db-postgres-client-loader`  
- **2J+**：**`package.json` `dependencies` 含 `pg`**；**gate off 的 verify** 断言 **`require.cache` 无 `pg`**

---

## 11. 文档同步

- **`docs/177`**：注明 **2I** 将 **真实 client 引入前置条件** 独立为 **`docs/178`**。  
- **`memory/03` / `memory/04`**：版本与风险与 **gate / 未接 `pg`** 对齐。
