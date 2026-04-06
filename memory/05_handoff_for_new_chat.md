# Handoff for New Chat（下一聊天室可直接接手）

> **先读**：`memory/01_project_status.md`（真源）→ 本文件 → `memory/03_next_phase_plan.md`（Phase 24 节）→ **`docs/175_pro_saas_multitenant_mvp.md`**（SaaS 契约 + MVP sealed）。

---

## 1. 当前项目一句话状态

**ChatFlow Pro**：七通道统一入站 + 出站、Legacy `/webhooks/:channel` 与 **多租户** `/webhooks/t/:slug/:channel` 并存；**多租户 SaaS MVP 已封板**（Phase 23 关闭），`package.json` **1.7.67**。当前工程叙事主线为 **Phase 24 — SaaS v1 Hardening**（托管/安全/规模，**非**「把 MVP 当未完」）。

---

## 2. 当前阶段

| 项 | 状态 |
|----|------|
| **当前 Phase** | **24 — SaaS v1 Hardening** |
| **刚关闭** | **23 — SaaS MVP Final Closure** ✅ |
| **SaaS MVP 主线** | **closed / sealed**（见 `docs/175` **SaaS MVP status**） |

---

## 3. 已完成的最近 3 个关键 checkpoint（git）

1. **`bb5d17e`** — `chore(phase-24): open SaaS v1 hardening; seal MVP (Phase 23 closed)`：`memory/01`·`03`·`02`·`04`、`docs/175`、`GPT_PLANNER_HANDOFF_BLUEPRINT` 切换 v1 叙事。  
2. **`8cae7d4`** — `chore(phase-23): close SaaS MVP final audit; sync memory`：非主链路 **send / suppress** 审计结论写入 memory。  
3. **`c2a08cc`** — `docs(phase-23): freeze idle GET behavior for SaaS MVP`：idle GET **选项 A**、`/health` 探活、`tenant_settings` 矩阵入 `docs/175`。

**Push**：以上均在 **`main`**，**已成功 push**（以本地 `git log origin/main` 为准）。

---

## 4. 下一步唯一优先动作

**在 Phase 24 中任选一条竖切立项**：写 **短 ADR（或 docs 节）+ 最小可验收 PR**，建议顺序由你方定，常见首包为 **租户 Admin 认证 / RBAC** 或 **Postgres 并存与 migration 骨架**。  

**原因**：MVP 已封板，继续堆「MVP 功能」会偏离真源；v1 需从 **安全/托管** 底座开刀，且每项独立可测。

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
