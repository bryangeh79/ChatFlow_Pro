# Phase E — Hosted v1 Go-Live Gate（设计真源）

**性质**：**设计真源**（**不**因 Phase E 收口删除）；**不是** D-C 延续（**Phase D-C4 overall 已 closed**，见 [`d-c4-overall-closeout.md`](./d-c4-overall-closeout.md)）。  
**Phase E 总收口**：[`phase-e-overall-closeout.md`](./phase-e-overall-closeout.md) — **E overall = closed / sealed**；**可交付（规程包）= 100%**；**hosted v1 达标 ≠ 自动成立**。  
**版本基线**：`package.json` **1.7.108** / **Pro_v1.07.108**（closeout **不**升 patch）。  
**日期**：2026-04-09  

**E1 落地（文档）**：[**文档入口**](./phase-e-hosted-v1-index.md) · [**签核模板**](./phase-e-hosted-v1-signoff-template.md)（**无**脚本化 gate、**无**新 verify）。  
**E2 规格（文档）**：[**范围锁定**](./phase-e2-hosted-v1-scope-lock-design.md) · [**检查项真源 E2-a~d**](./phase-e2-hosted-v1-checklist-spec.md)（**无**代码/verify）。  
**E3（文档 + 只读工件）**：[**范围锁定**](./phase-e3-hosted-v1-readonly-aggregate-scope-lock-design.md) · [**聚合报告规格**](./phase-e3-hosted-v1-readonly-aggregate-report-spec.md)（**非** gate）。  

**与 D-C 的边界（必须钉死）**  
| 维度 | D-C4（已关闭） | Phase E（本阶段） |
|------|----------------|-------------------|
| **问题** | 恢复/rollback **之后** 一致性、只读信号、人工分流、回归 bundle | **首次**宣告「托管生产就绪 v1」的 **总门禁** 与 **签核** |
| **对象** | 幂等/state/ledger/演练/CI 只读回归 | **整条** hosted 产品交付：健康、迁移、密钥、观测、租户边界、交付脚本、**对外话术** |
| **产出** | A/B/C 已完成 | **Go-Live Gate 矩阵 + 签核模型 + 环境模型**（本文） |

**与现有代码的边界**  
仓库已有 **租户级** `runTenantGoLiveCheck`（`src/saas/go-live-check.ts`）— **不等同**于本文 **平台级 hosted v1** 门禁。Phase E **不**在本轮修改该函数语义；未来若对齐，须 **单独实现包** 引用本文矩阵。

---

## [1] Phase E Scope Lock

### 本轮 **要做**

1. 定义 **hosted / production-ready v1** 的 **正式 Go-Live Gate**（可验收语句）。  
2. 区分 **硬门槛（block）** / **manual review** / **evidence only**。  
3. 定义 **No-Go** 条件（含 **CI 仍绿** 的场景）。  
4. 定义 **上线前 / 上线时 / 上线后** 最小 **签核链**（角色与证据，不写死具体人名）。  
5. 定义 **CI / RC / Staging / Production** 各自 **最低**应跑什么（与 [`d-c4c-ci-rc-staging-gates.md`](./d-c4c-ci-rc-staging-gates.md) **互补**：D-C4C ⊂ **恢复治理子集**；Phase E = **全量上线门禁**）。  
6. 给出 **E1 / E2 / E3** 建议拆包（**不**在本文件实现）。

### 本轮 **禁止**

- 新增业务功能、UI、自动补偿、恢复修复器、批量 repair。  
- 以 **D-C*** 名义扩面或改 D-C4A/B/C **语义**。  
- **默认**引入 Redis/队列/cron/新公有 API。  
- **默认**写代码实现 gate（实现须 **单独 Go**）。

---

## [2] Hosted v1 Go-Live Gate Matrix

**最低标准（一句话）**  
在 **生产** 指向 **Postgres 托管真源**、**迁移 ledger 与运行版本一致**、**健康与只读门禁通过**、**密钥与租户边界达标**、**可观测与回滚路径书面存在**、且 **指定角色书面签核** 的前提下，方可对外宣称 **ChatFlow Pro 已达 hosted / production-ready v1**。

