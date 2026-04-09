# ChatFlow Pro SaaS Admin UX Phase 2 — P1 Design Source

## Scope Lock

- This document is P1 design only.
- No P1 implementation in this round.
- No new main page.
- No package/version bump in this round.

## P1 Candidate 1 — Reports Critical Drilldown

### 1) Pending -> Inbox Queue

- User goal: operators can jump from pending KPI to actionable conversations.
- Page entry: `Reports` KPI card (`Pending conversations`) and exception rows.
- Required input: selected range (`today/last7d/all_time`), optional channel/owner filter.
- Success feedback: redirect to `Inbox` with query state preserved; list prefiltered; banner shows source context (`from reports/pending`).
- Failure or blocker: target list API unavailable, filter key invalid, or no matching data.
- Next-step guide: fallback to `Inbox` all-open list + banner explaining which filter failed.
- Why P1 not P0: P0 only requires minimum action closure; cross-module operational routing is optimization.
- Real write required: no (read navigation + filter state only).
- Hosted v1 signoff impact: low/medium; improves operability and auditability but not a hard readiness gate.

### 2) New Leads -> Leads Queue

- User goal: managers can immediately process newly created leads.
- Page entry: `Reports` card (`New leads`) and breakdown row.
- Required input: range + status (`new`) + source/channel.
- Success feedback: redirect to `Leads` with pre-applied filter chips and count confirmation.
- Failure or blocker: leads endpoint timeout or status mapping mismatch.
- Next-step guide: open `Leads` default list and show warning banner.
- Why P1 not P0: P0 already has lead actions; this is efficiency and discoverability uplift.
- Real write required: no.
- Hosted v1 signoff impact: low.

### 3) Handoff Count -> Inbox Handoff Worklist

- User goal: quickly clear handoff backlog from reports.
- Page entry: `Reports` card (`Handoff count`) and exceptions.
- Required input: target status bucket (`pending handoff`) and owner scope.
- Success feedback: redirect to `Inbox` handoff-focused view; quick actions highlighted.
- Failure or blocker: status dictionary mismatch between reports and inbox.
- Next-step guide: fallback to `Inbox` all pending with note.
- Why P1 not P0: P0 validates actions, but report-to-operation jump is secondary.
- Real write required: no.
- Hosted v1 signoff impact: medium (shorter time-to-response).

## P1 Candidate 2 — Knowledge Publish / Review Closure

### Lifecycle Design

- Draft -> Needs Review -> Published -> Archived (optional terminal).
- Roles:
  - `tenant_admin`: can publish/unpublish and override review.
  - `tenant_operator_readonly`: can suggest review only, cannot publish.

### 1) Draft -> Needs Review

- User goal: author marks entry ready for reviewer.
- Page entry: `Knowledge` detail action (`Submit for review`).
- Required input: title/question, answer/body, language, category, source.
- Success feedback: status chip changes to `Needs review`, timestamp and actor visible.
- Failure or blocker: missing required fields, invalid language/category.
- Next-step guide: return focus to invalid fields; show inline error reason.
- Why P1 not P0: P0 only requires one published entry exists, not governance lifecycle.
- Real write required: yes (status transition + audit metadata).
- Hosted v1 signoff impact: medium/high for governance traceability.

### 2) Needs Review -> Published

- User goal: reviewer publishes approved knowledge safely.
- Page entry: `Knowledge` review queue and detail panel.
- Required input: reviewer decision, optional publish note.
- Success feedback: status `Published`, visible in readiness card and setup checks.
- Failure or blocker: permission denied, concurrent update conflict.
- Next-step guide: reload latest revision and retry with conflict message.
- Why P1 not P0: stricter workflow and role checks exceed minimum onboarding closure.
- Real write required: yes.
- Hosted v1 signoff impact: high for controlled content release.

### 3) Publish Failure / Rollback Definition

- User goal: recover safely when publish fails after review.
- Page entry: publish action failure state.
- Required input: none mandatory; optional rollback reason.
- Success feedback: status restored to `Needs review` or previous state; rollback event recorded.
- Failure or blocker: stale revision, backend write failure.
- Next-step guide: open retry action with latest payload snapshot.
- Why P1 not P0: P0 does not require review-grade rollback semantics.
- Real write required: yes.
- Hosted v1 signoff impact: medium.

## P1 Candidate 3 — Setup Completion and Home Status Deepening

### Current Coarse Areas (Observed in P0 Smoke)

- Channel readiness and channel test pass can diverge.
- Go-live shows not-ready without direct remediation links.
- Setup completion source mixes tenant profile, tests, and credentials without per-step diagnostics.

### 1) Step-Level Completion Criteria Clarification

- User goal: know exactly what is still missing for each setup step.
- Page entry: `Settings > Setup` and `Overview` status cards.
- Required input: none (computed diagnostics).
- Success feedback: each step shows explicit pass/fail checks with reasons.
- Failure or blocker: missing diagnostic data from APIs.
- Next-step guide: direct CTA per failed check (`Configure channel`, `Run AI test`, `Publish knowledge`).
- Why P1 not P0: P0 already has minimal closure; this is clarity and reduced confusion.
- Real write required: no (mostly read-model enhancement).
- Hosted v1 signoff impact: medium.

### 2) Failure-State Prompting

- User goal: recover from failed tests without guessing.
- Page entry: setup step detail and overview warning blocks.
- Required input: none; show latest test error code/message.
- Success feedback: actionable remediation shown next to failure.
- Failure or blocker: error payload lacks standardized code.
- Next-step guide: map unknown errors to generic runbook link + support hint.
- Why P1 not P0: UX diagnosis depth enhancement.
- Real write required: no.
- Hosted v1 signoff impact: medium.

### 3) Cross-Page State Contract

- User goal: no contradictory readiness statuses across Overview/Settings/Setup.
- Page entry: all three pages.
- Required input: normalized status contract from one source-of-truth endpoint.
- Success feedback: same state labels and reason IDs everywhere.
- Failure or blocker: legacy endpoint divergence.
- Next-step guide: temporary reconciliation banner with source timestamp.
- Why P1 not P0: P0 linked states but did not enforce full contract schema.
- Real write required: no.
- Hosted v1 signoff impact: medium/high.

## Real-Signoff Notes for P1

- P1 can be released in two slices:
  - Slice P1A (read-only drilldown + status diagnostics): low risk.
  - Slice P1B (knowledge review/publish governance): medium risk due role and write flow.
- P1 should not start before current P0 blockers are triaged:
  - Postgres create-tenant compatibility (`INSERT OR REPLACE` issue in postgres path).
  - Tenant webhook requires explicit tenant secret/signature setup (expected but must be guided).
  - Conversation generation path for ops smoke should have an approved seed/test path.
