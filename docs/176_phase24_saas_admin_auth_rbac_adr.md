# ADR — Phase 24 / SaaS Admin Auth & RBAC（最小落地）

> **状态**：Accepted；**包 1I** 已接入 **principal 审计摘要 + rotation（`rotated`）钩子**；仍为 **dev/ops 过渡**，**非**产品化登录  
> **范围**：SaaS **控制面**（`/saas/*` Admin API + Admin UI），**非** MVP 功能补完  
> **真源**：`package.json` **1.7.75+**（Phase 24 小步）；SaaS MVP **sealed**（`docs/175`）；本 ADR 属于 **Phase 24 — SaaS v1 Hardening**

---

## Phase 24 — 包 1B（auth abstraction bridge，已落地）

- **代码**：`src/saas/admin-auth.ts` — break-glass + **DB `tenant_admin_principals`**（包 1G）+ **tenant admin / readonly** JSON map（包 1E / 1F）；`resolveSaasAdminAuth` / `requireSaasAdmin`（**async**，含 DB 查询）。
- **未变**：`/saas/v1/health`、`GET /saas/admin` 仍**不**要求 Bearer；`/saas/v1/admin/*` 仍 401 / 放行规则与 1B 前一致；**无**用户表、**无** JWT、**无**租户级 RBAC；legacy 与租户 webhook 边界不动。
- **验证**：`npm run verify:saas-admin-auth-break-glass`（需已 `npm run build`）。

---

## Phase 24 — 包 1C（authorization scaffold，已落地）

- **代码**：`admin-authorization.ts` 引入 **`resource_scope`**（`platform` | `tenant_targeted`）与 **`allowed_roles`**；`admin-routes`：**先鉴权** → **再授权**；**401** / **403** `forbidden` 分层。未匹配策略的路径不因此 403（仍 404）。
- **验证**：`npm run verify:saas-admin-rbac-scaffold`。

---

## Phase 24 — 包 1D（tenant-scoped RBAC semantics，已落地）

- **语义**：**platform-only** — `GET|POST /saas/v1/admin/tenants` → 仅 **`platform_admin`**。**tenant-targeted** — 单租户路径：list/create 以外；`tenant_admin` 仅 **`scope_type: tenant` + `tenant_slug` 与 URL slug 一致** 时可读写 creds/faq/settings 与读 tenant；`tenant_operator_readonly` 仅可读 **get tenant / get faq**，写路由与 platform 路由拒绝。
- **纯函数**：`resolveAdminRouteTargetTenantSlug`、`isAdminRouteTenantScoped`、`doesAdminScopeMatchRouteTarget`、`authorizeAdminRouteAfterAuth`（在 `allowed_roles` 之后做 slug 对齐）。
- **Live**：策略语义 + **包 1E/1F** env map 可产出 **`tenant_admin` / `tenant_operator_readonly`**（见下两节）。未配置 map 时仍仅 break-glass。
- **验证**：`npm run verify:saas-admin-rbac-tenant-scope`（纯合成 principal，不启服务）。

---

## Phase 24 — 包 1E（tenant principal bridge，过渡方案）

- **目的**：验证 **`tenant_admin` 可穿过 auth → authorization 全链路**；**不是**生产级多用户登录，仅为 **dev/ops bridge**，可整体移除或替换为 DB/JWT。
- **机制**：环境变量 **`CHATFLOW_SAAS_TENANT_ADMIN_TOKENS`** — JSON 对象 **`slug → secret`**（键名小写归一）。`Authorization: Bearer <secret>` 命中某 slug 的 secret 时产出 **`role: tenant_admin`**、**`auth_source: tenant_bridge_env`**、**`scope_type: tenant`**、**`tenant_slug`**、**`tenant_id: null`**。
- **优先级（1G 后）**：break-glass → **DB principals** → 本 env map（详见包 1F / 1G 完整链）。
- **未做**：DB user、密码、JWT、session、`public/saas-admin.html` 改造、审计登录。
- **验证**：`npm run verify:saas-admin-tenant-bridge`（见 `.env.example` 注释）。

