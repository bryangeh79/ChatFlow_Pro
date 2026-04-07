# Phase 24 — Controlled PG Evidence Runbook (runtime_wired hard gate)

> Scope: evidence solidification only. No business/runtime logic changes.
> This runbook is optional verification material and is NOT part of default verify chain.

---

## 1) Purpose and Boundaries

- Produce reviewable evidence for three controlled markers:
  - `controlled_runtime_wired_ok`
  - `controlled_runtime_wired_hard_fail`
  - `controlled_runtime_wired_skip(...)`
- Always record `overall_go_not_implied` for controlled `ok` / `hard_fail`.
- Keep default chain unchanged (`verify:saas-db-postgres-go-no-go`).
- Keep default live DB path unchanged (`sqljs`).

---

## 2) Evidence Classes

- **Default chain evidence**
  - Source: `npm run verify:saas-db-postgres-go-no-go`
  - Meaning: baseline gate result (typically `NO_GO`)
- **Controlled chain evidence**
  - Source: `npm run verify:postgres-runtime-wired-controlled-integration`
  - Meaning: controlled runtime_wired branch behavior (`skip` / `ok` / `hard_fail`)
- **Not-GO statement (mandatory)**
  - Marker: `overall_go_not_implied`
  - Meaning: controlled pass/fail branch does not imply overall GO.

Note:
- `skip` is valid evidence.
- `skip` does NOT mean `ok/hard_fail` branch coverage is complete.

---

## 3) Fixed Record Template (must keep fields)

Use this exact field set to avoid free-form records:

```text
[记录ID]
[时间]
[执行人]
[环境标识]
[命令]
[前置条件]
[关键输出]
[结论]
[复核人]
```

Recommended environment tag values:
- `local-no-pg`
- `controlled-pg-reachable`
- `controlled-pg-injected-hard-fail`

---

## 4) Collection Flow A — Default Chain Evidence

### Preconditions
- `npm run build` already green.

### Command
- `npm run verify:saas-db-postgres-go-no-go`

### Expected markers
- Default chain should include `default_no_go_ok`.
- Overall gate remains `NO_GO`.

### Recording rule
- Copy only key markers and final result line into template.
- Do not interpret as GO.

---

## 5) Collection Flow B — Controlled OK/SKIP Evidence

### Preconditions
- Controlled verify flag is explicit:
  - `CHATFLOW_SAAS_POSTGRES_CONTROLLED_VERIFY=1`
- PG URL is provided when testing reachable branch:
  - `CHATFLOW_SAAS_POSTGRES_URL=<your_url>`

### Command
- `npm run verify:postgres-runtime-wired-controlled-integration`

### Expected markers
- No controlled preconditions: `controlled_runtime_wired_skip(...)`
- Controlled preconditions satisfied and reachable: `controlled_runtime_wired_ok`
- Controlled `ok` must include: `overall_go_not_implied`

### Recording rule
- Record exact marker string.
- If result is `skip`, mark branch coverage as partial (ok/hard_fail not both covered).

---

## 6) Collection Flow C — Controlled hard_fail Injection Evidence

### Preconditions
- Same controlled preconditions as Flow B (reachable environment).
- Test-only injection (script scope only):
  - `CHATFLOW_SAAS_RUNTIME_WIRED_TEST_INJECT_HARD_FAIL=1`

### Command
- `npm run verify:postgres-runtime-wired-controlled-integration`

### Expected markers
- `controlled_runtime_wired_hard_fail`
- `overall_go_not_implied`
- Process exits non-zero by design (expected for this case).

### Recording rule
- Record non-zero exit as expected behavior for this flow.
- Mark this as injection evidence, not production fault.

---

## 7) Review Checklist (Phase 24 pre-close evidence)

- [ ] Flow A record exists (default chain).
- [ ] Flow B record exists (`skip` or `ok`).
- [ ] Flow C record exists (`hard_fail`, injected).
- [ ] `overall_go_not_implied` recorded for controlled `ok` / `hard_fail`.
- [ ] Reviewer sign-off completed in template.

If any item is missing, evidence is incomplete for close judgment.
