# ADR — Phase 24 / 包 2A — Postgres + migration（仅决策，无实现）

> **状态**：Accepted（**2A = ADR 文档**；**不**含 Postgres runtime、**不**改 sql.js live 路径、**不**动租户 webhook / 现有 auth 实现）。  
> **真源**：`package.json` **1.7.88+**；SaaS MVP **sealed**（`docs/175`）；**Auth-RBAC Foundation（1A–1J）** 已封（`docs/176`、`memory/01`）。**Postgres Foundation checkpoint（2A–2M）** 已叙事封板（`memory/01` / `memory/02`）— **契约与门禁齐备**，**`evaluatePostgresGoNoGo()` 仍为 `no_go`**；**勿解读为可切生产 Postgres runtime**。下一工程线见 **`docs/179`**（multi-instance session/store）。**2M** CLI 见 **`docs/178`**。

---

## Phase 24 — 包 2M ✅（readiness boundary & go/no-go checklist）

- **模块**：**`postgres-readiness-boundary.ts`** — **`evaluatePostgresGoNoGo()`**：聚合 **driver / gate / module / config / probe / execution_wired / ledger_persistence_wired / runtime_wired / sql_assets / adapter_stub**。  
- **规则**：**`overall_status === 'go'`** 仅当 **全部必填检查通过**；**本版本恒为 `no_go`**（**execution / ledger / runtime / adapter** 仍未接线）。  
- **CLI**：**`npm run saas:db:postgres:go-no-go`** — **`blocking_reasons`**（稳定 code）+ **`next_required_capabilities`**；**无密码**。  
- **验证**：**`npm run verify:saas-db-postgres-go-no-go`**。

---

## Phase 24 — 包 2L ✅（optional connection probe stub）

- **模块**：**`postgres-probe.ts`** — **`CHATFLOW_SAAS_POSTGRES_PROBE=1`** 且 **`CHATFLOW_SAAS_DB_DRIVER=postgres`** 且 **client gate=1** 且 **config valid** 时才 **`connect` + `end`**；**无 SELECT**、**无 schema/ledger**、**不挂默认启动**。  
- **状态**：**`skipped_*` / `probe_connect_ok` / `probe_connect_failed`**；错误信息 **脱敏**。  
- **readiness**：**`postgres_probe_*`** 字段；**`postgres_client_runtime_wired` 仍为 false**。  
- **验证**：**`npm run verify:saas-db-postgres-probe-gate`**（**不**要求本机必有 live DB）。

---

## Phase 24 — 包 2K ✅（Postgres connection config + DSN validation stub）

- **模块**：**`postgres-config.ts`** — **`CHATFLOW_SAAS_POSTGRES_URL`** 优先，否则 **HOST / PORT / DB / USER / PASSWORD / SSL**；**`loadPostgresConnectionConfig()`**、**`getPostgresConnectionConfigSummary()`**（附 gate 提示）、**`redactPostgresConnectionString()`**。  
- **校验**：host/db/user 非空、port **1–65535**（默认 **5432**）、**`CHATFLOW_SAAS_POSTGRES_SSL=0|1`**；**不回显 password**；**无 connect**。  
- **readiness**：**`connection_config_present` / `valid` / `source` / `connection_message`**；**`postgres_client_runtime_wired` 仍为 false**。  
- **验证**：**`npm run verify:saas-db-postgres-config`**。  
- **下一**：**2L** 见上节；之后 **pool + query / ledger**。

---

## Phase 24 — 包 2J ✅（real postgres client wiring skeleton — 不连库）

- **依赖**：**`pg`** 入 **`dependencies`**；**仅**在 **`CHATFLOW_SAAS_POSTGRES_CLIENT=1`** 时 **`import('pg')`**（**`postgres-client-loader.ts`**）。  
- **API**：**`isPostgresClientModuleAvailable()`**、**`loadPostgresClientModule()`**、**`getPostgresClientRuntimeSummary()`**；常量 **`POSTGRES_CLIENT_MODULE_NOT_AVAILABLE`** / **`POSTGRES_CLIENT_RUNTIME_NOT_WIRED`** / **`POSTGRES_CLIENT_LOAD_SKIPPED_GATE_OFF`**。  
- **readiness**：**`getPostgresExecutionReadiness()`**（**async**）含 **`postgres_client_module_available`**、**`postgres_client_runtime_wired: false`**；gate off **不** 触达 `pg`。  
- **验证**：**`npm run verify:saas-db-postgres-client-loader`**。  
- **禁止**：**不**建 pool、**不**读连接串、**不**执行 SQL、**不**改默认 **sql.js** driver。

