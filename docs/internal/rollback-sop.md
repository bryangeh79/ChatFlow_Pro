# Rollback SOP

- Scope: rollback only to latest verified stable version.
- Command: `npm run delivery:rollback`
- Verify: `npm run delivery:rollback:verify`
- Must pass: deployment state current version equals stable version, L1/L2 PASS, deployment info readable.
- If verify fails: stop release, keep service in stable state, open manual incident handoff.

## Hosted v1 go-live (Phase E)

- 回滚能力 **支撑** Phase E **E-G7 / No-Go** 中的回滚路径要求；**完整** Go-Live 见 [**phase-e-hosted-v1-index.md**](./phase-e-hosted-v1-index.md) + [**签核模板**](./phase-e-hosted-v1-signoff-template.md)。
- 下文 **Post-rollback recovery governance** = **D-C4 恢复专域**（**仅**一致性/幂等语境；**不**替代 Phase E 全量签核）。

## Post-rollback recovery governance (D-C4 / D-C4B)

`delivery:rollback:verify` **通过后**，对 **托管 Postgres** **仍须**执行（R1 类：应用回退 / PG 可能不同步）：

1. `npm run build`
2. `npm run saas:recovery:readonly-check` — [`d-c4a-recovery-readonly-check-spec.md`](./d-c4a-recovery-readonly-check-spec.md)
3. 按 [`d-c4b-recovery-decision-table.md`](./d-c4b-recovery-decision-table.md) 解释 `overall_tier`；**禁止**因 `observe` **单独**视为可全量接流
4. **书面**归档输出 + 是否 **reopen traffic**（见 [`d-c4b-delivery-drill-checklist.md`](./d-c4b-delivery-drill-checklist.md)）

设计背景：[`d-c4-recovery-consistency-design.md`](./d-c4-recovery-consistency-design.md) §2 R1、§3.2。
