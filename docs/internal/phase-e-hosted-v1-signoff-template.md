# Hosted v1 Go-Live — 签核表（模板）

**用途**：**复制本页**到新文件或工单，填写后归档。  
**真源**：Phase E — [`phase-e-hosted-v1-go-live-gate-design.md`](./phase-e-hosted-v1-go-live-gate-design.md) · 入口 [`phase-e-hosted-v1-index.md`](./phase-e-hosted-v1-index.md) · **总收口** [`phase-e-overall-closeout.md`](./phase-e-overall-closeout.md) · **检查项规格** [`phase-e2-hosted-v1-checklist-spec.md`](./phase-e2-hosted-v1-checklist-spec.md) · **E3 只读聚合报告** [`phase-e3-hosted-v1-readonly-aggregate-report-spec.md`](./phase-e3-hosted-v1-readonly-aggregate-report-spec.md)（**非**签核替代）  
**版本基线**：`package.json` **1.7.108**（E1 文档；**不**替代自动化，**无**脚本 gate）  

---

## 元数据

| 字段 | 填写 |
|------|------|
| **发布 / 变更单 ID** | `<TICKET_ID>` |
| **目标环境** | `Staging` / `RC` / `Production` |
| **镜像 / 构建标签** | `<IMAGE_TAG_OR_BUILD_ID>` |
| **Git commit SHA** | `<SHA>` |
| **填表日期** | `<YYYY-MM-DD>` |

---

## A. Block（不满足则 **禁止** 晋级 Production / 禁止对外宣称 hosted v1）

> 证据：Pipeline run URL、日志路径、导出文件（**勿**贴 secret）。

### A.1 Build / 本地或 CI 构建

- [ ] `npm run build`（或等价）**通过** — 证据：`<LINK_OR_LOG>`
- [ ] 无已知 **编译期** 阻断缺陷登记在未关闭高危项 — 证据：`<LINK>`

### A.2 CI（合并主线）

- [ ] 主线 CI **绿**（含 `verify:d-c4c-readonly-governance-bundle:ci` 等）— 证据：`<PIPELINE_RUN_URL>`
- [ ] `check:staging-env`（或组织等价）**通过** — 证据：`<LINK>`

### A.3 Staging（**Prod 前必做**）

- [ ] `delivery:health:l1` / `l2`（或组织等价）**通过** — 证据：`<LINK>`
- [ ] 核心 smoke / 用户旅程 **通过** — 证据：`<LINK>`
- [ ] **E-G1**：生产路径 **`CHATFLOW_SAAS_DB_DRIVER=postgres`** 与迁移 ledger **一致**（Staging 已验证或等价证明）— 证据：`<LINK>`

### A.4 RC（若适用）

- [ ] RC 构建与 **稳定版 / manifest** 对账 **通过** — 证据：`<LINK>`
- [ ] `delivery:rollback:verify`（若本轮含 rollback）**通过** — 证据：`<LINK>`

### A.5 Production（切换前）

- [ ] **无**未关闭 **E-G1** 类迁移漂移 — 证据：`<LINK>`
- [ ] **无**故意弱化 health/readiness **只为绿** — 签核人确认：□

---

## B. Manual review（**不**必然挡 CI；**必须**审阅并签字方可 Prod）

- [ ] **E-G3（真实 PG）**：本轮发布周期内 **`npm run saas:recovery:readonly-check`** 已在 **Staging 或受控环境** 执行，输出已归档 — 证据：`<PATH_OR_TICKET>`  
  - `overall_tier` = `<observe | manual_d_c3b_only | freeze_no_go>`  
  - 若曾 restore/rollback：已按 [`d-c4b-recovery-decision-table.md`](./d-c4b-recovery-decision-table.md) 分流 — 证据：`<TICKET>`
- [ ] **E-G4**：凭据 / break-glass / 轮换 — 运营或指定人 **已确认** — 证据：`<TICKET>`
- [ ] **E-G8**：试点租户 **`runTenantGoLiveCheck`** = ready **或** 书面豁免（范围写明）— 证据：`<EXPORT_OR_TICKET>`
- [ ] **E-G6 / E-G7**：观测与审计、交付/回滚 SOP **可读可执行** — 确认人：□  

---

## C. Evidence only（须 **归档**；签核人 **已阅**）

- [ ] D-C4B tabletop / 演练勾选（若适用）— [`d-c4b-delivery-drill-checklist.md`](./d-c4b-delivery-drill-checklist.md) — 证据：`<PATH>`
- [ ] RC / 上线评审会议纪要 — 证据：`<PATH>`
- [ ] 备份验证记录（时间窗）— 证据：`<PATH>`

---

## D. No-Go 自检（任一条勾选 **则整体 No-Go**，除非书面风险接受并升级）

- [ ] 存在 **未解决** 的 partial restore / 混刻备份且无书面定损（见 Phase E 设计 §6）
- [ ] break-glass **常态**化或 TTL 失效
- [ ] **无** rollback 责任人或 **无** 近期备份验证
- [ ] 对外宣传范围 **大于** 实际试点能力

**说明**：`<NONE_APPLICABLE / TICKET_FOR_WAIVER>`

---

## E. 最终结论

| 结论 | 勾选其一 |
|------|----------|
| **Go** — 允许进入 **Production 切换 / 对外 hosted v1 宣称** | □ |
| **No-Go** — **停止**晋级，先消项 | □ |
| **Conditional Go** — 仅允许 **有限试点**（范围：`<DESCRIBE>`） | □ |

**备注**：`<FREE_TEXT>`

---

## F. 签核

| 角色（逻辑名，见 Phase E §4.1） | 姓名 / 账号 | 日期 | 签名或等价 |
|--------------------------------|-------------|------|------------|
| Engineering Owner | | | |
| Ops / SRE | | | |
| Security / 指定审核人（或双签替代） | | | |
| Product / 业务 Owner | | | |

---

*模板结束 — E1 落地；**不得**将本表改为自动化执行 D-C3B 或修复器。*
