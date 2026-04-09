# Hosted v1 Go-Live — 文档入口（Phase E）

**目的**：新接手的人 **单页**找到：设计真源、签核模板、必看 SOP、与 D-C 的边界。  
**当前版本**：`package.json` **1.7.108** / **Pro_v1.07.108**  
**Phase E 总收口**：[`phase-e-overall-closeout.md`](./phase-e-overall-closeout.md) — **E overall = closed / sealed**；**规程包可交付 = 100%**；**具体环境 hosted v1 达标须实际签核**。  

---

## 1. 必读（Phase E — hosted v1 **全量**门禁）

| 文档 | 说明 |
|------|------|
| [**phase-e-hosted-v1-go-live-gate-design.md**](./phase-e-hosted-v1-go-live-gate-design.md) | **设计真源**：Gate 矩阵 E-G1–G8、Block/Manual/Evidence、签核模型、环境模型、No-Go、E1/E2/E3 拆包。 |
| [**phase-e-overall-closeout.md**](./phase-e-overall-closeout.md) | **Phase E 总收口**：closed / sealed；可交付 100% vs hosted v1 达标边界。 |
| [**phase-e2-hosted-v1-scope-lock-design.md**](./phase-e2-hosted-v1-scope-lock-design.md) | **E2 范围锁定**（设计）。 |
| [**phase-e2-hosted-v1-checklist-spec.md**](./phase-e2-hosted-v1-checklist-spec.md) | **E2 规格真源（E2-a~d）**：`chk_id` 注册表、证据字段、`CI/RC/Staging/Prod` 判定、签核前置；**无**代码/verify。 |
| [**phase-e3-hosted-v1-readonly-aggregate-scope-lock-design.md**](./phase-e3-hosted-v1-readonly-aggregate-scope-lock-design.md) | **E3 范围锁定**（设计）。 |
| [**phase-e3-hosted-v1-readonly-aggregate-report-spec.md**](./phase-e3-hosted-v1-readonly-aggregate-report-spec.md) | **E3 只读聚合报告**：字段、输入映射、模板、可选生成器；**非** gate。 |
| [**phase-e3-hosted-v1-readonly-aggregate-report.template.md**](./phase-e3-hosted-v1-readonly-aggregate-report.template.md) | **E3 报告空模板**（人工主路径）。 |
| [**phase-e-hosted-v1-signoff-template.md**](./phase-e-hosted-v1-signoff-template.md) | **签核表模板**：复制填写作废块；含 Build/CI/Staging/RC/Prod、Go/No-Go、签核人。 |
| [**install-sop.md**](./install-sop.md) | 净安装与 **health / smoke**；与 Phase E **E-G2** 对齐。 |
| [**backup-restore-sop.md**](./backup-restore-sop.md) | 备份/恢复 **操作**；恢复后 **另**见 D-C4 专节（≠ 全量 hosted v1 唯一依据）。 |
| [**rollback-sop.md**](./rollback-sop.md) | 回滚与 verify；回滚后 **另**见 D-C4 专节。 |

**CI 恢复治理子集（仍属必理解，但是 D-C4C 子域）**  
- [`d-c4c-readonly-governance-bundle-spec.md`](./d-c4c-readonly-governance-bundle-spec.md)  
- [`d-c4c-ci-rc-staging-gates.md`](./d-c4c-ci-rc-staging-gates.md)  

---

## 2. 恢复治理 **专用**（D-C4 · **已关闭**，≠ hosted v1 全部）

以下 **不**替代 Phase E 全表；**仅在 restore/rollback/一致性** 语境 **必须**遵守：

| 文档 | 用途 |
|------|------|
| [`d-c4-overall-closeout.md`](./d-c4-overall-closeout.md) | D-C4 总线 **closed** |
| [`d-c4-recovery-consistency-design.md`](./d-c4-recovery-consistency-design.md) | R1–R7、§3.1 最低标准、黑名单 |
| [`d-c4a-recovery-readonly-check-spec.md`](./d-c4a-recovery-readonly-check-spec.md) | `saas:recovery:readonly-check` |
| [`d-c4b-recovery-decision-table.md`](./d-c4b-recovery-decision-table.md) | `overall_tier` 分流 |
| [`d-c4b-delivery-drill-checklist.md`](./d-c4b-delivery-drill-checklist.md) | 演练与书面字段 |
| [`d-c3-operator-runbook.md`](./d-c3-operator-runbook.md) | D-C3A/B；§6 Post-restore **先 D-C4A** |

---

## 3. 当前已具备 / 未具备（平台级）

### 已具备

- **D-B**：托管化底座（Postgres 默认链等，历史 Phase 已收口）。  
- **D-C4**：恢复后只读核查、决策表、交付演练、只读 governance bundle、CI 子集（**closed**，见 closeout）。  
- **Phase E（overall closed）+ E1 + E2（E2-a~d）+ E3（只读聚合报告）**：Go-Live 矩阵、**可填签核模板**、**检查项规格**、**E3 证据聚合模板/规格**、SOP 指针、本入口与 **closeout 真源**。  

### 未具备（**非** Phase E 承诺；**不**因 E closeout 自动消失）

- **某次具体环境的 hosted v1「已签核 / 已达标」** — 须 **组织按矩阵执行 + 书面签核**（见 `phase-e-overall-closeout.md` §5–§6）。  
- **E2-e**、**E3 扩面** — **须新 phase / 新 Go**，**禁止**挂靠 **Phase E** 名义静默加塞。  
- **D-C3C**、自动补偿、恢复写修复器、批量恢复、半自动闭合。  
- **租户级** `runTenantGoLiveCheck` **已实现**，但 **不等于** 平台签核完成 — 签核表 **E-G8** 仍须人工勾选。  

---

## 4. 下一步（**不**自动开始）

- **Phase E**：**overall closed** — [`phase-e-overall-closeout.md`](./phase-e-overall-closeout.md)。**不再**扩 E 内部真源。  
- **执行面**：具体发布走 **签核模板 + E2 规格 +（可选）E3 报告**；**对外宣称 hosted v1** 须满足主设计 §8。  
- **新能力**：E2-e、E3 verify 等 — **新 phase / 新 ADR**。  

---

## 文档状态

| 项 | 值 |
|----|-----|
| **Phase E overall** | **closed / sealed** — `phase-e-overall-closeout.md` |
| **E1 / E2（a~d）/ E3** | **completed**（承诺范围内） |
| **可卖 / 可交付（规程包）** | **100%** |
| **hosted / production-ready v1（具体环境）** | **须实际签核**；**不**自动达标 |
| **代码 / verify** | **E3**：仅可选 `scripts/e3-hosted-v1-readonly-aggregate-report.mjs`（stdout，只读）；closeout **无**新增 verify |