---

## Phase 24 — 包 1F（tenant readonly principal bridge，过渡方案）

- **目的**：让 **`tenant_operator_readonly`** 第一次经 **真实 HTTP** 走 auth → authorization；**不是**最终只读登录产品。
- **机制**：**`CHATFLOW_SAAS_TENANT_READONLY_TOKENS`** — 与 1E **相同** JSON **`slug → secret`** 形状；命中后 **`role: tenant_operator_readonly`**、**`auth_source: tenant_readonly_bridge_env`**、**`scope_type: tenant`**、**`tenant_slug`**、**`tenant_id: null`**。
- **优先级（1G 后）**：**1** break-glass **`platform_admin`** → **2** **DB** `tenant_admin_principals` → **3** **`CHATFLOW_SAAS_TENANT_ADMIN_TOKENS`** **`tenant_admin`** → **4** **`CHATFLOW_SAAS_TENANT_READONLY_TOKENS`** → **5** 未认证。同 secret：**DB 先于** env；admin map 先于 readonly map。
- **授权**：沿用 1D 策略表 — 只读仅 **GET tenant / GET faq**；slug 与 URL 归一 **小写** 比较（`admin-authorization`）。
- **验证**：`npm run verify:saas-admin-tenant-readonly-bridge`。

---

## Phase 24 — 包 1G（DB-backed tenant principal source，过渡方案）

- **目的**：把部分 **tenant bridge** 从纯 env 迁到 **SaaS DB**；**不是**最终多用户登录、**不是**密码/JWT/session 产品化。
- **表**：`tenant_admin_principals` — 见 **包 1H**（持久化形态以 hash 为主）；1G 语义仍适用。
- **鉴权优先级（固定）**：**1** break-glass **`platform_admin`** → **2** DB 启用行（**`auth_source: tenant_bridge_db`**，`tenant_slug` / `tenant_id` **来自 DB**）→ **3** `CHATFLOW_SAAS_TENANT_ADMIN_TOKENS` → **4** `CHATFLOW_SAAS_TENANT_READONLY_TOKENS` → **5** 未认证。
- **Admin API（仅 `platform_admin`）**：`GET` / `PUT /saas/v1/admin/tenants/:slug/principals` — `PUT` 仍接受 **明文 token 输入**（仅此传输/配置瞬间），**不落库明文**（1H）。
- **验证**：`npm run verify:saas-admin-db-principal-bridge`。

---

## Phase 24 — 包 1H（bridge token hash-at-rest，存储硬化）

- **目的**：将 DB principal 的 **静态存储**从明文 secret 改为 **SHA-256 十六进制小写**（`hashBridgeToken`，`src/saas/bridge-token.ts`）；**不加盐、无 pepper/KMS** — **不是**最终凭证安全终态，仅为降低「库文件泄露即裸奔」面。
- **列**：`bridge_token_hash`（唯一索引，部分索引忽略空）；**保留** `bridge_token` 列 **不删除** — 新写入用 **行 `id` 占位**满足 NOT NULL/UNIQUE，**不存真实 secret**；历史行可仍为明文直至 **首次成功鉴权后懒迁移**（写入 hash + 占位 `bridge_token`）。
- **读**：`findEnabledPrincipalByBridgeToken` — 先按 **hash** 命中；否则 **legacy** `bridge_token = Bearer` 等值匹配并触发懒迁移。
- **写**：`replaceTenantAdminPrincipals` — 仅写 `bridge_token_hash` + 占位 `bridge_token`。
- **GET principals**：响应 **不含** `bridge_token`；含 `has_token`、`token_state`（`hash_at_rest` | `legacy_plaintext_at_rest`）及 `role` / `is_enabled` / `display_name` / 时间戳。
- **兼容**：break-glass、env bridge **不变**；无 DB principal 时行为与 1G 前一致。
- **验证**：`npm run verify:saas-admin-db-principal-token-hardening`。