| Gate ID | 维度 | 必须满足（摘要） | 默认分级 |
|---------|------|------------------|----------|
| **E-G1** | **数据面真源** | `CHATFLOW_SAAS_DB_DRIVER=postgres`（生产）；迁移已 apply；`saas_schema_migrations` 与镜像/交付版本一致 | **Block** |
| **E-G2** | **健康与就绪** | `/saas/v1/health`（或等价）readiness **非**伪造；L1/L2 或等价探测在 **Staging 与 Prod 计划**中通过 | **Block**（Prod 前 Staging **必**跑） |
| **E-G3** | **恢复治理回归（子集）** | 至少：**D-C4C bundle** 在 **合并主线** 上绿；若发生过 restore/rollback：**D-C4A + D-C4B 书面证据** | **Block**（CI 内子集）+ **Manual**（真实 PG recovery check） |
| **E-G4** | **密钥与凭据** | 无已知 **明文 secret** 违规（D-C2A 口径）；break-glass **未**作为常态；轮换路径 **已知** | **Block** + **Manual**（运营确认） |
| **E-G5** | **租户与边界** | 多租户 webhook 签名/verify **不**回退到进程 env（与现有 CI 条件一致）；Admin/RBAC **符合**已交付切口 | **Block**（CI 已部分覆盖） |
| **E-G6** | **观测与审计** | 结构化日志/平台审计 **可**采集（opt-in 变量明确）；**无**「静默失败接流」 | **Manual** + **Evidence** |
| **E-G7** | **交付与回滚** | `install` / `upgrade` / `rollback` / backup-restore SOP **可执行**；**一次**成功演练证据或等价变更单 | **Manual** + **Evidence** |
| **E-G8** | **租户 go-live（产品内）** | 对 **试点租户** `runTenantGoLiveCheck` **ready** 或书面豁免（范围须写清） | **Manual** |

---

## [3] Block / Manual Review / Evidence Only 分级

| 级别 | 定义 | Phase E 典型 |
|------|------|----------------|
| **Block** | 不满足则 **禁止**晋级 Prod / 禁止对外宣称 v1 | E-G1、E-G2（Prod）、E-G5（CI 硬项）、合并主线上 D-C4C bundle |
| **Manual review** | **不**必然挡 CI；**必须**工单 + 责任人签字才可 Prod | E-G3 真实 PG `saas:recovery:readonly-check`、E-G4 运营确认、E-G8 试点租户 |
| **Evidence only** | 必须 **归档**；**不**单独挡自动化，但 **签核人**须已阅 | 演练记录、RC 会议纪要、截图/日志路径、D-C4B tabletop |

---

## [4] Release Signoff Model

### 4.1 角色（逻辑名）

| 角色 | 职责 |
|------|------|
| **Engineering Owner** | 确认 build/CI、迁移、镜像版本、D-C4C bundle、代码冻结点 |
| **Ops / SRE** | 确认健康探测、备份/回滚、Staging 与 Prod 配置、**无**降门禁 |
| **Security / 指定审核人** | 确认凭据、break-glass、审计日志策略（若组织无专职，由 **Ops + Eng 双签** 替代须 **书面**） |
| **Product / 业务 Owner** | 确认试点租户范围、对外公告措辞、**已知限制** |

### 4.2 签核前 **必须**看到的证据

1. **版本与迁移**：镜像 tag / `package.json` 版本、迁移 ledger 导出或只读查询摘要（**无** secret）。  
2. **CI 绿 + D-C4C bundle**：指向 **具体** pipeline run id / commit SHA。  
3. **Staging 结果**：L1/L2 或等价 + 关键用户旅程 smoke（交付脚本已有则引用）。  
4. **恢复路径**：若近期无 restore — 引用 **最近一次** tabletop 或 `d-c4b-delivery-drill-checklist` 勾选；若有 restore — **D-C4A 输出** + 决策表行引用。  
5. **租户 go-live**：试点租户检查 JSON 或 **豁免单**（含风险接受）。  

### 4.3 上线前 / 时 / 后（最小）

| 阶段 | 最小动作 |
|------|----------|
| **前** | 签核表完成；维护窗公告（若需要）；备份验证 |
| **时** | 按 SOP 切换流量；监控峰值；**禁止**同时改 schema 与全量引流 |
| **后** | 24–72h 加强观测； incident 通道就绪；**rollback 决策人**在岗 |

---

## [5] Environment Gate Model（CI / RC / Staging / Prod）

| 环境 | **必须**跑什么（Phase E 最低） | 与 D-C4C 关系 |
|------|-------------------------------|---------------|
| **CI** | `build`、现有 `check:staging-env`、`verify:d-c4c-readonly-governance-bundle:ci`、docker-smoke、（条件）租户边界 | D-C4C **已**覆盖恢复治理 **回归子集** |
| **RC** | 同 CI 链 + **交付** `delivery:health:l1`/`l2`（若适用）+ **版本对账** | 恢复：若含 DB 事件 → D-C4A **manual** |
| **Staging** | 全量 hosted 路径；**真实** PG 上 `saas:recovery:readonly-check` **至少一次**本轮发布周期；L1/L2 | D-C4A **manual** |
| **Prod** | **不**要求跑 CLI 进发布流水线默认值；**要求**签核已包含 Staging 证据；**禁止**未签核接流 | 生产手跑 D-C4A 按 **D-C4B** |

