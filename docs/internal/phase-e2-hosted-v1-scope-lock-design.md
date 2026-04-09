# Phase E2 — Hosted v1 检查清单规格化（设计真源 / 范围锁定）

**性质**：**E2 范围锁定（设计）**；实现交付 **见** [`phase-e2-hosted-v1-checklist-spec.md`](./phase-e2-hosted-v1-checklist-spec.md)（E2-a ~ E2-d）。  
**版本基线**：`package.json` **1.7.108** / **Pro_v1.07.108**。  
**前置**：**Phase D-C4 overall closed**；**Phase E** 设计 [`phase-e-hosted-v1-go-live-gate-design.md`](./phase-e-hosted-v1-go-live-gate-design.md)；**E1** 已完成 [`phase-e-hosted-v1-index.md`](./phase-e-hosted-v1-index.md)、[`phase-e-hosted-v1-signoff-template.md`](./phase-e-hosted-v1-signoff-template.md)。  
**日期**：2026-04-09  

---

## 唯一要答清的问题（钉死）

**在 Phase E 设计稿与 E1 都已成立的前提下，E2 还要补什么，且为什么不能被 E1 替代？**

**答**：E1 交付的是 **可填的签核叙事**（模板 + 入口 + SOP 指针）— **足够让人开始工作**，但 **不足**以 **规范化**「每一项检查是什么、在哪种环境强制、必须挂什么证据、证据字段叫什么、项与项之间谁依赖谁」。E2 补的是 **Hosted v1 检查清单的规格层（normative spec）** — **稳定 ID**、**分级枚举**、**环境适用矩阵**、**证据元数据 schema（仅结构，不含 secret）**、**签核前置约束（哪些 evidence_id 不齐则不得勾 Go）**。  
**不**引入可执行代码；**不**替代 E1 模板（E2 是模板的 **上游规格**，未来可 **映射**回模板章节）。

| 能力 | E1 | E2（本设计所指） |
|------|-----|------------------|
| 签核表可复制 | ✅ | ❌ 不重复做第二份模板正文 |
| 文档入口 / SOP 边界 | ✅ | ❌ 不重复导航 |
| **检查项稳定 ID** | ❌（模板用 A.1/A.2 叙述） | ✅ |
| **证据字段名 / 类型 / 禁止项（如 secret）** | ❌（仅 `<LINK>` 占位） | ✅ |
| **CI / RC / Staging / Prod 逐项适用表** | ❌（仅在 Phase E §5 叙述级） | ✅ **细化到项** |
| **依赖 / 前置（signoff 前必齐集）** | ❌ | ✅ |
| **与租户 go-live 检查的关系（字段级）** | ❌（仅设计稿一句） | ✅ **关系表** |

---

## [1] E2 Problem Statement

- **问题**：没有规格层时，**同一模板**在不同团队会出现 **项名漂移、证据口径不一致、环境漏跑**；审计时难以回答「缺的是哪一条 E-Gx」。  
- **目标**：用 **最小** 规格文档，把 **E-G1–G8** 与 **签核模板章节** **对齐到稳定 ID**，并定义 **证据怎么归档才算数** — **仍全是文档/表**，**零**执行语义。

---

## [2] Why E1 Is Not Enough

- E1 **故意**保持 **柔性占位**（`<LINK>`、自由备注）— 利于 **首发落地**。  
- **规模化签核 / 审计 / 多环境对表** 需要 **同一套键名** 与 **环境矩阵** — 若硬塞进 E1 模板，模板会 **臃肿且难 diff**；故 **拆 E2 为规格真源**，E1 **保持人类可读** 薄层。

---

## [3] E2 Boundary Lock

