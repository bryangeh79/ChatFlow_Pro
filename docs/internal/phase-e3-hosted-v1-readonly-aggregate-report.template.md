# Hosted v1 — E3 只读聚合报告（模板）

**用途**：签核前 **人工**汇总证据链接与完整度；**不**替代 [`phase-e-hosted-v1-signoff-template.md`](./phase-e-hosted-v1-signoff-template.md)。  
**填写说明**：[`phase-e3-hosted-v1-readonly-aggregate-report-spec.md`](./phase-e3-hosted-v1-readonly-aggregate-report-spec.md)  

---

## META

| 字段 | 填写 |
|------|------|
| `report_id` | `<E3R-… 或 TICKET>` |
| `generated_at` | `<ISO-8601>` |
| `generator` | `manual` |
| `package_version_ref` | `<与 package.json 一致>` |
| `target_release` | `Staging` / `RC` / `Production` |

---

## COVERAGE（按 E2 `chk_id`）

| `chk_id` | `template_ref` | `e2b_kind_hint` | `evidence_status` | `evidence_uri` | `notes` |
|----------|----------------|-----------------|-------------------|----------------|---------|
| CHK-BUILD-01 | A.1 | BUILD_LOG | missing \| linked \| n_a \| waiver | `<URI>` | |
| CHK-BUILD-02 | A.1 | — | | | |
| CHK-CI-01 | A.2 | PIPELINE_RUN | | | |
| CHK-CI-02 | A.2 | PIPELINE_RUN | | | |
| CHK-CI-03 | A.2 | PIPELINE_RUN | | | |
| CHK-STG-01 | A.3 | STAGING_HEALTH | | | |
| CHK-STG-02 | A.3 | STAGING_SMOKE | | | |
| CHK-STG-03 | A.3 | MIGRATION_LEDGER_SUMMARY | | | |
| CHK-RC-01 | A.4 | RC_MANIFEST_DIFF | | | |
| CHK-RC-02 | A.4 | ROLLBACK_VERIFY_LOG | | | |
| CHK-PROD-01 | A.5 | MIGRATION_LEDGER_SUMMARY | | | |
| CHK-PROD-02 | A.5 | ATTESTATION_NO_WEAKEN | | | |
| CHK-MAN-D4A | B | D4A_RECOVERY_JSONL | | | |
| CHK-MAN-D4B | B | D4B_DECISION_REF | | | |
| CHK-MAN-EG4 | B | OPS_CREDENTIALS_TICKET | | | |
| CHK-MAN-EG8 | B | TENANT_GOLIVE_EXPORT | | | |
| CHK-MAN-EG67 | B | SOP_ACK | | | |
| CHK-EV-D4B-DRILL | C | DRILL_CHECKLIST | | | |
| CHK-EV-RC-MTG | C | MEETING_MINUTES | | | |
| CHK-EV-BACKUP | C | BACKUP_RECORD | | | |
| CHK-NOGO-D1 | D | — | | **须**与模板 D 一致 | |
| CHK-NOGO-D2 | D | — | | | |
| CHK-NOGO-D3 | D | — | | | |
| CHK-NOGO-D4 | D | — | | | |

---

## ENV（对照 E2-c，人工摘要）

| 环境 | 结论摘要 |
|------|----------|
| CI | |
| RC | |
| Staging | |
| Prod（签核面） | |

---

## D_C4（仅引用，不扩语义）

| 字段 | URI / 引用 |
|------|------------|
| `d4a_uri` | |
| `d4b_ref` | |
| `d4c_bundle_run_uri` | |

---

## NOGO

- 模板 D 节：**无**勾选 **或** waiver：`WAIVER_RISK_ACCEPTANCE` URI = `<>`  

---

## SIGNOFF

**本报告不替代** Phase E 签核模板 **E / F**；**Go / No-Go** **仅**以书面签核为准。
