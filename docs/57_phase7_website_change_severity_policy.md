# Phase 7 Website Change Severity Policy

## 1. Why Website Changes Need Severity Levels

### Why Not Treat Every Change the Same
- Website is the first real stable sample in Phase 7.
- A tiny typo fix and a behavior-changing refactor do not carry the same risk.
- Lumping all changes together makes it too easy to accidentally disturb the baseline.

### Why Severity Levels Protect the Stable Sample
- Severity levels force a more careful review before anything touches the sample.
- They make it easier to choose the right amount of checking for the right kind of change.
- They reduce the chance of overreacting to harmless edits or underestimating risky ones.

### Why Graded Review Is Better Than Pure Guesswork
- “Looks small” is not a reliable safety test.
- A severity rule gives a consistent way to judge maintenance instead of depending on mood or memory.
- The goal is to keep Website stable while still allowing necessary maintenance.

---

## 2. Low-Risk Website Changes

### What Counts as Low Risk
- doc wording corrections that do not alter meaning
- label or comment fixes that do not affect runtime behavior
- small clarity improvements in documentation
- harmless internal cleanup that does not touch the observed Website chain
- proven-safe micro-adjustments that do not alter contracts or outputs

### Low-Risk Handling Principle
- keep the change narrow
- avoid bundling extra items into the same edit
- verify the Website sample still behaves the same after the change

### Minimum Checks Before and After
- confirm the change does not touch the real Website chain
- confirm the website path still works as before
- confirm no shared contract, sender, or fallback semantics changed
- confirm docs still match the observed sample behavior

### Low-Risk Rule of Thumb
- If the change is only about clarity, wording, or a verified-safe micro-fix, it is low risk.

---

## 3. Medium-Risk Website Changes

### What Counts as Medium Risk
- small code adjustments that touch Website-adjacent behavior but do not intend to redesign the flow
- limited refactors that remain within the Website sample boundary
- changes that touch shared-shaped code but are intended to be behavior-preserving
- maintenance that could affect the sample if handled carelessly

### Why Medium Risk Needs Extra Review
- these changes are not obviously dangerous, but they can still break the stable sample if a small assumption is wrong.
- they often look "safe enough" while touching the exact areas that matter most.

### What to Review Before a Medium-Risk Change
- `48_phase7_website_stable_template_protection.md`
- `52_phase7_website_regression_priority_for_second_channel.md`
- `55_phase7_final_hold_position_summary.md`
- `56_phase7_website_long_term_maintenance_policy.md`

### What to Check After a Medium-Risk Change
- Website webhook / entry still works
- parse still works
- `UnifiedInboundMessage` shape is unchanged
- pipeline behavior is unchanged
- outbound mapping and sender behavior are unchanged
- `UnifiedSendResult` still records correctly
- fallback still behaves safely
- docs still match the observed chain

---

## 4. High-Risk Website Changes

### What Counts as High Risk
- any change to real Website entry handling
- any change to parse logic or contract mapping
- any change to shared model, pipeline, response, sender, or fallback semantics
- any change that could alter the reference sample’s observed behavior
- any change that is being justified by future Telegram convenience rather than current Website need

### Why These Are High Risk
- they touch the exact points that define the sample.
- they can silently turn a working reference into an unreliable one.
- they are easy to under-estimate because they may appear to be “just cleanup.”

### What Must Be Done Before High-Risk Changes
- review the Website protection and regression priority docs
- review the final hold-position summary
- review the long-term maintenance policy
- if the change is second-channel-adjacent, also review the minimal-change, isolation-first, regression-priority, change-gate, document-map, and hold-position docs

### When to Pause Instead of Proceed
- if the change exists mainly to make future Telegram work easier
- if the change is hard to prove as needed for current Website stability
- if the change would alter shared contracts or the sample chain
- if the change would be safer as a separate, smaller maintenance item

---

## 5. How to Execute by Severity

### Low Risk
- make the change directly, but keep it narrow
- do a minimal sanity check on the Website sample
- do not widen scope just because the change is simple

### Medium Risk
- review the protection, regression, hold-position, and maintenance policies first
- make the change in a contained way
- run a focused Website regression check after the change

### High Risk
- do not proceed casually
- re-check whether the change is truly required now
- review the broader Phase 7 document set if the change is second-channel-adjacent
- pause if the change threatens the stable sample or looks like future-proofing rather than maintenance

### When to Reassess the Boundary
- when a maintenance task stops being clearly about preserving Website
- when the change starts to affect shared contracts or sample behavior
- when the justification shifts from current stability to future convenience

---

## 6. Conclusion

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