---

## Phase 24 — 包 2I ✅（real postgres client：ADR + dependency gate）

- **ADR**：**`docs/178_phase24_real_postgres_client_gate_adr.md`** — **driver + `CHATFLOW_SAAS_POSTGRES_CLIENT=1`** 前置、失败/回滚、**2J/2K** 拆分建议。  
- **Gate**：**`postgres-gate.ts`** — **`isPostgresClientEnabled()`** / **`getPostgresClientGateSummary()`**（未设/`0` → off；`1` → on；其他值 fail-fast）。  
- **readiness**：**`postgres_client_gate_enabled`** 等；**`driver=postgres` 且 gate 关** 时摘要 **明示 gate 关闭**。  
- **验证**：**`npm run verify:saas-db-postgres-client-gate`**。  
- **演进**：**2J** 起 **`pg`** 已安装，但 **默认路径仍不加载**（见上节）。

---

## Phase 24 — 包 2H ✅（Postgres metadata / readiness）

- **模块**：**`postgres-metadata.ts`** — **`getPostgresMigrationLedgerInfo()`**（**async**）、**`getPostgresSchemaAssetInfo()`**、**`getPostgresExecutionReadiness()`**（含 **`ledger_info`**；**`ledger_persistence_wired`** 在 **runtime_wired** 且 **ledger 表可读** 时为真，**表缺失** → **`table_missing`** / **不误判 wired**）；**`execution_wired`** 仍为 **false** 直至 execution 切片；摘要 **≠** 生产 DB 健康通过。  
- **常量**：**`POSTGRES_METADATA_QUERY_NOT_WIRED`** — 摘要与错误语义仍须带此标记；**不**等于「未连库」（runtime 路径可发受控只读 SQL）。  
- **接线**：**`postgres-adapter.ts`** / **`db-adapter/index.ts`** 再导出上述 API；**不**改 live 默认 **sql.js**、**不**动租户 webhook。  
- **CLI**：**`npm run saas:db:postgres:readiness`**（**`scripts/saas-db-postgres-readiness.mjs`**）— 摘要 JSON/text，**非** DB 健康检查通过语义。  
- **验证**：**`npm run verify:saas-db-postgres-readiness`**（含 **`verify:postgres-ledger-persistence`** 等链）。  
- **禁止**：**不**伪成功 **apply**；**不**偷偷 **CREATE TABLE**；**不**将 **ledger 可读** 表述为 **Postgres ready**。

---

## Phase 24 — 包 2G ✅（ledger persistence contract + fake harness）

- **契约**：**`ledger-types.ts`**（**`SaasMigrationLedgerRecord`**）、**`ledger-contract.ts`**（**`SaasMigrationLedgerProvider`**：**async** `listAppliedMigrations` / `recordAppliedMigration`）。  
- **Harness**：**`fake-ledger.ts`** — **`FakeSaasMigrationLedger`** + **`seedFakeLedgerFromMigrationIds`**（**async**）；**纯内存**、**不落盘**。  
- **Postgres**：**`postgres-ledger.ts`** — **`PostgresSaasMigrationLedger`**（参数化 SQL；**checksum 冲突抛错** **`SAAS_LEDGER_RECORD_CHECKSUM_CONFLICT`**，**不静默覆盖**）。  
- **联动**：**`runSaasPostgresMigrations`**（**async**）可选 **`ledger`**；**dry_run**：**`already_applied`** / **`would_apply`** / **checksum 不匹配 → `failed`**（**`POSTGRES_LEDGER_CHECKSUM_MISMATCH`**）；**apply** 仍 **`not_wired`**、**不写真实 ledger**（本阶段）。  
- **CLI**：**`bootstrap --fake-applied=id,...`**（**fake_ledger_only** 标记）。  
- **验证**：`npm run verify:saas-db-migration-ledger-contract`。

