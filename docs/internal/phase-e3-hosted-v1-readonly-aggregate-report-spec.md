# Phase E3 — Hosted v1 只读聚合报告（实现规格 · E3-a ~ E3-d）

**性质**：**只读聚合**；**不是**自动化 gate；**不是**签核替代；**不是** D-C4 重开；**不是** E2 规格改写。  
**版本基线**：`package.json` **1.7.108** / **Pro_v1.07.108**（本交付 **不**改版本号，**不**新增 `package.json` scripts）。  
**前置**：E3 设计 [`phase-e3-hosted-v1-readonly-aggregate-scope-lock-design.md`](./phase-e3-hosted-v1-readonly-aggregate-scope-lock-design.md)；E1/E2/Phase E 主设计见 [`phase-e-hosted-v1-index.md`](./phase-e-hosted-v1-index.md)。  
**日期**：2026-04-09  

**硬边界**：**无**业务写路径；**不**并入 D-C4C bundle；**不**新增 `verify:*`；**报告 ≠ Go**。

---

## E3-a — 聚合报告字段定义

报告工件 **至少**包含下列逻辑块（Markdown 或等价结构化文本均可）。**所有** `evidence_uri` **须**遵守 E2 `contains_secrets=false` 纪律。

| 块 ID | 字段 | 必填 | 说明 |
|-------|------|------|------|
| **META** | `report_id` | 推荐 | 如 `E3R-2026-0409-001` 或沿用变更单号 |
| **META** | `generated_at` | **是** | ISO-8601 |
| **META** | `generator` | **是** | `manual` 或 `e3-hosted-v1-readonly-aggregate-report.mjs` |
| **META** | `package_version_ref` | **是** | 签核当时的 `package.json` version（**只**记录，**不**改文件） |
| **META** | `target_release` | **是** | 目标环境：`Staging` / `RC` / `Production` 等 |
| **COVERAGE** | `chk_rows[]` | **是** | 每行：`chk_id`、`template_ref`、`e2b_kind_hint`（来自映射）、`evidence_status`、`evidence_uri`、`notes` |
| **COVERAGE** | `evidence_status` 枚举 | **是** | `missing` / `linked` / `n_a` / `waiver`（**人工**判定） |
| **ENV** | `env_notes` | 推荐 | 对 CI / RC / Staging / Prod 的 **人工**结论（对照 E2-c） |
| **D_C4** | `d4a_uri` | 条件 | 有跑 D-C4A 时：输出/工单 **URI** |
| **D_C4** | `d4b_ref` | 条件 | 曾恢复/回滚：决策表引用 |
| **D_C4** | `d4c_bundle_run_uri` | 条件 | 有 CI bundle 时：pipeline 或日志 **URI**（**不**替代全量 E） |
| **NOGO** | `nogo_d_section` | **是** | 与模板 D 对齐：**无**勾选 **或** waiver 引用 |
| **SIGNOFF** | `human_signoff_required` | **是** | 固定文案：**本报告不替代** `phase-e-hosted-v1-signoff-template.md` **E/F** |

---

## E3-b — 输入源映射表（E1 / E2 / D-C4）

| 聚合块 | 主要输入真源 | 用途 |
|--------|----------------|------|
| 签核面 / 元数据 | [`phase-e-hosted-v1-signoff-template.md`](./phase-e-hosted-v1-signoff-template.md) | 复制工单元数据；**最终**仍以模板为准 |
| `chk_id` / 环境 / 前置 | [`phase-e2-hosted-v1-checklist-spec.md`](./phase-e2-hosted-v1-checklist-spec.md) | **COVERAGE** 行清单与 E2-b `kind` 提示 |
| Gate 叙事 / No-Go | [`phase-e-hosted-v1-go-live-gate-design.md`](./phase-e-hosted-v1-go-live-gate-design.md) | 签核人核对 §2–§6，**不**自动判定 |
| 导航 / 边界 | [`phase-e-hosted-v1-index.md`](./phase-e-hosted-v1-index.md) | 找齐 SOP / D-C4 子链 |
| **D-C4A** | [`d-c4a-recovery-readonly-check-spec.md`](./d-c4a-recovery-readonly-check-spec.md) + 运行输出归档 | `CHK-MAN-D4A` 证据 |
| **D-C4B** | [`d-c4b-recovery-decision-table.md`](./d-c4b-recovery-decision-table.md)、[`d-c4b-delivery-drill-checklist.md`](./d-c4b-delivery-drill-checklist.md) | `CHK-MAN-D4B` / `CHK-EV-D4B-DRILL` |
| **D-C4C** | [`d-c4c-readonly-governance-bundle-spec.md`](./d-c4c-readonly-governance-bundle-spec.md)、[`d-c4c-ci-rc-staging-gates.md`](./d-c4c-ci-rc-staging-gates.md) | **仅**解释 bundle 在 **恢复子集**中的位置；**不**扩大 bundle 语义 |
| **D-C4 closeout** | [`d-c4-overall-closeout.md`](./d-c4-overall-closeout.md) | 边界提醒：**E3 不** reopen D-C4 |

---

## E3-c — 输出模板与样例

- **空模板（人工主路径）**：[phase-e3-hosted-v1-readonly-aggregate-report.template.md](./phase-e3-hosted-v1-readonly-aggregate-report.template.md)  
- **填写样例（演示结构）**：[samples/phase-e3-hosted-v1-readonly-aggregate-report.example.md](./samples/phase-e3-hosted-v1-readonly-aggregate-report.example.md)  

---

## E3-d — 最小生成方式（仅只读）

### D.1 人工（默认）

1. 复制 **template** 为新文件（或工单附件）。  
2. 按 **E3-b** 打开真源，逐 `chk_id` 填 `evidence_uri` / `evidence_status`。  
3. 将本报告 **作为附件**与 **签核模板**一并归档；**不得**以本报告单独宣称 Go。

### D.2 可选机器骨架（**不**写 npm script）

```bash
node scripts/e3-hosted-v1-readonly-aggregate-report.mjs
```

- **行为**：**仅** `fs.readFileSync` / `fs.statSync` / `fs.existsSync` 读取 **固定白名单** 内仓库文件；**仅**向 **stdout** 打印 Markdown。  
- **禁止**：子进程、网络、数据库、改写仓库内文件。  
- **用途**：生成 **COVERAGE** 表骨架（`chk_id` 列表 + 真源存在性），**减轻**漏项；**证据 URI** 仍须 **人工**补全。

---

## 文档状态

| 项 | 值 |
|----|-----|
| **阶段** | **Phase E3 — 实现（只读聚合报告工件）** |
| **verify / npm scripts** | **未**新增 |
| **版本** | **1.7.108** |
