# Handoff for New Chat（下一聊天室可直接接手）

## Claude / 下一 Agent 接手 — VPS Telegram 真链路（2026-04-10）

**仓库**：`ChatFlow_Pro`，远程 `origin/main`（本次会话后应含最新 `tenant-app.html` + 本 memory 更新）。

**Bryan 目标**：Vultr 上跑通 ChatFlow，Telegram Webhook 公网闭环（租户 `starbright01`）。

**已落地（运维侧）**
- Cloudflare：`api.starbright-solutions.com` → A → `45.32.104.102`（建议保持 **DNS only / 灰云** 便于源站证书）。
- VPS：Nginx 监听 **443**，Let’s Encrypt，反代到 **`http://127.0.0.1:3050`**（以实际 `sites-available` 为准）。
- UFW：`OpenSSH` + `Nginx Full` 已放行。
- Telegram：`setWebhook` 已成功，`getWebhookInfo.url` 正确。

**当前阻塞（明确）**
- `getWebhookInfo.last_error_message` 曾为 **`Connection timed out`** → 已因 **443 未监听** 修复。
- 随后 **`502 Bad Gateway`** / Telegram **`Wrong response from the webhook: 502`** → **本机 `curl http://127.0.0.1:3050` = connection refused**，即 **Node 进程未在 3050 监听**（或 `PORT` 与 Nginx `proxy_pass` 不一致）。
- **下一执行顺序**：在 `/opt/chatflow/ChatFlow_Pro` 确认 `.env`、`npm run build`、`systemd` 或等价方式 **常驻** `node dist/src/index.js`；`curl http://127.0.0.1:3050/saas/v1/health` 通 → 再验 HTTPS webhook GET/POST → `getWebhookInfo` 错误消失。

**前端（本轮已改，需 push 后 VPS 无强制同步 HTML，除非托管静态）**
- `public/tenant-app.html`：Telegram 向导 **第 3 步**（Webhook）— 公网 Base URL（localStorage）、从 `GET .../overview` 取 **slug**、生成 `https://{base}/webhooks/t/{slug}/telegram`、**textarea** 可编辑 `curl`、占位符 **`YOUR_BOT_TOKEN_HERE`**（避免误留尖括号导致 Telegram 404）。

**安全**
- Bot Token 曾在对话中 **多次明文**；建议 @BotFather **revoke / 换新**，租户后台 **重新 Save**。

**关键代码路径**
- Webhook 路由：`src/saas/webhook-path.ts`、`src/saas/tenant-webhook-http.ts`（`POST` Telegram → `handleTelegramWebhook`）。
- 启动：`package.json` `start` = `node dist/src/index.js`；默认 `PORT` 见 `src/server.ts`（环境变量覆盖）。

---

## 测试教学新阶段现场记录（第一课 · 2026-04-09）

- 第一课（认识系统与进入后台）现场测试中，`Knowledge` 页面出现前端错误：`fmtTime is not defined`。
- 根因已定位：`public/tenant-app.html` 的 Knowledge 视图调用 `fmtTime(...)`，但未定义该函数。
- 已做最小修复：补充 `fmtTime(ts)` 时间格式化函数（含空值/非法值保护），不改后端、不扩功能、不升版本。
- Bryan 复测结果：`Knowledge 正常`。
- 当前建议：继续按第一课顺序完成 `Channels -> Reports -> Settings`，收口后进入第二课（Settings Setup 六步）。

## Phase E overall closed + Phase D-C4 closed + D-C3 Sealed（2026-04-09）

