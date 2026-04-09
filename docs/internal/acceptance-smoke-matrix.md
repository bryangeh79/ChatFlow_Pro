# Acceptance Smoke Matrix

## Scenario Coverage

- `core`: deployment info readable, health L1/L2, Phase A core admin flows (`scripts/phasea-acceptance-curl.ps1`)
- `ops`: Phase B ops trackability flows (`scripts/phaseb-acceptance-curl.ps1`)
- `workflow`: Phase C inbox/leads/reports flows (`scripts/phasec-acceptance-curl.ps1`)
- `all`: ordered orchestration `core -> ops -> workflow`

## Gate Rules

- install gate: at least `core` PASS
- upgrade gate: at least `core + ops` PASS
- restore drill gate: at least `core` PASS, recommend `workflow` sample PASS
- final delivery acceptance gate: `all` PASS

## Exit Code and Failure Contract

- PASS: `0`
- FAIL: non-zero
- failure output must include failed stage and next action (`retry`, `rollback`, `manual intervention`)

## Standard Commands

- `npm run delivery:smoke -- --scenario=core`
- `npm run delivery:smoke -- --scenario=ops`
- `npm run delivery:smoke -- --scenario=workflow`
- `npm run delivery:smoke -- --scenario=all`
