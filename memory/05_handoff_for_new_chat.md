# Handoff for New Chat（下一聊天室可直接接手）

> **先读**：`memory/01_project_status.md`（真源）→ 本文件 → `memory/03_next_phase_plan.md`（Phase 24 节）→ **`docs/175_pro_saas_multitenant_mvp.md`** → **`docs/179_phase24_multi_instance_session_store_adr.md`**（多实例 session/store 决策）。

---

## 1. 当前项目一句话状态

**ChatFlow Pro**：七通道统一入站 + 出站、Legacy `/webhooks/:channel` 与 **多租户** `/webhooks/t/:slug/:channel` 并存；**多租户 SaaS MVP 已封板**（Phase 23 关闭），`package.json` **1.7.90**（以仓库为准）。**Phase 24**：**Postgres Foundation checkpoint 已封**；**Postgres runtime 底座切片** ✅；**Postgres `saas_schema_migrations` ledger persistence** ✅；**migration execution wired** ✅（apply 已具备真实执行 SQL + 写 ledger；**空表/可读 ≠ migration 已应用**）。**≠ Postgres ready**，**整体 `evaluatePostgresGoNoGo()` 仍为 `NO_GO`**（按当前门禁为准）。**默认 SaaS DB live 路径仍为 sqljs**（**未**切换 Postgres）；session **仍 in-memory**；**3A–3C** 同上。**未** 开工 Redis/外置队列。下一：**Postgres 执行线余下切口**（`docs/177`，仅建议，未开工）。

---

## 2. 当前阶段

| 项 | 状态 |
|----|------|
| **当前 Phase** | **24 — SaaS v1 Hardening** |
| **刚关闭** | **23 — SaaS MVP Final Closure** ✅ |
| **SaaS MVP 主线** | **closed / sealed**（见 `docs/175` **SaaS MVP status**） |

---

## 3. 已完成的最近关键 checkpoint（git）

1. **Phase 24 / Auth-RBAC Foundation（1A–1J）** — **子里程碑已封**（`docs/176` + `verify:saas-admin-*`）。  
2. **Phase 24 / Postgres Foundation（2A–2M）** — **checkpoint 已封**；**`go/no-go` 仍为 `NO_GO`**。  
3. **Phase 24 / Postgres runtime 底座切片** — **shared Pool + PostgresSaaSDbAdapter 最小接线** ✅（**`0b540f4`**）；**默认仍为 sqljs**；**整体仍为 `NO_GO`**。  
4. **Phase 24 / Postgres ledger persistence** — **`saas_schema_migrations` 持久化** ✅（**`22ffc2d`**）；**空表/可读 ≠ migration 已应用**；**整体仍为 `NO_GO`**。  
5. **Phase 24 / migration execution wired** — apply 真实执行 SQL + 写 ledger ✅（**`c142da3`**）；**整体仍为 `NO_GO`**（按当前门禁为准）。  
6. **Phase 24 / 包 3B** — **session store 抽象骨架**（**默认 in-memory**）；**非** MI-ready。  
7. **Phase 24 / 包 3C** — **JSONL / notify 契约收口**（**仍** at-least-once，**非** MI-ready）。  
8. 更早：**Phase 23 关闭**、**Phase 24 开 v1 Hardening** — 仍见 `memory/02` 与 `git log`。

**Push**：以 **`git log origin/main`** 为准。

---

## 4. 下一步唯一优先动作

**Phase 24 — Postgres 执行线**：**Pool + adapter + ledger persistence + execution wired** 已落地（**≠ ready / ≠ go**）；余下按 **`docs/177`** 与 **`npm run saas:db:postgres:go-no-go`**（**仍为 `no_go`**）推进。**下一建议最小切口：repository 某一极小路径 PG 化（仅建议，未开工）**。**不** 在本优先档并行开 Redis/队列。

**集成注意**：下游若对 lead/handoff **notify body** 做 **严格 JSON schema**，需 **放宽** 以接受 **`event_type` / `idempotency_key`** 等新增字段。

**合并门禁（不变）**：**T0** `npm run build` + **T1** `npm run staging:docker-smoke`（或 CI `docker-smoke` 绿）。

---

## 5. 禁止重复做的事

- **不要把 SaaS MVP 当「未完成主线」** — 已 sealed，见 `docs/175` 与 `memory/01`。  
- **不要未读 `docs/175` § Tenant webhook verification 就假设租户路径会回退 env** — 22D 已断回退。  
- **不要用 webhook idle GET 当正式健康探针** — 用 **`GET /health`**。  
- **不要无 ADR 扩大 `faq.fallback_enabled` 到 post_capture/capture** — **MVP 已知 partial，冻结**。  
- **不要重复 Phase 23 已关闭议题**：非主链路 send/suppress 二次审计（结论已 **covered**）、idle GET 收紧（已裁决 **A**）。

---

## 6. 当前风险（接手后默认牢记）

1. **租户凭证 DB 明文**、**单进程内存 session**、**sql.js 文件库**、**JSONL 单写者假设** — Phase 24 主攻克，见 `memory/04` § Phase 24 预期风险。  
2. **历史 session 不随租户开关清空** — 租户改 `tenant_settings` 后，旧内存 session 可能短期叠加行为（已知，非阻塞）。  
3. **slug 可枚举 + idle JSON 信息面** — MVP **已接受边界**，见 `memory/04` § Known SaaS MVP boundaries。  
4. **HTTP notify**（lead/handoff）走 **`notify.enabled`**，**不是** `bot.enabled` 子集 — 设计如此，勿当 bug。

---

## 7. 真源与协作（精简保留）

- **Phase / Version**：以 **`memory/01`** 为准；改版本时同步 **`package.json`**、`memory/03` 版本链（若仍维护长日志）、必要时 **`memory/04`** 一行。  
- **SaaS 契约**：**`docs/175`** + **`docs/GPT_PLANNER_HANDOFF_BLUEPRINT.md`**。  
- **实现分工（指挥官锁定惯例）**：默认 **龙虾** 主改 `src/`；**Cursor** 出指令与验收；极小改动可例外 — 见历史 `memory/05` 旧文或团队约定。  
- **无 git / 看 CI**：`npm run report:github-ci`（**`docs/155`**）。  
- **容器内无 Docker**：勿将本地 `staging:docker-smoke` 失败等同阻塞 — 以 CI T1 + **`docs/155`** *T1 equivalence* 为准。

---

## 8. 历史完成摘要（防失忆）

细粒度 Phase 1–22 交付链见 **`memory/02_completed_work.md`** 正文；**不必**在新聊天室首轮全文复读，只需知：**七通道 real-send、验签、Handoff、SaaS 22A–22E、23 MVP 封板** 已在栈上。

---

## New Chat Rule

- 新开聊天室：**先读本文件 + `memory/01` + `docs/175`（MVP status）**，再改代码或排期。  
- 当前边界：**七通道 live**；租户路径验签/hub verify **仅 DB**，不回退 env（见 `docs/175`）。  
- **指挥官偏好**：未阻塞时按 **`memory/03` Next** 继续推进；Phase 24 拆包自行与指挥官确认优先级。