- **租户后台 UI**：`public/tenant-app.html` — 七个主面（Overview / Settings / Channels / Inbox / Leads / Knowledge / Reports）已完成最终一致性收口：统一文案系统、动作命名、状态语义（`st-*`）、workbench 层（`wb-*`）、以及 `ov-*`/`stg-*` 在首页与设置页的扩展。后端 **未**改 `src/`。
- **当前阶段**：**商业 SaaS 后台 UX 第二阶段（P0 实现）**。设计真源：`docs/internal/chatflow-pro-saas-admin-ux-phase2-design-source.md`。该阶段是 UI 第一阶段之后的新阶段，**不是** D-C / E 旧主线扩面。
- **P0 已落地**：Setup 六步最小闭环、Overview/Settings/Setup 真实联动、Inbox/Leads/Handoff 最小真实动作闭环（含成功/失败反馈与刷新）。
- **本轮新增**：完成 P0 实租户冒烟与 P1 设计真源。P1 文档：`docs/internal/chatflow-pro-saas-admin-ux-phase2-p1-design-source.md`（仅设计）。
- **阻塞结论**：当前不建议直接放行 P1 实现；需先关闭 P0 真实阻塞（postgres 建租户 SQL 兼容、tenant webhook secret 门禁指引、website->conversation 生成断点）。
- **最新状态更新**：P0 三个真实阻塞已修复并通过 Postgres 二次实租户冒烟；当前可进入“短期稳定观察 -> P1 放行评估”。
- **稳定观察结论**：已完成至少一轮重复最小路径验证，结果稳定；当前进入 P1 放行前 residual 清点与小批预修阶段。
- **预修最新结论**：P1 高概率 residual（knowledge/faq/platform settings 写路径）已完成小范围 adapter 化并通过 Postgres hosted 最小验证，可进入 P1 放行讨论。
- **P1 首批已落地**：Reports 关键下钻（带筛选上下文）、Knowledge review/publish 最小状态闭环、Setup/Overview blocker 可视化提示已上线到 `public/tenant-app.html`。
- **P1 首批短回归**：已完成 Reports/Knowledge/Setup-Overview 三块短回归 + Postgres 实租户最小复核，核心链路通过（knowledge 状态推进、reports 下钻目标筛选、inbox/leads 动作链、overview/setup 状态一致）。
- **门禁判断**：当前可进入 hosted / production-ready v1 100% 门禁评审；保守建议在评审前补一条服务端 knowledge publish 角色硬校验，避免仅前端限制。
- **最新补强完成**：knowledge publish/review 权限已补为服务端硬校验（readonly 返回 403 `knowledge_transition_forbidden`，含 message/guidance），前端错误提示已对齐服务端 message。
- **签核判断更新**：hosted / production-ready v1 最后权限争议点已消除，可推进到 100% 最终签核。
- **Phase E**：**overall closed / sealed** — `docs/internal/phase-e-overall-closeout.md`。**E1 / E2（a~d）/ E3** = **completed**。**可卖 / 可交付（规程包）= 100%**。**hosted / production-ready v1（具体环境）** **须**实际签核，**不**因 closeout 自动达标。**不是** D-C。
- **[已具备] Hosted v1 门禁与交付规程**
  - **设计真源**：`phase-e-hosted-v1-go-live-gate-design.md`
  - **签核模板** + **index** + SOP/runbook 交叉引用
  - **E2** `chk_id` / 证据 / 环境 / 前置：`phase-e2-hosted-v1-checklist-spec.md`
  - **E3** 只读聚合报告规格 + 模板 + 样例 + 可选 `scripts/e3-hosted-v1-readonly-aggregate-report.mjs`（stdout，只读）
- **[仍不自动等于]**
  - 某次 **具体环境** 已 **书面签核通过**
  - **hosted v1 正式对外宣告达标**（须主设计 §8 + 模板 E/F）
- **[边界]**
  - 真正达标属 **签核执行 / 环境落地**，**不是**再补 **Phase E** 内部真源
  - **E2-e**、**E3 扩面**、**E4** — **须新 phase / 新 Go**，**禁止**挂靠 E 名义偷扩
- **Phase D-C4**：**overall closed** — `d-c4-overall-closeout.md`；**禁止**再挂靠 D-C 扩面。

## D-C3 + D-C4 交付快照（2026-04-09）

