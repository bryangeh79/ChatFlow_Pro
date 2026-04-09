# Hosted v1 — E3 只读聚合报告（样例 · 结构演示）

**性质**：**演示**；**非**真实签核；URI 均为占位。  
**generator**：`manual`  

---

## META

| 字段 | 值 |
|------|-----|
| `report_id` | `E3R-DEMO-001` |
| `generated_at` | `2026-04-09T12:00:00Z` |
| `generator` | `manual` |
| `package_version_ref` | `1.7.108` |
| `target_release` | `Production` |

---

## COVERAGE（摘录）

| `chk_id` | `evidence_status` | `evidence_uri` | `notes` |
|----------|-------------------|----------------|---------|
| CHK-CI-01 | linked | `<PIPELINE_RUN_URL>` | 含 D-C4C job |
| CHK-STG-01 | linked | `<STAGING_L1L2_LOG_PATH>` | |
| CHK-MAN-D4A | linked | `<D4A_JSONL_ARCHIVE_PATH>` | `overall_tier=observe` |
| CHK-EV-BACKUP | missing | | **签核前须补齐** |

---

## ENV

| 环境 | 结论摘要 |
|------|----------|
| CI | 主线绿 + bundle 已见於 CHK-CI-01 |
| Staging | CHK-STG-* 已链接 |

---

## D_C4

| 字段 | URI / 引用 |
|------|------------|
| `d4c_bundle_run_uri` | `<同 CHK-CI-01>` |

---

## NOGO

- 模板 D：**无**勾选。

---

## SIGNOFF

**本报告不替代**正式签核模板 **E / F**。