| 边界 | 内容 |
|------|------|
| **对 E1** | **不**删除、**不**重写签核模板 **结构**；仅允许未来 **PR** 在模板脚注增加「见 E2 条目 `CHK-xxxxx`」— **须**在 E2 **实现**包做，**不在**本设计轮改 E1 正文。 |
| **对 Phase E 主设计** | **不**改 E-G1–G8 **语义**；仅 **细化映射**与证据 schema。 |
| **对 D-C4** | **不**新增恢复工具；**不**改 D-C4A/B/C；仅 **引用** `D4C-BUNDLE-PASS`、`D4A-RECOVERY-JSONL` 等 **证据类型名** 作为 **手工/CI 产出**的 **标签**。 |
| **对 E3** | **禁止**在本规格内嵌 shell/npm/verify 片段；E3 **若**消费 E2，须 **单独 Go**。 |
| **对「自动化偷跑」** | 本文件 **任何**表 **不得**写「失败则执行 X 脚本」；**仅**允许「缺少证据 Y 则 **签核无效**」类 **人工**规则。 |

---

## [4] Candidate Scope Options（必须极小）

| ID | 候选 | 交付形态（设计→未来实现） |
|----|------|---------------------------|
| **E2-a** | **检查项注册表** | Markdown/CSV：**`chk_id`**、**`gate_ref`（E-Gx）**、**`title`**、**`default_tier`（block/manual/evidence）**、**`template_section`（映射 A/B/C…）** |
| **E2-b** | **证据 artifact schema** | JSON Schema **仅**元数据：`evidence_id`、`kind`（enum）、`uri_or_ticket`、`commit_sha`、`contains_secrets: false` **必填**、`retention_hint` |
| **E2-c** | **环境适用矩阵** | 表：**chk_id** × **{CI, RC, Staging, Prod}** → **required / optional / forbidden** |
| **E2-d** | **签核前置规则** | 表：**final_go_requires** → `chk_id` 或 `evidence_kind` 列表（**逻辑 AND** 默认；OR 须显式写） |
| **E2-e** | **租户 go-live ↔ 平台项** | 小表：`CHK-TENANT-GL` ↔ `runTenantGoLiveCheck` 字段/结果枚举（**文档**） |

**默认不包含**：新 npm script、新 verify、改 `go-live-check.ts`、Admin API。

---

## [5] Go / No-Go Conditions

### 可进入 **E2 实现** 的条件

- Bryan 确认范围 ⊆ **§4 E2-a～e**；  
- 明确 **实现**形态为 **数据文件 + 文档**（如 `hosted-v1-checklist-registry.md`）**或** 仅 **扩展** index 链到注册表 — **仍可无**代码；  
- **不**捆绑 E3 verify。

### 应 **停留在设计** 的条件

- 讨论变成「顺便写个脚本扫一遍」；  
- 要求 **合并** D-C4C bundle **行为**变更。

### **E2 根本不该立项** 的信号

- 组织 **只**要自由文本签核、**明确拒绝**任何 stable ID；或  
- 要求 E2 **直接**交付 **可执行 gate** — 应 **退回** 重划为 E3。

---

## [6] Risks of Mis-scoping

- **规格膨胀**：注册表 **超过 ~40 行** 未再分包 → 难维护；应 **按 E-Gx 分块**。  
- **与 D-C4 混淆**：在 E2 注册表写 dedupe repair 步骤 — **禁止**；**仅**「证据：D-C4A 输出已附」类。  
- **secret 进 schema**：证据 schema **必须** `contains_secrets: false` 或 **仅**允许指纹/票据 ID。  
- **模板双维护**：实现 E2 后 **须**单点映射 E1，避免 A.1 与 `CHK-xxx` **分叉**。

---

## [7] Final Recommendation

| 结论 | 说明 |
|------|------|
| **E2 定位** | **Hosted v1 清单与证据的规格化层** — **规范化**，**非**自动化。 |
| **本轮** | **E2-a ~ E2-d** 已在 [`phase-e2-hosted-v1-checklist-spec.md`](./phase-e2-hosted-v1-checklist-spec.md) 落地（**仅文档**）。 |
| **下一可选步** | **E2-e**（租户 go-live 映射表）须 **另 Go**；**E3** 须 **另 Go**。 |
| **E2 实现** | **E2-a ~ E2-d** 已按第二次 Go 交付；**不含**脚本/verify。 |

---

## 文档状态

| 项 | 值 |
|----|-----|
| **阶段** | **Phase E2 — 设计 + E2-a~d 规格已交付** |
| **实现** | **E2-a ~ E2-d** ✅ 文档真源；**无**代码；**E2-e / E3** **未**启动 |
