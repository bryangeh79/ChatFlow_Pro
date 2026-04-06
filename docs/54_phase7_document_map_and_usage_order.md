# Phase 7 Document Map and Usage Order

## 1. Why This Document Map Exists

### Why the 45–53 Set Formed
- Phase 7 produced a series of documents to keep Telegram from being started too early and to keep Website from being damaged by second-channel work.
- Each document narrowed the next decision step: planning, readiness, gate, protection, minimal change, isolation, regression priority, and change approval.
- The result is not a new product feature set; it is a control system for safe continuation.

### What the 45–53 Set Solves
- It defines the boundary between documentation readiness and real Telegram implementation.
- It protects Website as the first real stable sample.
- It reduces misstart, scope drift, and regression risk.
- It gives later chats a stable way to decide whether Telegram can start.

### Relationship to Website and Telegram Boundary
- Website is the current real reference channel.
- Telegram is still planning/readiness/documentation/gate only.
- These documents exist to prevent the boundary from being crossed too early.

---

## 2. Document-by-Document Responsibilities

## 45. Telegram Planning Baseline
**What it solves:**
- Defines Telegram's role, minimal real loop target, reuse relationship, and the intended development direction.

**When to read it:**
- When first understanding what Telegram is supposed to become.
- When comparing Telegram against the Website sample.

**Relation to other docs:**
- It is the starting contract baseline.
- Later docs build on it.

**What it must not be mistaken for:**
- It is not permission to start real Telegram code.
- It is not a platform auth or webhook implementation plan.

## 46. Telegram Readiness and Acceptance
**What it solves:**
- Defines the conditions required before a minimal real Telegram loop can be considered complete.

**When to read it:**
- When deciding what must exist before real Telegram implementation begins.
- When writing acceptance criteria for the first real loop.

**Relation to other docs:**
- It turns planning into a readiness checklist.
- It is strengthened by the readiness gate and blockers docs.

**What it must not be mistaken for:**
- It is not a start signal.
- It is not a substitute for the change gate.

## 47. Channel Readiness Gate
**What it solves:**
- Locks the current channel statuses and defines the readiness gate that must be satisfied before real Telegram development.

**When to read it:**
- When deciding whether Telegram is allowed to leave documentation mode.
- When checking the current system status snapshot.

**Relation to other docs:**
- It sits above readiness/acceptance and below the change gate.
- It protects Website as the reference sample.

**What it must not be mistaken for:**
- It is not permission to code.
- It is not a broad implementation roadmap.

## 48. Website Stable Template Protection
**What it solves:**
- Defines why Website is the first real stable sample and how to protect it.

**When to read it:**
- Before any second-channel work touches shared behavior.
- When checking whether a proposed change threatens the baseline.

**Relation to other docs:**
- It is the Website protection counterpart to Telegram readiness.
- It explains what must not be disturbed by second-channel work.

**What it must not be mistaken for:**
- It is not a Telegram implementation guide.
- It is not permission to alter Website for convenience.

## 49. Telegram Start Blockers
**What it solves:**
- Lists what absolutely must not trigger real Telegram development and the common misreads that cause premature starts.

**When to read it:**
- Whenever someone thinks Telegram is "basically ready".
- Before approving any implementation start.

**Relation to other docs:**
- It gives the no-start boundary around the readiness gate.

**What it must not be mistaken for:**
- It is not a replacement for the readiness or change gate.
- It is not a technical design doc.

## 50. Second Channel Minimal Change Policy
**What it solves:**
- Defines that second-channel implementation must stay minimal and avoid opportunistic refactors or broad rewrite behavior.

**When to read it:**
- When planning how Telegram would be implemented if it is later allowed.
- When checking whether a proposed change is too large.

**Relation to other docs:**
- It works with the isolation-first policy and Website regression priority.

**What it must not be mistaken for:**
- It is not a promise to refactor later.
- It is not a license to clean up everything while touching Telegram.

## 51. Second Channel Isolation First Policy
**What it solves:**
- Establishes that Telegram should be implemented at the edge first, with shared-layer change only as a last resort.

**When to read it:**
- When deciding how to structure a future Telegram implementation.
- When comparing local edge work against shared-core change.

**Relation to other docs:**
- It is the implementation strategy partner to the minimal change policy.

**What it must not be mistaken for:**
- It is not a way to skip regression checks.
- It is not a statement that shared layers can never change.

## 52. Website Regression Priority for Second Channel
**What it solves:**
- Defines the priority order for checking Website after second-channel work, including hard stop conditions.

**When to read it:**
- After any second-channel change.
- Before approving Telegram work that touches shared behavior.

**Relation to other docs:**
- It enforces the Website protection promises from 48, 50, and 51.

**What it must not be mistaken for:**
- It is not just a checklist.
- It is not optional if shared behavior is touched.

## 53. Second Channel Change Gate
**What it solves:**
- Defines the final approval gate before any real second-channel implementation begins.

**When to read it:**
- Right before deciding whether Telegram can start real implementation.
- When a yes/no start decision is needed.