---

## Phase 24 — 包 1I（principal audit trail + rotation hook）

- **目的**：在 **hash-at-rest** 之上增加 **可验收的控制面审计摘要**；**不**做 SIEM、**不**做登录审计产品、**不**做 KMS/轮换策略引擎。
- **表**：`tenant_admin_principal_audit_logs` — 字段含 `tenant_id`、`principal_role`、`action`（`created` | `updated` | `disabled` | `enabled` | `rotated` | `deleted`）、`actor_*`（来源/角色/scope/slug）、`target_display_name`、`target_is_enabled`、`token_state`、`ts_iso`。**不**存明文 token、**不**存 hash。
- **写入**：`PUT .../principals` **replace 前后 diff** — 同 secret（hash/legacy 匹配）→ 仅元数据则 `updated` / `enabled` / `disabled`；同 role 换 secret → `rotated`；新 role 行 → `created`；移除 → `deleted`。
- **查询**：`GET /saas/v1/admin/tenants/:slug/principals/audit?limit=`（默认 50，上限 200），**仅 `platform_admin`**，新→旧。
- **验证**：`npm run verify:saas-admin-principal-audit`。

---

## 1. 背景

- 多租户 SaaS MVP 已交付：**租户 Webhook 运行时**（`/webhooks/t/...`）与 **Legacy**（`/webhooks/<channel>`）双轨并存；租户路径验签 / hub verify **不回退**进程 `env`（`docs/175`）。
- 当前 **Admin 面**依赖单一共享密钥：`CHATFLOW_SAAS_ADMIN_TOKEN` + `Authorization: Bearer <token>`，**无**用户身份、**无**租户级授权、**无**审计主体。
- 面向托管生产时，单一 token 无法支撑多运营人员、最小权限、租户隔离运维与合规叙事。

## 2. 当前现状（代码事实，本 ADR 撰写时）

| 区域 | 行为 |
|------|------|
| **Token 读取** | `breakGlassAdminToken()`；**`parseTenantAdminTokenMap()`** / **`parseTenantReadonlyTokenMap()`**（JSON slug→secret） |
| **鉴权** | `resolveSaasAdminAuth`（async）：break-glass **全串** → **DB**（启用行：按 **`bridge_token_hash`** 匹配 Bearer 的 SHA-256；legacy 明文列兼容）→ admin map **secret** → readonly map **secret** → 未认证；来源含 **`break_glass_env` / `tenant_bridge_db` / `tenant_bridge_env` / `tenant_readonly_bridge_env`** |
| **授权** | `authorizeAdminRouteAfterAuth`：**`allowed_roles`** + **`resource_scope`**；`tenant_targeted` 时 **`tenant_admin` / `readonly` 须 slug 匹配**；`platform_admin` 全放行。未匹配策略 → 不 403 |
| **`/saas/v1/health`** | **不**校验 Bearer；返回 `admin_configured: Boolean(breakGlassAdminToken())` |
| **`GET /saas/admin`** | 静态返回 `public/saas-admin.html`，**无**服务端会话 gate |
| **Admin UI** | `public/saas-admin.html`：用户粘贴 token，`fetch(..., { headers: { Authorization: 'Bearer ' + token } })` 调所有 admin REST |
| **数据模型** | `src/saas/db.ts`：`tenant_admin_principals` + **`tenant_admin_principal_audit_logs`**（摘要审计）；另 `tenants`、`tenant_credentials`、`tenant_faq_entries`、`tenant_settings` |
| **CI / 脚本** | 多个 `verify:*` 与 `tenant-boundary-verify` 使用 env 中的 `CHATFLOW_SAAS_ADMIN_TOKEN` 调用 Admin API（与实现演进需后续对齐，不在本 ADR 包内改脚本） |