- **D-C3**：**sealed**；**D-C3C 冻结**。
- **[已具备] 恢复治理（D-C4 交付物 · 总线已关闭）**：
  - **D-C4A**：恢复后只读核查 pack — `saas:recovery:readonly-check`、`verify:d-c4a-recovery-readonly-check`、`d-c4a-recovery-readonly-check-spec.md`。
  - **D-C4B**：恢复分流决策表 + runbook §6 + 交付/演练/SOP — `d-c4b-recovery-decision-table.md`、`d-c4b-delivery-drill-checklist.md`、`d-c3-operator-runbook.md`、`backup-restore-sop.md` / `rollback-sop.md` / `install-sop.md`。
  - **D-C4C**：只读 governance bundle + CI/RC/Staging 门禁策略 — `verify:d-c4c-readonly-governance-bundle`、`d-c4c-readonly-governance-bundle-spec.md`、`d-c4c-ci-rc-staging-gates.md`、证据示例 JSON。
- **[仍不具备]**：**D-C3C**；**自动补偿**；**恢复写修复器**；**批量恢复器**；**半自动闭合**；**CI 默认**跑生产向 `saas:recovery:readonly-check`（仍 **Staging / manual review**）。
- **[边界]**：**Phase D-C4 overall = closed** — `docs/internal/d-c4-overall-closeout.md`；**禁止**以 D-C 名义扩面；**Phase E** **亦** **closed**（`phase-e-overall-closeout.md`），**非** D-C。
- **设计长文**（条款仍读）：`d-c4-recovery-consistency-design.md`；**评审包**：`d-c4-design-review-package.md`。
- 版本：**1.7.108 / Pro_v1.07.108**（D-C4 closeout 锚；**不**因 closeout 再升 patch）。
- **D-C3**：`verify:d-c3-closeout` 仍有效。
- **D-C2C1**：**已归档**；**D-C2C2 未放行**。
- **下一默认动作**：**Phase E overall closed**；后续为 **签核执行** 或 **Bryan 新 phase**；**E2-e / E3 扩面** **不得**挂靠 E 偷跑；**非** D-C / **非** E 延伸。

## Phase D-C2B 正式收口 + D-C2C 接手快照（2026-04-09）

- Phase 状态：**Phase D-C2B（轮换 / break-glass TTL / governance 审计闭合 / verify bundle）已正式收口并关闭**。**当前进入 Phase D-C2C**（保留 / cleanup — **先设计再分刀实现**）。
- 版本：**1.7.101 / Pro_v1.07.101**（D-C2B 已覆盖；**不**为纯收口再升 patch）。
- D-C2B 证据（操作）：
  - `npm run verify:d-c2b3-governance-bundle`（含 B1/B2/B3）。
  - 单测：`verify:d-c2b1-credential-rotation`、`verify:d-c2b2-break-glass-ttl`、`verify:d-c2b3-governance-closure`。
  - 轮换 CLI：`npm run rotate:tenant-credential:expected`（`--tenant-id=` `--key=` `--expected=` `--new=`）。
  - Break-glass：`CHATFLOW_BREAK_GLASS_ACTIVE`、`CHATFLOW_BREAK_GLASS_EXPIRES_AT` + `CHATFLOW_SAAS_ADMIN_TOKEN`。
  - 治理结构化日志（opt-in）：`CHATFLOW_STRUCTURED_RUNTIME_LOG=1` 时输出 `governance_audit`。
- D-C2A / D-C1 仍真：**禁止**回退 D-C2A/D-C1 收口边界；见 `memory/02`、`verify:d-c2a-*`、`verify:d-c1-*`。
- **下一聊天室默认动作**：读 **`memory/03` D-C2C 节** + 本轮 **D-C2C 规格**（dedupe / state / 审计与文件 / backup）→ 按 **D-C2C1→C2→C3** 开 **单一**实现线；**禁止**并行 D-C3、UI、Redis、泛 backlog。

## Phase D-B 主线关闭 + D-C 总线快照（2026-04-09）

