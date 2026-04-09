# Phase E2 — Hosted v1 检查项规格真源（E2-a ~ E2-d）

**性质**：**仅文档规格**；**不是**自动化 gate；**不是** verify；**不是**业务代码；**不是** E3。  
**版本基线**：`package.json` **1.7.108** / **Pro_v1.07.108**（本交付 **不**改版本号）。  
**前置真源**：Phase E [`phase-e-hosted-v1-go-live-gate-design.md`](./phase-e-hosted-v1-go-live-gate-design.md)；E1 [`phase-e-hosted-v1-signoff-template.md`](./phase-e-hosted-v1-signoff-template.md)、[`phase-e-hosted-v1-index.md`](./phase-e-hosted-v1-index.md)；E2 范围锁定 [`phase-e2-hosted-v1-scope-lock-design.md`](./phase-e2-hosted-v1-scope-lock-design.md)。  
**范围**：**仅** E2-a（注册表）、E2-b（证据字段）、E2-c（环境判定）、E2-d（签核前置）。**不含** E2-e（租户 go-live 字段级映射表）。  
**日期**：2026-04-09  

**与签核模板关系**：模板 **A/B/C/D/E/F** 为人类可填 **唯一** 签核面；本文件为 **上游规格**（稳定 `chk_id`、环境格、证据形状、前置逻辑）。填表时 **不得**另造与本文冲突的「第二套分级」；若冲突以 **Phase E 设计稿 §2–§6** + **本文** 为准，并 **修订模板脚注**（非改分级语义）。

---

## E2-a — Hosted v1 检查项规格注册表

**说明**：`default_tier` 为 **全生命周期默认**；具体环境中 **block / manual / evidence** 以 **§E2-c** 为准。`template_ref` 指向签核模板章节（可复制检索）。

| `chk_id` | `gate_ref` | `title` | `summary`（操作者简述） | `default_tier` | `template_ref` |
|----------|------------|---------|-------------------------|----------------|------------------|
| **CHK-BUILD-01** | E-G2 | 构建通过 | `npm run build`（或组织等价）在 **既定** CI/构建链上通过 | Block | A.1 首项 |
| **CHK-BUILD-02** | E-G2 | 无未关闭编译期阻断 | 无 **已知** 未关闭的编译期阻断缺陷登记为 **晋级阻断** | Block | A.1 次项 |
| **CHK-CI-01** | E-G3 / E-G5 | 主线 CI 绿 + D-C4C bundle | 合并主线 pipeline **绿**，且含 `verify:d-c4c-readonly-governance-bundle:ci`（或组织登记的等价名） | Block | A.2 首项 |
| **CHK-CI-02** | E-G2 / E-G5 | staging-env 检查 | `check:staging-env`（或组织等价）通过 | Block | A.2 次项 |
| **CHK-CI-03** | E-G5 | 租户边界（CI 已覆盖部分） | 多租户 webhook 签名/verify **不**回退到进程 env 等 — **与当前 CI 已启用条件一致**（仅声明归属，不扩 verify） | Block | A.2（与主线 CI 同一证据链引用） |
| **CHK-STG-01** | E-G2 | Staging 交付健康 | `delivery:health:l1` / `l2`（或组织等价）在 **Staging** 通过 | Block | A.3 首项 |
| **CHK-STG-02** | E-G2 | Staging 核心 smoke | 核心 smoke / 用户旅程在 **Staging** 通过 | Block | A.3 次项 |
| **CHK-STG-03** | E-G1 | Staging 数据面与迁移一致 | 生产路径 `CHATFLOW_SAAS_DB_DRIVER=postgres` 与迁移 ledger **一致**已在 **Staging**（或等价受控环境）验证 | Block | A.3 E-G1 项 |
| **CHK-RC-01** | E-G7 | RC 对账 | RC 构建与稳定版 / manifest **对账**通过（若本轮适用 RC） | Block | A.4 首项 |
| **CHK-RC-02** | E-G7 | RC 回滚 verify | 若本轮含 rollback 路径：`delivery:rollback:verify`（或等价）通过 | Block | A.4 次项 |
| **CHK-PROD-01** | E-G1 | Prod 切换前无迁移漂移 | **无**未关闭的 E-G1 类迁移漂移（切换前核对） | Block | A.5 首项 |
| **CHK-PROD-02** | E-G2 | 未弱化健康探测 | **无**为「只为绿」而 **故意弱化** health/readiness 的变更（签核人确认） | Block | A.5 次项 |
| **CHK-MAN-D4A** | E-G3 | 真实 PG 只读恢复核查 | 本轮周期内 `saas:recovery:readonly-check` 已在 **Staging 或受控环境** 执行，输出已归档；`overall_tier` 已记录 | Manual | B 首段 |
| **CHK-MAN-D4B** | E-G3 | 曾恢复/回滚时的决策表 | 若曾 restore/rollback：已按 D-C4B 决策表分流并 **留痕** | Manual | B 首段子弹 |
| **CHK-MAN-EG4** | E-G4 | 凭据与 break-glass | 凭据 / break-glass / 轮换 — **运营或指定人**已确认 | Manual | B E-G4 |
| **CHK-MAN-EG8** | E-G8 | 试点租户 go-live | 试点租户 `runTenantGoLiveCheck` = ready **或** **书面豁免**（范围写清） | Manual | B E-G8 |
| **CHK-MAN-EG67** | E-G6 / E-G7 | 观测与交付 SOP 可读 | 观测与审计、交付/回滚 SOP **可读可执行** — 确认人已认可 | Manual | B 末项 |
| **CHK-EV-D4B-DRILL** | E-G7 | D-C4B 演练 / tabletop | 适用时：`d-c4b-delivery-drill-checklist` 已勾选并归档 | Evidence | C 首项 |
| **CHK-EV-RC-MTG** | — | RC / 上线评审纪要 | 适用时：会议纪要已归档 | Evidence | C 次项 |
| **CHK-EV-BACKUP** | E-G7 | 备份验证记录 | 时间窗内备份验证记录已归档 | Evidence | C 末项 |
| **CHK-NOGO-D1** | §6 No-Go | partial restore / 混刻备份未定损 | **D 节**：若勾选 → **整体 No-Go**（除非书面风险接受并升级） | Block（否定项） | D.1 |
| **CHK-NOGO-D2** | §6 No-Go | break-glass 常态化 / TTL 失效 | **D 节** | Block（否定项） | D.2 |
| **CHK-NOGO-D3** | §6 No-Go | 无 rollback 责任人或近期无备份验证 | **D 节** | Block（否定项） | D.3 |
| **CHK-NOGO-D4** | §6 No-Go | 宣传范围大于实际能力 | **D 节** | Block（否定项） | D.4 |

