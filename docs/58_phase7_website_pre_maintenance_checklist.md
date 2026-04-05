# Phase 7 Website Pre-Maintenance Checklist

## 1. Why a Pre-Maintenance Checklist Is Needed

### Why We Cannot Just Start Editing
- Website is the first real stable sample in Phase 7.
- Any change can accidentally touch the reference chain.
- A fixed checklist slows us down in the right way: it prevents casual edits from becoming regressions.

### Why a Checklist Protects the Stable Sample
- It forces a deliberate pause before the change begins.
- It ensures the maintenance request is actually about Website and not about future second-channel convenience.
- It keeps the sample protected by making the check sequence consistent.

### Why It Reduces Regression Risk
- It catches boundary drift before code changes start.
- It helps identify whether the work is normal maintenance or something broader.
- It prevents “small fix” edits from becoming hidden flow changes.

---

## 2. Maintenance Check Sequence

### Step 1: Confirm This Is Actually Website Maintenance
Ask:
- Is the change about the existing Website sample?
- Is it needed for current stability or clarity?
- Would this exist even if Telegram did not exist?

If the answer points mainly to future Telegram convenience, stop and reclassify.

### Step 2: Classify the Change Severity
- Low risk
- Medium risk
- High risk

Use `57_phase7_website_change_severity_policy.md` to classify it.

### Step 3: Decide Which Review Docs Must Be Opened
- For all changes touching the Website sample or its documentation, review `48`, `52`, `55`, `56`, and `57`.
- If the change has any second-channel connection or could be interpreted that way, also review `50`, `51`, `53`, and `54`.

### Step 4: Check for Boundary Drift
Ask:
- Does the work touch webhook, parse, pipeline, outbound, sender, or fallback behavior?
- Does it alter shared contracts or behavior?
- Does it make the Website sample less clearly the reference?

### Step 5: Decide Whether the Work Can Continue
- If the answer is clearly safe, proceed with the appropriate severity handling.
- If not, stop and re-evaluate before changing anything.

---

## 3. Questions That Must Be Answered Before Editing

### Purpose
- What is the purpose of this change?
- What current issue is it solving?

### Scope
- How big is the change?
- Does it touch code, docs, or both?
- Does it stay within Website-only work?

### Risk
- Does it affect webhook / parse / pipeline / outbound / sender / fallback?
- Could it alter the observed Website chain?
- Could it introduce regression risk?

### Boundary
- Does it depend on Telegram future work?
- Does it overlap with second-channel preparation?
- Does it widen beyond normal Website maintenance?

### Decision
- Should this be done now?
- Should it be split into smaller maintenance?
- Should it be paused until the boundary is rechecked?

---

## 4. Blocker Conditions

### Stop Immediately If
- the change is not clearly about Website maintenance
- the change is really a second-channel workaround
- the change is likely to alter the real Website chain
- the change touches a regression-sensitive area without prior review
- the change would require broad contract or behavior changes
- the change is being justified by future convenience rather than current need

### Do Not Continue as “Normal Maintenance” If
- the change moves from wording / clarity into flow or contract changes
- the change expands to shared core behavior
- the change now needs second-channel docs just to proceed
- the change no longer looks like a small Website maintenance task

### This Is No Longer Simple Website Maintenance If
- the sample chain may change
- the change needs broader Phase 7 review to be safe
- the edit is more about architecture or future channel prep than current stability

---

## 5. What to Do After the Check

### If It Is Low Risk
- make the change narrowly
- do a minimal sanity check
- confirm the Website path still behaves the same

### If It Is Medium Risk
- review `48`, `52`, `55`, `56`, and `57`
- make the change in a contained way
- run a focused regression check after the change

### If It Is High Risk
- pause if possible
- re-check whether the change is truly required now
- review the broader Phase 7 chain if the change is second-channel-adjacent
- only proceed if the maintenance need is clearly justified and bounded

### If the Boundary Is Unclear
- stop
- re-evaluate the request
- return to the document boundary layer before touching Website

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