---

## Phase 24 — 包 2F ✅（Postgres execution contract stub）

- **类型**：**`execution-types.ts`** — `dry_run` | `apply`、**`SaasPostgresMigrationRunResult`** / **`SaasPostgresMigrationEntryResult`**、状态 **`dry_run_only` / `not_wired` / `applied` / `failed`**、错误常量 **`POSTGRES_MIGRATION_EXECUTION_NOT_WIRED`**、**`POSTGRES_LEDGER_PERSISTENCE_NOT_WIRED`**。  
- **入口**：**`runSaasPostgresMigrations`**（**`execution-contract.ts`**）— **`driver` 非 `postgres` 即 fail-fast**；**`dry_run`** 返回结构化预览（**不执行 SQL**）；**`apply`** 返回 **`status=not_wired`**、**`applied_count=0`**、**不伪成功**。  
- **CLI**：**`saas-db-migration-bootstrap`** 走 contract；**`--mode=dry-run|apply`**；输出 **`contract_json_*`** 块。  
- **验证**：`npm run verify:saas-db-migration-execution-contract`。

---

## Phase 24 — 包 2E ✅（Postgres schema SQL assets + checksum model）

- **资产**：`src/saas/db-migrations/postgres/*.sql` — **真实 Postgres DDL 草案**（`CREATE TABLE IF NOT EXISTS` 等），**应用不执行**。  
- **绑定**：`registry` 每条 migration 含 **`asset_path`**、**`asset_kind: sql_file`**、**`checksum_sha256`**（启动时读文件 **SHA-256 小写 hex**，缺失即 **fail fast**）。  
- **模块**：**`checksum.ts`** — `resolveSaasMigrationAssetPath`、`sha256HexOfFile`。  
- **CLI**：`plan` / `bootstrap` 输出 **asset + checksum**；仍 **dry_run_only** / **postgres_migration_execution_not_wired**。  
- **验证**：`npm run verify:saas-db-migration-assets`。

---

## Phase 24 — 包 2D ✅（migration ledger + bootstrap dry-run CLI）

- **代码**：`src/saas/db-migrations/*` — **`SaasDbMigrationDef`** 注册表（**代码真源**）、**`buildSaasDbMigrationPlan()`**（`status` 仅 CLI 计算 **`pending_no_ledger`**）、未来落库表名常量 **`saas_schema_migrations`**（**本阶段不创建、不写入**）。  
- **CLI**：`npm run saas:db:migration:plan`（JSON/text 计划）、`npm run saas:db:migration:bootstrap`（**dry-run 摘要**，明示 **postgres 执行未接线** / **ledger 未持久化**）。  
- **禁止**：本包 **不**执行 SQL、**不**引入 `pg`、**不**切默认 driver。  
- **验证**：`npm run verify:saas-db-migration-ledger`。

---

## Phase 24 — 包 2C ✅（adapter selection + Postgres stub）

- **选择**：`CHATFLOW_SAAS_DB_DRIVER` = **`sqljs`**（默认）| **`postgres`**；**未知值 fail-fast** `invalid_chatflow_saas_db_driver:<value>`。只读查询 **`getSaaSDbDriver()`**。  
- **双实现**：**`SqlJsSaaSDbAdapter`**（live 默认）+ **`PostgresSaaSDbAdapter`**（**stub**：所有方法抛 **`postgres_adapter_not_implemented`**；**未**引入 `pg`、**未**连库）。  
- **验证**：`npm run verify:saas-db-adapter-selection`。

---

## Phase 24 — 包 2B ✅（骨架）

- **代码**：`src/saas/db-adapter/*` — **`SaaSDbAdapter`**（`queryOne` / `queryAll` / `execute` / `transaction` / `persistIfNeeded`）+ **`SqlJsSaaSDbAdapter`**；**默认 live 仍 sql.js**。  
- **接线**：`repository.ts` 中 **`tenant_admin_principals` + `tenant_admin_principal_audit_logs`** 路径已走 **`getSaasDbAdapter()`**；**其余表**仍直连接口 `getSaaSDatabase` / `stmt*`。  
- **验证**：`npm run verify:saas-sqljs-adapter-principals`。