## 3. 为什么先做 Auth / RBAC 而不是 Postgres

- **依赖顺序**：身份与授权是控制面扩展的前置条件；在仍使用 sql.js 文件库阶段即可落地 **可验证** 的「谁能否访问哪类 API」，避免先迁库却仍共享一把万能钥匙。
- **风险切片**：Postgres 引入迁移、双写、运维复杂度；Auth/RBAC 可 **小刀** 增量交付（新表或新模块 + 路由守卫），**不**要求替换 webhook 主链或租户运行时存储。
- **回滚简单**：保留 legacy 行为与租户 webhook 边界前提下，Admin 鉴权可开关/双轨（见 §9）。

## 4. 目标 / 非目标

### 4.1 目标（Phase 24 本轨）

- 替代或**补充**单一全局 admin token：引入 **可识别主体**（用户或服务账号）与 **角色**。
- **租户级**授权：tenant_admin / tenant_operator 仅能操作**其租户**资源；platform_admin 可跨租户（最小集，见 §5）。
- Admin API 与（后续）Admin UI 有明确 **403/401** 语义与可测验收。
- **不**改变：`/webhooks/t/...` 与 legacy webhook 的验签与 env 边界（MVP 冻结结论保持不变）。

### 4.2 非目标（显式排除）

- **不**在本轨做 Postgres 迁移或替换 sql.js（另立 Phase 24 包）。
- **不**改 FAQ / lead / intent / outbound **对话主链**业务逻辑。
- **不**做大重构（例如整站微服务化、完整 IdP 集成）；优先 **可落地、可回滚** 的最小方案。
- **不**将本 ADR 解释为 MVP「补功能」；MVP 已 sealed。

## 5. 角色草案（最小集）

| 角色 | 说明 |
|------|------|
| **platform_admin** | 平台级：创建租户、查看全租户列表、跨租户紧急运维（需严格审计与极少人数）。 |
| **tenant_admin** | 租户级：管理该租户 `credentials` / `faq` / `settings`；不可访问其他租户。 |
| **tenant_operator_readonly** | 租户级只读：仅 `GET` 类（如拉 FAQ、读设置摘要）；**不可**写凭证与设置（可选首版即做或 Phase 24.1 跟进）。 |

实现时可采用 **字符串 role** + **membership 表**（`user_id` + `tenant_id` + `role`），platform_admin 可用 `tenant_id IS NULL` 或独立 flag，具体由实现 PR 在本文档下细化，但 **不得** 隐式扩大 tenant 用户对他租户的写权限。

## 6. 推荐最小实现路径

### 6.1 替代 / 补充单一全局 token

- **阶段 A（兼容）**：保留 `CHATFLOW_SAAS_ADMIN_TOKEN` 作为 **bootstrap / CI / 紧急 break-glass**，与新 JWT（或 session）**并存**；新客户端优先走登录流。
- **阶段 B（收紧）**：可选 env：`CHATFLOW_SAAS_ADMIN_ALLOW_LEGACY_TOKEN=0` 关闭旧 token（仅当新 auth 已验证稳定）。

### 6.2 租户级用户与角色模型（示意）

- 新表（名称可调整）：`saas_users`（id, email 或 username, password_hash 或 external_sub）、`saas_sessions` 或 **无状态 JWT**、`tenant_memberships`（user_id, tenant_id, role）。
- **platform_admin** 可存 `user_flags` 或单独 `platform_admins` 表，避免与普通 tenant 成员混淆。

### 6.3 Session / token 方案候选

| 方案 | 优点 | 缺点 |
|------|------|------|
| **有状态 session**（cookie + server store） | 可即时吊销、实现直观 | 与当前无 session 中间件需新增存储；多实例需 sticky 或 Redis（与 Phase 24 后续包衔接） |
| **JWT（短期 access + 可选 refresh）** | 无状态、易水平扩展 | 吊销与轮换需 denylist 或短 TTL + refresh 策略 |
| **Signed cookie（HMAC）** | 实现轻 | 载荷设计需严谨，仍建议短 TTL |

