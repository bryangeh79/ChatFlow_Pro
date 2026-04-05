# Phase 7 Website Version Bump Decision Policy

## 1. Why Website Maintenance Needs a Version-Bump Rule

### Why We Should Not Bump Every Time
- Not every Website maintenance task changes the meaningful public or operational state.
- Many fixes are local, low-risk, and already covered by the current phase posture.
- If every small edit bumps version, the version loses signal value.

### Why We Also Cannot Avoid Bumping Forever
- Some maintenance work does materially improve the stable sample, the acceptance posture, or the long-term maintainability.
- If those changes are never reflected in versioning, future chats may miss that a meaningful maintenance milestone happened.
- Versioning should mark meaningful stability steps, not just major product jumps.

### Why Stage-Meaningful Maintenance Should Be Reflected
- When a maintenance effort improves Website quality, clarity, or acceptance state enough to matter, the version should be considered.
- This helps distinguish “same sample, minor cleanup” from “same sample, but now materially improved and worth marking.”
- It prevents important maintenance results from being hidden in the noise.

---

## 2. When Version Does Not Need to Change

### No-Bump Situations
- the maintenance is low-risk and local
- the change does not alter Website behavior, sample quality, or acceptance state in a meaningful way
- the change is purely wording, clarity, or a verified-safe micro-fix
- the change does not alter the project’s phase meaning or next-step posture

### Why These Can Stay on the Current Version
- they do not create a new milestone in the sample’s usefulness
- they do not change what future chats need to know about the project
- they are important maintenance, but not version-worthy maintenance

### Typical Examples
- doc wording correction
- a small checklist clarification
- a narrow behavior-preserving fix that does not change acceptance posture

### Rule of Thumb
- If the change would not change the answer to “Has Website reached a new meaningful maintenance milestone?”, the version probably does not need to change.

---

## 3. When Version Should Be Considered for a Bump

### Bump-Worthy Situations
- the maintenance materially improves the Website stable sample
- the maintenance changes the acceptance posture or long-term maintainability in a meaningful way
- the maintenance produces a new documented maintenance milestone that should be visible in the project’s version history
- the maintenance changes what future chats should think of as the current state of the sample

### Why These Deserve Version Attention
- they are more than cosmetic changes
- they alter the project’s maintenance story even if the overall product direction does not change
- they deserve a clear marker so future chats do not understate the significance of the change

### What to Record as a Version-Change Candidate
- sample quality improvements that matter
- acceptance or stability posture improvements that matter
- a maintenance milestone that future chats should treat as distinct
- a long-term maintenance refinement that changes the project’s operational story

---

## 4. Version Bump vs Memory / Handoff

### When Not Bumping But Still Updating Memory
- the project boundary or hold position changes without creating a version-worthy milestone
- a maintenance change is meaningful for future chats but not big enough to warrant a version bump
- the project conclusion or handoff wording changes, but the sample itself is still on the same version path

### When a Version Bump Should Also Sync Memory / Handoff
- the maintenance creates a meaningful new sample state
- the maintenance changes the project’s current status or next-step action
- the maintenance affects how future chats should read the project boundary
- the maintenance is important enough that not syncing memory would leave future chats outdated

### How to Decide Whether Version Bump Should Pull `02` / `03` / `04` With It
- If the bump reflects a new maintenance milestone, update `02_completed_work.md`.
- If the bump changes the next planned posture, update `03_next_phase_plan.md`.
- If the bump changes the risk interpretation, update `04_risks_issues.md`.
- If the bump changes future-chat instructions, update `05_handoff_for_new_chat.md`.

### Memory Sync Patterns That Often Accompany a Bump
- `01_project_status.md` when the current status label or sample standing changes
- `02_completed_work.md` when the maintained sample is now materially different in a way worth recording
- `03_next_phase_plan.md` when the next action or future condition shifts
- `04_risks_issues.md` when the meaning of the risks changes
- `05_handoff_for_new_chat.md` when the new version changes what future chats must do first

---

## 5. How to Decide Whether a Bump Is Worth It

### Bump If
- the maintenance creates a real milestone in the Website sample’s life
- the change materially improves the sample’s quality, stability, or maintainability
- future chats should recognize the sample as having reached a new maintenance state

### Do Not Bump If
- the change is only local cleanup
- the change is purely clarifying documentation
- the change is a verified-safe micro-fix without meaningful state change
- the change would add version noise without adding version meaning

### When to Reassess
- if the maintenance feels bigger than a normal tweak but smaller than a product-level change
- if the change improves the sample in a way that future chats should not ignore
- if the maintenance result would be confusing to describe without a new version marker

---

## 6. Conclusion

### Should Website Still Be the First Priority Protection Object?
- Yes.

### Is Telegram Still on Hold?
- Yes.

### Should Memory Be Updated Right Now?
- Not by default for this document-only step.

### Should Version Be Upgraded Right Now?
- No. Keep `Pro_v1.05`.

### Current Unique Priority Action
- Preserve the Website stable sample and keep Telegram held.