---

## 1. 背景

SaaS 控制面与租户元数据当前落在 **sql.js 内存 SQLite + 单文件持久化**（`CHATFLOW_SAAS_DB_PATH` / `data/chatflow-saas.sqlite`）。Phase 24 在 **1A–1J** 已完成 **Admin auth / RBAC / principal 审计 / auth cutline**；**刻意不再**在同一子线继续扩展 bridge。

下一阶段工程焦点转向 **托管规模、多实例、可运维迁移**：需要 **服务端关系型数据库** 与 **显式 schema 版本管理**。本 ADR 只锁定 **方向与分包**，**不写代码**。

---

## 2. 当前 sql.js 能力与边界

| 能力 | 说明 |
|------|------|
| **入口** | `src/saas/db.ts` — `initSqlJs` → `new SQL.Database(optionalUint8)`；`getSaaSDatabase()` 单例；`persistSaaSDatabase()` 全量 `export()` 写回文件。 |
| **消费者** | `src/saas/repository.ts`：**principals / audit** 经 **`getSaasDbAdapter()`**；**其余**仍直接 `getSaaSDatabase` / `persistSaaSDatabase`；`src/server.ts` 仅 **warm-up** `getSaaSDatabase()`。 |
| **初始化** | 启动时 `db.exec(SCHEMA)`（`CREATE TABLE IF NOT EXISTS`）+ `applyTenantPrincipalHashColumnMigration`（`PRAGMA table_info` + `ALTER` + **部分唯一索引**）。 |
| **边界** | **单进程写语义**；多副本时文件库 **非** 共享真相源；**无**连接池、**无**流式迁移 API；SQL 带 **SQLite 方言**（`datetime('now')` 等）。 |

**最强耦合点（迁移中）**：`repository.ts` **未适配段** 仍与 **sql.js 语句 API**（`prepare` / `step` / `getAsObject`）及 **写后 `persistSaaSDatabase()`** 绑定；**已适配段** 仅依赖 **`SaaSDbAdapter`**。

---

## 3. 为什么现在切 Postgres ADR（而非继续 auth bridge）

- **1A–1J 已封 checkpoint**：继续堆 bridge **违背 cutline**（见 `docs/176`）。  
- **真实 tenant 登录 / JWT** 与 **共享 DB** 可并行立项，但 **托管生产** 几乎必然需要 **Postgres（或等价）**；先定 **数据面迁移策略** 可降低后续 auth 产品化返工。  
- **多实例与并发**：文件-backed sql.js **不适合** 水平扩展；ADR 先对齐 **目标运行时**，避免实现阶段临时拍脑袋。

---

## 4. 目标 / 非目标

**目标**

- 保持 **`repository` 为业务唯一数据边界**（Admin / 未来服务均经此层或更薄 adapter）。  
- 规划 **DB adapter**：先 **双实现**（**sql.js** / **postgres**），由 **配置** 选择 backend；**默认不改变** 当前 dev 行为直到显式切换。  
- 定义 **migration / bootstrap** 候选（版本表、up/down、CI 校验）。  
- 给出 **表映射草案** 与 **风险 / 验收 / 2B·2C 分包**。

**非目标（2A）**

- 不接 Postgres 驱动、不建 docker-compose Postgres **必选项**、不改 `sql.js` **默认 live** 路径。  
- 不改 **租户 webhook runtime**、不改 **admin-auth / RBAC** 逻辑（除未来为 adapter 注入所必需的小接缝 — **留到 2B**）。  
- 不做 **生产数据迁移执行**（仅策略与验收标准）。

---

## 5. 推荐迁移策略