**Relation to other docs:**
- It consumes readiness, blockers, Website protection, minimal change, isolation, and regression priority.

**What it must not be mistaken for:**
- It is not a broad engineering plan.
- It is not a guarantee that a big refactor is acceptable.

---

## 3. Recommended Reading Order

### A. New Chat Handoff Order
Read in this order when entering a new chat and needing the current boundary fast:
1. `01_project_status.md`
2. `05_handoff_for_new_chat.md`
3. `47_phase7_channel_readiness_gate.md`
4. `48_phase7_website_stable_template_protection.md`
5. `54_phase7_document_map_and_usage_order.md`

### B. Telegram Start Decision Order
Read in this order when deciding whether Telegram can begin real development:
1. `45_phase7_telegram_planning_baseline.md`
2. `46_phase7_telegram_readiness_and_acceptance.md`
3. `47_phase7_channel_readiness_gate.md`
4. `49_phase7_telegram_start_blockers.md`
5. `50_phase7_second_channel_minimal_change_policy.md`
6. `51_phase7_second_channel_isolation_first_policy.md`
7. `52_phase7_website_regression_priority_for_second_channel.md`
8. `53_phase7_second_channel_change_gate.md`

### C. Website Risk / Regression Review Order
Read in this order when checking whether a second-channel change harmed Website:
1. `48_phase7_website_stable_template_protection.md`
2. `52_phase7_website_regression_priority_for_second_channel.md`
3. `50_phase7_second_channel_minimal_change_policy.md`
4. `51_phase7_second_channel_isolation_first_policy.md`
5. `53_phase7_second_channel_change_gate.md`

---

## 4. Usage Scenario Index

### New Chat Handoff
Use:
- `01_project_status.md`
- `05_handoff_for_new_chat.md`
- `54_phase7_document_map_and_usage_order.md`

### Current Phase Status Restatement
Use:
- `01_project_status.md`
- `47_phase7_channel_readiness_gate.md`

### Determine Whether Telegram Can Start
Use:
- `45_phase7_telegram_planning_baseline.md`
- `46_phase7_telegram_readiness_and_acceptance.md`
- `47_phase7_channel_readiness_gate.md`
- `49_phase7_telegram_start_blockers.md`
- `53_phase7_second_channel_change_gate.md`

### Prevent Misstart
Use:
- `49_phase7_telegram_start_blockers.md`
- `47_phase7_channel_readiness_gate.md`
- `53_phase7_second_channel_change_gate.md`

### Prevent Scope Drift / Overreach
Use:
- `50_phase7_second_channel_minimal_change_policy.md`
- `51_phase7_second_channel_isolation_first_policy.md`
- `53_phase7_second_channel_change_gate.md`

### Prevent Website Regression
Use:
- `48_phase7_website_stable_template_protection.md`
- `52_phase7_website_regression_priority_for_second_channel.md`
- `51_phase7_second_channel_isolation_first_policy.md`

### Prepare for Future Telegram Real Implementation
Use:
- `45_phase7_telegram_planning_baseline.md`
- `46_phase7_telegram_readiness_and_acceptance.md`
- `47_phase7_channel_readiness_gate.md`
- `50_phase7_second_channel_minimal_change_policy.md`
- `51_phase7_second_channel_isolation_first_policy.md`
- `52_phase7_website_regression_priority_for_second_channel.md`
- `53_phase7_second_channel_change_gate.md`

---

## 5. What This Document Set Solves as a Whole

### Overall Problem Being Solved
- It turns Phase 7 from a scattered set of guidance notes into a usable operating system for safe continuation.
- It makes it possible to answer, quickly and consistently, whether Telegram can start and what must be protected first.
- It gives future chats a way to resume without reopening the whole project definition.

### Why This Matters
- Without this map, the 45–53 documents are easy to read in the wrong order or treat as independent rules.
- With this map, the documents become a sequence: plan → readiness → gate → protect Website → block misstarts → keep changes minimal → isolate the second channel → check regression first → require change approval.

---

## 6. Conclusion

### Should We Still Stay in Documentation / Readiness Mode Right Now?
- Yes.

### Is the Document Set Sufficient for Future Handoff and Review?
- Yes. The current 45–53 set plus this map is enough to support future承接,审查, and Telegram start decisions.

### Should Memory Be Updated?
- Not required for this document-only step.

### Should Version Be Upgraded?
- No. Keep `Pro_v1.05`.

---

## 7. Addendum — Commercial delivery docs (Pro era)

For **sellable per-customer deployments**, read in this order (orthogonal to Phase 7 Telegram gate above):

1. **`docs/169_pro_commercial_one_customer_one_deploy.md`** — one customer = one deployment; secrets per instance.  
2. **`docs/170_pro_customer_ops_runbook.md`** — backup (`npm run backup:data`), upgrade, rollback.  
3. **`docs/168_pro_two_day_go_live_checklist.md`** — go-live checklist.  
4. **`docs/161`**, **`docs/162`**, **`docs/158`**, **`docs/155`** — notify, customer tokens, Docker smoke, agent equivalence.