---

## E2-b — 证据字段约定（可对账、无自动化）

**目的**：统一「归档里 **最少** 要有什么字段」，便于跨工单对账；**不**要求 JSON Schema 文件、**不**要求工具校验。

### B.1 通用元数据（**每一条**归档证据推荐满足）

| 字段 | 必填 | 说明 |
|------|------|------|
| `evidence_id` | **是** | 组织内唯一 ID（例：`EV-2026-0409-001` 或工单号） |
| `kind` | **是** | **§B.2** 中的 `kind` 枚举之一 |
| `uri_or_ticket` | **是** | 指向日志、pipeline、工单或 **仓库内相对路径**（**勿**内嵌 secret） |
| `commit_sha` | **条件** | 若证据绑定某次构建/合并：**是**；纯运维工单可填 `N/A` 并说明 |
| `captured_at` | **推荐** | ISO-8601 时间（UTC 或标明 TZ） |
| `contains_secrets` | **是** | 必须为 **`false`**（本规格 **禁止**在证据包内存 raw secret；**仅**票据号、指纹、脱敏摘要） |
| `retention_hint` | **否** | 例：`90d`、`1y`、按组织策略 |

### B.2 `kind` 枚举与 **按检查项** 的最小字段

| `kind` | 用于 `chk_id`（示例） | 除 §B.1 外 **必填** | **选填** | **必须为空或仅指纹** |
|--------|------------------------|----------------------|----------|----------------------|
| `BUILD_LOG` | CHK-BUILD-* | 构建号或 CI job 链接 | 失败重跑说明 | 日志正文中的 token |
| `PIPELINE_RUN` | CHK-CI-* | pipeline run URL；**含** D-C4C job 可见性或与 CHK-CI-01 同一 run | 分支名 | 环境变量 dump |
| `STAGING_HEALTH` | CHK-STG-01 | L1/L2 输出路径或摘要链接 | 探测目标 URL（非 secret） | 凭据 |
| `STAGING_SMOKE` | CHK-STG-02 | smoke 报告链接或路径 | — | — |
| `MIGRATION_LEDGER_SUMMARY` | CHK-STG-03, CHK-PROD-01 | 只读查询摘要或导出路径（**无**连接串） | 期望版本号 | 密码 |
| `RC_MANIFEST_DIFF` | CHK-RC-01 | 对账命令输出或报告路径 | — | — |
| `ROLLBACK_VERIFY_LOG` | CHK-RC-02 | verify 日志路径 | — | — |
| `ATTESTATION_NO_WEAKEN` | CHK-PROD-02 | 签核人 **书面**确认（可即模板勾选 + 日期） | 变更单号 | — |
| `D4A_RECOVERY_JSONL` | CHK-MAN-D4A | 命令输出归档路径；**含** `overall_tier` 行或等价摘要 | 目标 DB **逻辑**名（非口令） | 连接串 |
| `D4B_DECISION_REF` | CHK-MAN-D4B | 决策表行引用或工单 | — | — |
| `OPS_CREDENTIALS_TICKET` | CHK-MAN-EG4 | 工单 ID；**无**明文密钥 | — | 密钥材料 |
| `TENANT_GOLIVE_EXPORT` | CHK-MAN-EG8 | JSON 导出路径 **或** 豁免工单 | 豁免范围文本 | PII 视组织策略脱敏 |
| `SOP_ACK` | CHK-MAN-EG67 | 确认人 + 日期（可与签核表同页） | — | — |
| `DRILL_CHECKLIST` | CHK-EV-D4B-DRILL | 已填 checklist 路径 | — | — |
| `MEETING_MINUTES` | CHK-EV-RC-MTG | 纪要路径 | — | — |
| `BACKUP_RECORD` | CHK-EV-BACKUP | 备份验证时间窗 + 结果 | 存储位置 **逻辑**名 | 访问密钥 |
| `WAIVER_RISK_ACCEPTANCE` | CHK-NOGO-* / E 节 | 升级审批链、范围、时效 | — | — |

