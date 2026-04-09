# Upgrade SOP

- Scope: existing installed environment only.
- Command: `npm run delivery:upgrade`
- Verify: `npm run delivery:upgrade:verify` (add `-FullVerify` for core+ops+workflow)
- Must pass: target version equals delivery manifest version, migration target present, L1/L2 PASS, smoke gates PASS.
- On failure: execute rollback path immediately.