**推荐默认**：首版 **JWT access（短 TTL，如 15–60m）+ refresh 可后续**；若坚持单进程 sql.js，可先 **内存 denylist 可选** 或接受短 TTL 不吊销 MVP。最终选型在实现 PR 的「实现说明」中写死一项并附威胁模型一句。

### 6.4 最小 API 边界

- **新增**（示例）：`POST /saas/v1/auth/login`、`POST /saas/v1/auth/logout`（若 cookie）、`GET /saas/v1/auth/me`。
- **保护**：现有 `/saas/v1/admin/*` 在 `requireAdmin` 处演进为：`verifyJwtOrSession` **或** legacy token（阶段 A）。
- **租户作用域**：所有 `.../tenants/:slug/...` 在 handler 内校验 **membership**：`tenant_admin` 仅能匹配自身 slug（或 tenant_id）。

### 6.5 Admin UI 最小变更

- 替换「粘贴万能 token」为 **登录表单**（username/password 或 magic link 后续）；登录成功后 **内存 / sessionStorage 存 access token**（若 JWT）或依赖 **HttpOnly cookie**（若选 cookie 方案）。
- 错误展示：401/403 与 token 过期提示；**不**要求重做整页设计。

## 7. 向后兼容

- **Legacy `/webhooks/*`**：无变更。
- **租户 webhook**：验签与凭证仍仅租户 DB + 既有规则；Admin 鉴权与 webhook **解耦**。
- **现有运维脚本**：在阶段 A 仍可用 env token；文档与 CI 迁移计划单列（不在本 ADR 强制一次改完）。

## 8. 风险

| 风险 | 缓解 |
|------|------|
| JWT 泄露 / XSS | HttpOnly cookie 或 strict CSP；短 TTL；敏感操作二次确认（后续） |
| RBAC 漏检导致跨租户写 | 集成测试矩阵：每 role × 每路由；代码审查 checklist |
| 与单实例 sql.js 并发 | 用户表写入低频；注意 `persistSaaSDatabase` 频率（实现时批量化） |
| break-glass token 长期不撤 | 运维 runbook：rotation + 监控 `admin_configured` |

## 9. 验收标准

1. **未登录**访问任意 mutating `PUT/POST` `/saas/v1/admin/*` → **401**（或 403 若区分未认证/无权限）。
2. **tenant_admin（租户 A）**无法通过篡改 slug 对租户 B 执行 `PUT .../credentials` → **403**。
3. **platform_admin** 可按设计跨租户操作（若产品允许列出租户则 **GET /tenants** 可用）。
4. **`npm run build` + `npm run staging:docker-smoke`** 仍通过（脚本若仍用 legacy token，阶段 A 保持绿）。
5. **文档**：`.env.example` 与 `docs/175` 或本 ADR 的「运维说明」补充新变量与弃用时间表（实现 PR 携带）。

## 10. 回滚策略

- **功能开关**：保留 `CHATFLOW_SAAS_ADMIN_TOKEN` 全量放行路径（阶段 A）；紧急时设回仅 legacy 或回滚部署版本。
- **数据**：新增用户表与 membership **可保留**；回滚代码旧版可忽略新表（向前兼容由迁移策略保证）。
- **租户 webhook**：任何回滚 **不得** 恢复「租户路径回退 env secret」行为（MVP 已冻结）。

---

## 参考路径（只读盘点）

- `src/saas/admin-routes.ts` — admin 鉴权与路由
- `src/server.ts` — `req.headers.authorization` 传入 admin handler
- `public/saas-admin.html` — 当前 Bearer 模型
- `src/saas/db.ts` — 当前 schema（无用户/角色）
