# Acceptance Runbook (Phase D-A)

- Full acceptance: `npm run delivery:acceptance:da`
- Includes: build, manifest, snapshot, deployment info, L1/L2, smoke(core/ops/workflow), backup integrity, upgrade verify, rollback verify.
- Optional restore drill execution requires `StopCommand` and `StartCommand`.
- Exit code: PASS `0`, FAIL non-zero with failed stage and next action.