**留空规则**：标注 **必须为空或仅指纹** 的列 — 若出现 raw secret，**该证据视为无效**，签核人 **不得**据此勾 **Go**。

---

## E2-c — 环境判定表（CI / RC / Staging / Prod）

**图例**：**B** = 在该阶段为 **硬门槛**（不满足则 **不得**进入下一环境或不得宣称 Go）；**M** = **人工审阅**必过；**E** = **须归档证据**，**不**单独替代 B/M；**—** = **不适用**（该项不在此环境执行，或仅以上一环境证据为准）。

| `chk_id` | **CI** | **RC** | **Staging** | **Prod**（切换前签核面） |
|----------|--------|--------|-------------|---------------------------|
| CHK-BUILD-01 | B | B | E | E |
| CHK-BUILD-02 | B | B | E | E |
| CHK-CI-01 | B | E | E | E |
| CHK-CI-02 | B | E | E | E |
| CHK-CI-03 | B | E | E | E |
| CHK-STG-01 | — | E | B | E |
| CHK-STG-02 | — | E | B | E |
| CHK-STG-03 | — | E | B | E |
| CHK-RC-01 | — | B | E | E |
| CHK-RC-02 | — | B | E | E |
| CHK-PROD-01 | — | — | E | B |
| CHK-PROD-02 | — | — | E | B |
| CHK-MAN-D4A | — | M | M | M |
| CHK-MAN-D4B | — | M | M | M |
| CHK-MAN-EG4 | — | M | M | M |
| CHK-MAN-EG8 | — | M | M | M |
| CHK-MAN-EG67 | — | M | M | M |
| CHK-EV-D4B-DRILL | — | E | E | E |
| CHK-EV-RC-MTG | — | E | E | E |
| CHK-EV-BACKUP | — | E | E | E |
| CHK-NOGO-D1～D4 | — | M | M | M |

**使用说明（人工）**：

- **CI**：合并主线 **当日**门槛；与 Phase E 设计 §5「CI 必须跑什么」一致。  
- **RC**：**若组织无 RC 环境**：可将 **RC** 列视为 **发布候选构建验证**（同一逻辑，**不**引入新基础设施）。  
- **Staging**：Prod 前 **必须**完成所有 **B**；**M** 项须在 **签核前**完成并归档。  
- **Prod**：列 **B** 为 **切换前**最终核对；**E** 表示 **引用** Staging/RC/CI 已归档证据即可，**不要求**在 Prod 重跑构建。  
- **CHK-MAN-D4A**：设计稿要求 **本轮发布周期**内至少在 Staging 或受控环境执行；CI **不**替代（与模板 B 一致）。