- Phase 状态：**Phase D-B（托管化）已正式关闭**；**D-B1 / D-B2 / D-B3 均 closed**。
- D-B 收口证据（摘要）：
  - **D-B1**：默认 live = Postgres、readiness fail-fast、交付脚本 PG 主口径、rollback + backup/restore 最小链、deployment 对账。
  - **D-B2**：session / processing / delivery 三层 PG 外置 + CAS + runtime 接线。
  - **D-B3**：inbound / outbound / notify 三线 dedupe；语义 200/202/409；`npm run verify:dedupe-d-b3-closeout`。
- **不要**再开 D-B 名义新功能。

## D-B1 关闭 + D-B2 启动快照（2026-04-08）

- Phase 状态：**D-B1 已正式关闭；当前 Phase = D-B2**
- 版本：**1.7.91 / Pro_v1.07.91**
- D-B1 收口证据（已完成）：
  - 默认 live = postgres
  - sqljs 仅 dev/single-node/compat
  - rollback 真执行链 PASS
  - backup/restore 最小链 PASS
  - deployment-info / state / stable_version 对账一致
- D-B2 本轮只开首刀（session state 外置）：
  - 新增 migration：`pg_0007_phasedb2_session_state.sql`
  - 新增表：`tenant_session_state`
  - 新增 repository：`src/saas/session-state-repository.ts`（get + CAS upsert）
  - 未并行 processing/delivery state，未进入 D-B3

## Phase D-B1 接手要点（2026-04-08）

- D-B 设计已通过，执行顺序锁定：**D-B1 -> D-B2 -> D-B3**
- 当前已落地：默认 live driver=`postgres`、startup readiness fail-fast、`/saas/v1/health` readiness 503 语义、交付脚本 PG 主口径、sqljs compat 显式门
- 本轮未做：session/process/delivery state 外置、幂等表、并发治理、Redis/队列
- 关键环境变量（D-B1）：
  - `CHATFLOW_SAAS_DB_DRIVER=postgres`（默认）
  - `CHATFLOW_SAAS_POSTGRES_CLIENT=1`
  - `CHATFLOW_SAAS_POSTGRES_URL=...`
  - `CHATFLOW_PG_DUMP_COMMAND` / `CHATFLOW_PG_RESTORE_COMMAND` / `CHATFLOW_PG_ROLLBACK_COMMAND`
  - 仅兼容模式才允许：`CHATFLOW_SAAS_DB_DRIVER=sqljs` + `CHATFLOW_SAAS_SQLJS_COMPAT=1`

## Phase 25 关闭状态（正式）

- 当前阶段：**Phase 25 已正式关闭 / sealed**。
- 口径锁定：默认 live 路径仍为 `sqljs`；受控 Postgres 闭环已达 `go`；受控 `go` 不等于默认链/整体已 GO。
- 版本保持：`1.7.90 / Pro_v1.07.90`。

## Phase 25 受控 PG 闭环证据（已固化）

- 受控环境结果：`migration apply` 成功、`ledger ready`、受控 `go-no-go=go`。
- 严格边界：默认 live 路径仍 `sqljs`，默认链/整体口径**不得**直接写成“已整体 GO”。
- 本轮仅做证据收口与真源同步，未开新实现切口。

## Phase 25 本组已收口（最小同步）

- 已完成并待沿主线继续：tenant credential entrypoint boundary（凭据读取分流、`getTenantCredentials()` 兼容壳收敛、`repository.ts` 入口职责文档化/弃用标注、`verify:tenant-credentials-entrypoint-boundary`）。
- 最小验证均通过：`npm run build`、`npm run verify:tenant-credentials-entrypoint-boundary`、`npm run verify:saas-db-postgres-go-no-go`。
- 版本口径不变：`1.7.90 / Pro_v1.07.90`；整体 go/no-go 口径仍 `NO_GO`。

> **先读**：`memory/01_project_status.md`（真源）→ 本文件 → `memory/03_next_phase_plan.md`（Phase 24 节）→ **`docs/175_pro_saas_multitenant_mvp.md`** → **`docs/179_phase24_multi_instance_session_store_adr.md`**（多实例 session/store 决策）。

---

## 1. 当前项目一句话状态