1. **Repository boundary 保持**：继续对外暴露 **领域函数**（现有 `repository.ts` 的导出）；内部替换为 **`SaaSStore` / `QueryExecutor`** 接口（命名以实作 PR 为准）。  
2. **先双实现接口**：  
   - **SqlJsStore**：包装当前 `getSaaSDatabase` + `persistSaaSDatabase` 行为。  
   - **PostgresStore**：`pg` pool + 参数化查询；**无** 全量 export 语义，**每语句/事务** commit。  
3. **Migration 机制候选**（2B 择一或组合）：  
   - **node-pg-migrate** / **dbmate** / **自研极小 migration 表**（`schema_migrations` + 有序 SQL 文件）。  
   - 原则：**Postgres 与 SQLite 各一套 migration 源** 或 **共享抽象 DDL**（成本高，可 2C 评估）。  
4. **local / dev**：**可继续保留 sql.js**（零依赖、快速启动）；可选 `DATABASE_URL` 切换 Postgres 做 **parity 测试**。  
5. **hosted / production**：**目标后端 = Postgres**；文件库仅 **迁移工具源** 或 **灾备导出**，不作为多实例真相源。

---

## 6. 数据表映射草案

| 逻辑表 | 用途摘要 | Postgres 备注 |
|--------|----------|----------------|
| `tenants` | 租户主档 | `id`/`slug` TEXT→`TEXT`/`VARCHAR`；`created_at` 建议 `timestamptz` |
| `tenant_credentials` | KV 凭证 | 复合主键 `(tenant_id, key)`；**后续 KMS** 另 ADR |
| `tenant_faq_entries` | FAQ 行 | 复合主键 `(tenant_id, id)`；JSON 列可转 `jsonb` |
| `tenant_settings` | 设置 JSON | `settings_json` → `jsonb` |
| `tenant_admin_principals` | Admin principal + bridge hash | `CHECK` 枚举、`bridge_token`/`hash` 唯一约束需 Postgres 等价 **partial unique index** |
| `tenant_admin_principal_audit_logs` | 审计追加 | 索引 `(tenant_id, ts_iso DESC)` → `(tenant_id, ts_iso DESC)` 或 `timestamptz` |

**外键**：与现 SCHEMA 一致 **ON DELETE CASCADE**（Postgres 显式启用）。

---

## 7. Migration / bootstrap 策略

- **Bootstrap**：首次部署 Postgres 时运行 **migration runner** 至 head；**不**在应用启动时隐式执行大量 DDL（避免多实例竞态）— **迁移 Job 或启动前 hook**（2B 定）。  
- **从 sql.js 文件迁出**：离线 **导出 SQLite → CSV/SQL** 或 **应用层读旧库写新库**（维护窗口）；校验 **行数 + checksum**。  
- **SQLite 侧**：现有 `CREATE TABLE IF NOT EXISTS` 可保留用于 **dev**；**与 Postgres migration 内容语义对齐** 靠 **共享文档 + 双端测试**（验收见下）。

---

## 8. 风险

| 风险 | 缓解方向 |
|------|----------|
| **数据迁移错误** | 干跑、双写对比窗口、只读校验查询 |
| **回滚** | 保留文件快照；feature flag **backend**；文档化 **禁止** 混写两库 |
| **连接池 / 并发** | pool size、statement timeout、指数退避；Admin 重操作 batch |
| **多实例一致性** | 以 **DB 事务** 为准；废除依赖 `persist` 全量文件的并发假设 |
| **方言差异** | 索引/默认值/布尔类型显式对照；集成测试双跑（逐步） |

---

## 9. 验收标准（2B/2C 完成后对照）

- [ ] **配置切换**：同一镜像通过 env 选择 **sql.js** 或 **Postgres**，现有 **verify:saas-admin-*** 在 sql.js 下 **仍绿**。  
- [ ] **Postgres 路径**：最小 **smoke**（启动 + 单租户 CRUD + principal 读）在 CI 或文档化 staging **可重复**。  
- [ ] **Migration**：从零 DB `up` 与 **从 sql.js 导出数据** `up` 均有 **书面步骤**。  
- [ ] **无回归**：租户 webhook、auth cutline **行为不变**（除非显式 ADR 修订）。

---

## 10. 分包建议（2B / 2C）