---

## E2-d — 签核前置约束（与模板 E / F 对齐）

**原则**：**Go / Conditional Go** **仅当**下列规则 **全部**满足；**No-Go** 与模板 **D**、**E** 节一致。本文 **不**新增第三种结论类型。

### D.1 模板勾选与结论列的硬性对应

| 规则 ID | 条件 | 结论 |
|---------|------|------|
| **R-D-NOGO** | **D** 节 **任一条**勾选 **且** **无** `WAIVER_RISK_ACCEPTANCE` 证据 | **禁止**勾选 **E** 节 **Go** 或 **Conditional Go** |
| **R-E-ONE** | **E** 节 **Go**、**No-Go**、**Conditional Go** **恰好**选一 | 否则签核 **无效** |

### D.2 勾选 **Go**（允许进入 Production 切换 / 对外 hosted v1 宣称）前 **必须**满足的 `chk_id`（逻辑 **AND**）

以下 **全部**在模板中有对应勾选 **且** **§E2-b** 意义下证据可追溯（`contains_secrets=false`）：

1. **CHK-BUILD-01**、**CHK-BUILD-02**  
2. **CHK-CI-01**、**CHK-CI-02**、**CHK-CI-03**  
3. **CHK-STG-01**、**CHK-STG-02**、**CHK-STG-03**  
4. **CHK-PROD-01**、**CHK-PROD-02**  
5. **若适用 RC**：**CHK-RC-01**；**若**本轮含 rollback 验证要求：**CHK-RC-02**  
6. **CHK-MAN-D4A**、**CHK-MAN-EG4**、**CHK-MAN-EG8**、**CHK-MAN-EG67**  
7. **若**曾 restore/rollback：**CHK-MAN-D4B** **必须**完成  
8. **CHK-NOGO-D1**～**CHK-NOGO-D4** **均未**勾选 **或** 已附 **WAIVER_RISK_ACCEPTANCE**（且 **E** 节 **不得**为 **Go** 除非 waiver 批准范围覆盖 **Full Go** — **默认** waiver 仅对应 **Conditional Go**；若组织政策不同，须在 **单次**签核备注中 **显式**写明）

### D.3 **Evidence only（C 节）** 与 Go 的最低要求

| 规则 ID | 条件 |
|---------|------|
| **R-C-BACKUP** | **CHK-EV-BACKUP**：**必须**归档（**Go** 前 **不可**缺） |
| **R-C-DRILL-OR-EQUIV** | **CHK-EV-D4B-DRILL** 与 **CHK-EV-RC-MTG**：至少 **一项**须归档；若组织 **同时**要求二者，以 **组织变更单**为准，但 **不得**与 Phase E **§4.2**「恢复路径 / 评审」精神冲突 |

### D.4 与 Phase E 设计稿 §4.2 的对照（**不得**造第二套叙事）

| 设计稿 §4.2 条 | 本文锚点 |
|----------------|----------|
| 版本与迁移 | CHK-STG-03、CHK-PROD-01 + `MIGRATION_LEDGER_SUMMARY` / 构建证据 |
| CI 绿 + D-C4C bundle | CHK-CI-01 + `PIPELINE_RUN` |
| Staging 结果 | CHK-STG-01、CHK-STG-02 + 对应 `kind` |
| 恢复路径 | CHK-MAN-D4A、CHK-MAN-D4B、CHK-EV-D4B-DRILL |
| 租户 go-live | CHK-MAN-EG8 + `TENANT_GOLIVE_EXPORT` / 豁免 |

### D.5 **即使模板全勾了也不能 Go** 的非穷尽情形（与设计 §6 一致）

签核人 **必须**保留 **否决权**（**不**依赖自动化）：包括但不限于 — 迁移漂移未解；近期 partial restore 无定损；break-glass 常亮；健康检查被改弱；无 rollback 责任人；对外宣传大于实际能力。此类情形 **应**反映在 **D 节** 或 **书面 No-Go**；若强行勾选 **Go**，**签核无效**。

---

## 文档状态

| 项 | 值 |
|----|-----|
| **阶段** | **Phase E2 — 实现（E2-a ~ E2-d）** |
| **E2-e** | **未**交付（须另立项 / Go） |
| **E3** | **未**启动 |
| **代码 / verify / npm** | **无** |