**ChatFlow Pro**：七通道统一入站 + 出站、Legacy `/webhooks/:channel` 与 **多租户** `/webhooks/t/:slug/:channel` 并存；**SaaS MVP 已封板**（Phase 23）。**Phase D-B 已关闭**。**D-C2A / D-C2B 已关闭**。**D-C2C1 已归档**。**Phase D-C3 sealed**。**Phase D-C4 overall closed**。**Phase E overall closed / sealed**（`phase-e-overall-closeout.md`）— **规程包可交付 100%**；**hosted v1 达标仍须实际签核**。**非** D-C。`package.json` **1.7.108**。**D-C3C 冻结**。

---

## 2. 当前阶段

| 项 | 状态 |
|----|------|
| **当前 Phase** | **Phase E overall closed / sealed**；**E1/E2/E3 completed**；**可交付（规程）100%**；**hosted v1 须签核**；**D-C4 closed**；**D-C3 sealed**；**D-C3C 冻结**；**D-C2C1 已归档 / D-C2C2 未放行** |
| **刚关闭** | **Phase D-B（托管化主线）** ✅；此前 **23 — SaaS MVP** ✅ |
| **SaaS MVP 主线** | **closed / sealed**（见 `docs/175` **SaaS MVP status**） |

---

## 3. 已完成的最近关键 checkpoint（git）

1. **Phase 24 / Auth-RBAC Foundation（1A–1J）** — **子里程碑已封**（`docs/176` + `verify:saas-admin-*`）。  
2. **Phase 24 / Postgres Foundation（2A–2M）** — **checkpoint 已封**；**`go/no-go` 仍为 `NO_GO`**。  
3. **Phase 24 / Postgres runtime 底座切片** — **shared Pool + PostgresSaaSDbAdapter 最小接线** ✅（**`0b540f4`**）；**默认仍为 sqljs**；**整体仍为 `NO_GO`**。  
4. **Phase 24 / Postgres ledger persistence** — **`saas_schema_migrations` 持久化** ✅（**`22ffc2d`**）；**空表/可读 ≠ migration 已应用**；**整体仍为 `NO_GO`**。  
5. **Phase 24 / migration execution wired** — apply 真实执行 SQL + 写 ledger ✅（**`c142da3`**）；**整体仍为 `NO_GO`**（按当前门禁为准）。  
6. **Phase 24 / controlled reachability stabilization** — readiness/verify 证据链稳定化 ✅（**`db0e024`**）；默认 `NO_GO`、受控可达、`overall_go_not_implied`。  
7. **Phase 24 / 包 3B** — **session store 抽象骨架**（**默认 in-memory**）；**非** MI-ready。  
8. **Phase 24 / 包 3C** — **JSONL / notify 契约收口**（**仍** at-least-once，**非** MI-ready）。  
9. 更早：**Phase 23 关闭**、**Phase 24 开 v1 Hardening** — 仍见 `memory/02` 与 `git log`。

**Push**：以 **`git log origin/main`** 为准。

---

## 4. 下一步唯一优先动作

**Phase E**：**已封板** — 见 `phase-e-overall-closeout.md`；**下一手**为 **组织侧签核执行 / Go-Live**，或 **Bryan 新 phase**（**非** E 内部扩面）。  

**租户后台 UI（产品壳）**：最终 UI 收口轮与 UX 第二阶段 P0 实现均已落地；下一步仅在 P0 稳定后评估 P1 放行（见 `memory/03`）。

**历史主线（仍存档，勿与 E 混淆）**：**D-C3** — D-C3B 已交付；**D-C3C 冻结**。**D-C2C** — 见 `memory/03`；**D-C2C2 未放行**。**D-B 验证**：`npm run verify:dedupe-d-b3-closeout`（需 Postgres + 租户 context）。

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

1. **`tenant_credentials`（encryption on）明文残留** — 用 **migrate + zero-plaintext verify** 收口；**master key / 备份 ACL** 仍关键 — 见 `memory/04`。**dedupe/state 表与审计 JSONL 无保留策略** — **D-C2C**。
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