| 包 | 建议范围 |
|----|-----------|
| **2B** ✅ | **SaaSDbAdapter** + **SqlJsSaaSDbAdapter**；principals/audit 经 **`getSaasDbAdapter()`**；默认 sql.js。 |
| **2C**（已落地 **stub + selection**） | **`PostgresSaaSDbAdapter`**（抛 **`postgres_adapter_not_implemented`**）+ **`CHATFLOW_SAAS_DB_DRIVER`** + **`getSaaSDbDriver()`**；**无 `pg`**、**未**切默认 driver。 |
| **2D** ✅ | **`src/saas/db-migrations/*`** 注册表 + **`buildSaasDbMigrationPlan`** + **`saas:db:migration:plan` / `bootstrap`**（dry-run）；**`saas_schema_migrations`** 仅常量、**未** DDL 执行。 |
| **2E** ✅ | **`postgres/*.sql`** 静态 DDL + **registry 绑定** + **SHA-256 checksum**；仍 **无执行**、**无 `pg`**。 |
| **2F** ✅ | **`runSaasPostgresMigrations`** 契约 + **bootstrap** 接线；**无 SQL**、**无 ledger 写**、**无 `pg`**。 |
| **2G** ✅ | **Ledger provider 接口** + **fake in-memory**；dry-run **already_applied / would_apply**；**真实 ledger 表仍未接线**。 |
| **后续（执行线）** | 真实 **`pg`**、**migration apply**、**ledger 落库**、**repository 全量**、**CI Postgres**、连接池与运维文档。 |

---

## 11. 核心决策一句话

**在保留 repository 边界的前提下，以「sql.js / Postgres 双实现 + 显式 migration」将托管生产默认迁到 Postgres；2A 仅 ADR，不动 live 路径。**

---

## 12. 参考路径（只读盘点）

- `src/saas/db.ts` — SCHEMA、`applyTenantPrincipalHashColumnMigration`  
- `src/saas/repository.ts` — 全部 DB 访问  
- `src/server.ts` — `getSaaSDatabase` warm-up  

---

## 13. Postgres Foundation checkpoint（叙事已封）

- **范围**：**2A–2M** — ADR、**`SaaSDbAdapter`** 双路径、migration **registry / SQL / checksum / execution contract / fake ledger**、**Postgres client gate + loader**、**connection config**、**optional TCP probe**、**go/no-go boundary + verify**。  
- **本刀推进（runtime / adapter，≠ Postgres ready）**：在 **`CHATFLOW_SAAS_DB_DRIVER=postgres`** + **`CHATFLOW_SAAS_POSTGRES_CLIENT=1`** + **连接配置合法** + **受控只读探测**（参数化 `SELECT 1`）成功时，**单一共享 `pg` Pool** 可创建复用；**`PostgresSaaSDbAdapter`** 具备最小 **query/execute**；**`postgres_client_runtime_wired`** 仅在此条件下为真。  
- **本刀推进（ledger 持久化切片，≠ Postgres ready）**：**`postgres/pg_0003_saas_schema_migrations.sql`** 为 **DDL 资产**（已入 registry；**应用不自动 apply / 运行时不偷偷建表**）。**`SaasMigrationLedgerProvider`** 为 **async**；**`PostgresSaasMigrationLedger`** 提供 **参数化** `list` / `record`（**checksum 冲突抛错、不静默覆盖**）。**`ledger_persistence_wired=true`** 仅表示 **ledger 表存在且可读**（**空表 ≠ migration 已应用**）；**`evaluatePostgresGoNoGo()` 仍为 `no_go`**（**`execution_wired` 仍 false**、**apply 仍 `not_wired`**）— 见 **`npm run saas:db:postgres:go-no-go`**。  
- **未完成（仍阻塞生产 Postgres）**：**migration apply 真执行**、**repository 全量切 Postgres**、**execution 与业务路径全接线** — 以 **`npm run saas:db:postgres:go-no-go`** 为准。  
- **与 multi-instance 关系**：先 **`docs/179`** 收口 **session / JSONL / 单写者** 假设，再推进 Postgres runtime，可降低「多副本 + 文件库」组合风险。
