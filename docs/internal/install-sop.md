# Install SOP

- Scope: fresh environment only; existing install must use upgrade path.
- Command: `npm run delivery:install`
- Precheck: `npm run delivery:manifest`
- Verify: `npm run delivery:health:l1`, `npm run delivery:health:l2`, `npm run delivery:smoke -- --scenario=core --gate=install`
- Success criteria: deployment state created; current version equals manifest version.

## Hosted v1 go-live (Phase E)

- **全量**「可宣称 hosted / production-ready v1」— **不只**本 SOP：见 [**phase-e-hosted-v1-index.md**](./phase-e-hosted-v1-index.md) → 设计真源 + [**签核模板**](./phase-e-hosted-v1-signoff-template.md)。
- 本 SOP 对应 Phase E **E-G2**（健康/smoke/交付状态）**的一部分**；**不**替代迁移 ledger（E-G1）、租户边界 CI（E-G5）等。

## When install becomes a recovery path (D-C4B)

净安装 **默认** **不**强制 D-C4A。若安装后 **从备份恢复 PG**、**挂载非空数据集**、或 **重复 restore/rollback**，则 **升格**为恢复场景：**必须**按 [`backup-restore-sop.md`](./backup-restore-sop.md)「Post-restore governance」与 [`d-c4b-recovery-decision-table.md`](./d-c4b-recovery-decision-table.md) 执行。
