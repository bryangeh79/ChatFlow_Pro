# Backup Restore SOP

- Backup command: `npm run delivery:backup`
- Backup artifacts: `backup_manifest.json`, `verification_snapshot.json`, `redacted_config_snapshot.json`, `*.sqlite.bak`
- Restore command: `npm run delivery:restore -- --backup=<path> --stop-command="<cmd>" --start-command="<cmd>"`
- Restore verify: `npm run delivery:restore:verify -- --backup=<path>`
- Restore flow (fixed): stop service -> restore DB -> restore redacted config snapshot -> start service -> manually re-inject secrets.

## Hosted v1 go-live (Phase E)

- **备份/恢复操作** 是上线就绪的 **E-G7 证据链** 一部分；**全量**门禁与签核见 [**phase-e-hosted-v1-index.md**](./phase-e-hosted-v1-index.md)。
- 下文 **Post-restore governance** = **D-C4 恢复专域**（**不等于** hosted v1 全表；全表仍须 Phase E 签核模板）。

## Post-restore governance (D-C4 / D-C4B)

**托管 Postgres**（`CHATFLOW_SAAS_DB_DRIVER=postgres`）在 **restore + start** 之后 **额外**必须：

1. `npm run build`
2. `npm run saas:recovery:readonly-check` — 规格见 [`d-c4a-recovery-readonly-check-spec.md`](./d-c4a-recovery-readonly-check-spec.md)（**只读**）
3. 将 **完整输出** 附工单；按 [`d-c4b-recovery-decision-table.md`](./d-c4b-recovery-decision-table.md) 对 `overall_tier` 分流
4. **书面**满足 [`d-c4-recovery-consistency-design.md`](./d-c4-recovery-consistency-design.md) §3.1 最低标准后，方可评估 **reopen traffic**（与 health 绿 **不等价**）
5. 若需单键 dedupe 处置：**仅**走 [`d-c3-operator-runbook.md`](./d-c3-operator-runbook.md)（D-C3A → D-C3B），**禁止**跳过 D-C4A 决策链

演练与验收字段：[`d-c4b-delivery-drill-checklist.md`](./d-c4b-delivery-drill-checklist.md)