---

## [6] No-Go Conditions

**即使 build/CI 绿，仍须 No-Go**（非穷尽，签核人 **可**追加）：

1. **迁移漂移未解**：ledger 与运行代码期望 **不一致**，或存在 **半迁移** 迹象。  
2. **近期 partial restore / 未配对备份** 无 **书面**定损（D-C4 R3 类）。  
3. **break-glass 常亮** 或 **TTL 形同虚设**。  
4. **健康检查** 被临时改弱 **只为绿**。  
5. **无** rollback 责任人或 **无** 最近备份验证记录。  
6. **对外宣传** 与 **实际能力** 不符（例如宣称「全渠道生产」但仅单租户试点）。  

---

## [7] Suggested Build Order（E1 / E2 / E3）

| 包 | 内容 | 依赖 | 备注 |
|----|------|------|------|
| **E1** | **设计评审收口** + 与 `install-sop` / `backup-restore-sop` / `rollback-sop` **交叉引用**；可选对齐 `src/saas/hosted-readiness.ts` 语义说明（**文档层**，不改代码）；签核表模板（Markdown） | 本文 | **纯文档**；**不**改业务代码 |
| **E2** | **E2-a ~ E2-d** — [`phase-e2-hosted-v1-checklist-spec.md`](./phase-e2-hosted-v1-checklist-spec.md)；范围锁定 [`phase-e2-hosted-v1-scope-lock-design.md`](./phase-e2-hosted-v1-scope-lock-design.md) | E1 已完成 | **已**交付规格文档；**不**含 E3 / **无** verify |
| **E3** | **只读聚合报告** — [`phase-e3-hosted-v1-readonly-aggregate-report-spec.md`](./phase-e3-hosted-v1-readonly-aggregate-report-spec.md)；设计锁定 [`phase-e3-hosted-v1-readonly-aggregate-scope-lock-design.md`](./phase-e3-hosted-v1-readonly-aggregate-scope-lock-design.md) | E2 + Bryan Go | **无** verify / **无** bundle 并入；**报告 ≠ Go** |

---

## [8] Final Recommendation

| 结论 | 说明 |
|------|------|
| **Phase E 定位** | **产品级 hosted v1 上线门禁与签核** — 回答「何时可宣称生产就绪」，**不**重复 D-C4 的恢复专域。 |
| **本轮** | **Phase E overall closed** — E1 / E2（a~d）/ E3 **均 completed**（见 `phase-e-overall-closeout.md`）。 |
| **下一实现步** | **不**再扩 **Phase E**；**E2-e**、**E3 扩面** 等须 **新 phase / 新 Go**；**禁止**无 ADR 并入 D-C4C bundle。 |
| **对外话术** | 仅当 **E-G1–G8** 矩阵对应项 **已满足** 且 **§4 签核** 完成时，方可称 **hosted / production-ready v1**。 |

---

## 八问速答（对应立项指令）

| # | 问题 | 结论（本文） |
|---|------|----------------|
| 1 | Hosted v1 **最低标准**？ | §2 矩阵 + §2 首段一句话。 |
| 2 | 哪些 **block release**？ | §3 **Block** 列 + E-G1/G2/G5 等。 |
| 3 | 哪些 **manual review**？ | §3 + E-G3 真实 PG、E-G4、E-G8。 |
| 4 | 哪些 **evidence only**？ | §3 + 演练、会议纪要、日志路径。 |
| 5 | Staging / RC / Prod **各自跑什么**？ | §5。 |
| 6 | CI 绿仍 **No-Go**？ | §6。 |
| 7 | **谁签核、看什么**？ | §4.1–4.2。 |
| 8 | 何时可 **对外说 hosted v1**？ | §8 Final Recommendation 末行。 |

---

## 文档状态

| 项 | 值 |
|----|-----|
| **阶段** | **Phase E — 设计真源（仍有效）** |
| **Phase E overall** | **closed / sealed** — [`phase-e-overall-closeout.md`](./phase-e-overall-closeout.md) |
| **E1** | **completed** — `phase-e-hosted-v1-index.md`、`phase-e-hosted-v1-signoff-template.md`、SOP 交叉引用 |
| **E2** | **completed（E2-a ~ E2-d）** — [`phase-e2-hosted-v1-checklist-spec.md`](./phase-e2-hosted-v1-checklist-spec.md)；**E2-e 非** E 承诺 |
| **E3** | **completed** — [`phase-e3-hosted-v1-readonly-aggregate-report-spec.md`](./phase-e3-hosted-v1-readonly-aggregate-report-spec.md)；**无** verify、**无** npm script |
