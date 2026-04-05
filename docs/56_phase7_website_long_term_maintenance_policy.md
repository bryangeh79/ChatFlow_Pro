# Phase 7 Website Long Term Maintenance Policy

## 1. Website Long-Term Maintenance Goal

### Why Website Needs a Long-Term Maintenance Policy
- Website is the first real stable sample in Phase 7.
- It is the reference channel for acceptance and regression checks.
- It is the anchor that future work must not casually disturb.

### Why Stability Comes Before Convenience
- A stable sample is worth more than a cleaner-looking change that risks regression.
- "Nice to have" improvements should never outrank preserving the working baseline.
- If a change is not clearly needed, it should not be forced into the sample.

### Why We Must Not Rebuild for Hypothetical Future Needs
- Future second-channel needs are still hypothetical until the relevant gates are satisfied.
- Rebuilding Website early would trade a proven baseline for speculative flexibility.
- The safer path is to keep the sample intact and only adjust when a verified need exists.

---

## 2. Normal Website Maintenance Allowed Range

### What Counts as Normal Maintenance
- small wording fixes in docs that describe the existing Website chain
- low-risk consistency corrections that do not change behavior
- small internal cleanup that keeps the same contract and output
- minor stability fixes that do not alter the Website success/failure path

### What Counts as Low-Risk Correction
- fixing a typo in labels, comments, or docs
- clarifying an existing mapping explanation
- aligning a status note with observed behavior without changing code
- small, proven-safe adjustments that preserve the current sample behavior

### What Counts as Acceptable Small Optimization
- a tiny, local improvement that does not touch the shared contract shape
- a harmless readability improvement that does not alter runtime behavior
- a non-functional refactor that leaves the observed Website path unchanged

### How to Handle Normal Maintenance
- keep changes narrow
- verify the Website path still behaves the same
- avoid widening the change set just because the edit is already open
- if uncertainty appears, stop and re-check the Website baseline first

---

## 3. High-Risk Website Maintenance Situations

### What Counts as High Risk
- any change to the real Website inbound entry handling
- any change to Website parse behavior
- any change to `UnifiedInboundMessage` mapping
- any change to outbound mapping or sender behavior
- any change to `UnifiedSendResult` semantics
- any change to fallback behavior

### What Can Easily Introduce Regression
- touching shared contracts while trying to help Telegram later
- “cleaning up” the Website chain because the structure looks imperfect
- changing Website behavior to make future channels easier
- broad refactors that are not strictly necessary for current stability

### What Must Trigger Extra Caution
- any change that affects core success/failure flow
- any change that affects the first real sample’s observed behavior
- any change that touches the regression-sensitive areas documented in Phase 7

### What Must Be Reviewed Before High-Risk Maintenance
- `48_phase7_website_stable_template_protection.md`
- `52_phase7_website_regression_priority_for_second_channel.md`
- `55_phase7_final_hold_position_summary.md`
- and, when the change is broader, the second-channel minimal-change / isolation / gate docs

---

## 4. Maintenance Pre-Check Principles

### When to Review `48`, `52`, and `55`
- before any change that might affect the real Website chain
- before any change that touches shared model, pipeline, sender, or fallback behavior
- before any change that could be mistaken as "just a small improvement" but actually shifts the baseline

### When to Review `50`, `51`, `53`, and `54` Together With Them
- when the change is related to second-channel reasoning
- when the change may be influenced by Telegram future work
- when the change may touch shared layers or regression-sensitive areas
- when there is any chance the edit could be interpreted as preparing the system for Telegram

### How to Judge Whether Maintenance Has Crossed the Normal Boundary
Ask:
- Does this change alter the observed Website chain?
- Does this change affect shared contracts or semantics?
- Would this change be necessary if Telegram did not exist?
- Is this change being justified by future work instead of current Website stability?

If the answer points toward future convenience over current stability, the change has likely crossed the normal maintenance boundary.

---

## 5. Long-Term Maintenance Conclusion

### Should Website Still Be the First Priority Protection Object?
- Yes.

### Is Telegram Still on Hold?
- Yes.

### Should Memory Be Updated?
- Not required for this document-only step.

### Should Version Be Upgraded?
- No. Keep `Pro_v1.05`.

### Current Unique Priority Action
- Preserve the Website stable sample and keep Telegram held.
