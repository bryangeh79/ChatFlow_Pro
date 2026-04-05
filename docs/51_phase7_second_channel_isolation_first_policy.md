# Phase 7 Second Channel Isolation First Policy

## 1. Why Second-Channel Work Should Start in Isolation

### Why We Should Not Touch Shared Layers First
- Website is already the first real stable sample.
- If shared layers are changed first, the only real reference point becomes unstable too early.
- Isolating the second channel first reduces the chance of breaking the baseline.

### Why Isolation Protects Website Best
- Telegram-specific work stays at the edge and does not immediately disturb the core.
- The Website chain remains the control sample while the new channel proves itself.
- If the isolated Telegram path fails, the damage is limited.

### Why Local Proof Is Better Than Global Abstraction Early
- Proving Telegram locally first gives a concrete signal that the channel really works.
- Global abstraction too early often means abstracting guesses instead of facts.
- The safest path is to make one channel work in a narrow way before deciding whether the shared core needs any change.

---

## 2. Definition of the Isolation-First Strategy

### What Isolation Means
- keep Telegram-specific logic at the adapter edge
- do not push Telegram quirks into shared contracts immediately
- build a narrow intake/output path first
- keep Website untouched while Telegram is being proven

### What Over-Shared / Premature Sharing Means
- moving Telegram requirements into the shared model before they are validated
- redesigning the pipeline to satisfy a second channel too early
- treating one channel's convenience as a reason to reshape the entire platform

### What "Local First, Shared Later" Means
- first prove Telegram can map into and out of the shared contracts from its own isolated edge
- then evaluate whether any shared change is truly necessary
- only after that, consider a tiny shared adjustment, and only if the evidence is strong

### Correct Order vs Wrong Order
- Correct: isolate → attach → validate → only then consider shared change
- Wrong: redesign shared core → hope Telegram fits → fix regressions later

---

## 3. Recommended Future Telegram Implementation Sequence

### Step 1: Build the isolated Telegram edge
- intake boundary
- outbound boundary
- Telegram-specific mapping only at the edge

**Why first:** it proves the channel can be handled without changing the baseline.

### Step 2: Validate Telegram locally against the shared contracts
- confirm mapping into the shared inbound model
- confirm response mapping back out
- confirm success and failure behavior

**Why second:** it shows whether Telegram can live with the existing shared shape.

### Step 3: Compare Telegram behavior with the Website baseline
- ensure Website still works unchanged
- ensure Telegram behavior does not force an immediate shared rewrite

**Why third:** Website is the reference sample, so any new work must respect it.

### Step 4: Only if needed, make a tiny shared-layer adjustment
- change the shared layer only if the isolated Telegram proof shows a true need
- keep the change as small as possible

**Why fourth:** shared changes should be the last resort, not the starting assumption.

---

## 4. When Shared Layer Adjustment Is Allowed

### Allowed Only After These Conditions
- Telegram edge is already working in isolation
- the need for a shared change is proven, not assumed
- the proposed change will not break Website
- the change has a clear regression-check path

### When to Keep It Local Instead
- if the issue can be solved by a thin adapter
- if the issue is Telegram-only and does not belong in the core
- if touching shared layers would create avoidable regression risk

### High-Risk Shared Changes
- model reshaping
- pipeline redesign
- sender contract rewrite
- fallback semantic changes
- trace / observability shape changes

### Shared Changes That Need Website Regression Checks First
- anything that affects the unified inbound path
- anything that affects the response or send-result contract
- anything that changes shared fallback behavior
- anything that could alter the first real channel's observed behavior

---

## 5. Relationship to Website Protection

### Why Isolation First Is Really Website Protection
- it keeps the working sample safe while Telegram is being proven
- it prevents accidental baseline drift
- it ensures the first real channel remains the arbiter of correctness

### How to Tell If a Change Has Gone Too Far
Ask:
- Did this change require altering Website to make Telegram easier?
- Did this change broaden the shared core before the Telegram edge was proven?
- Did this change make the reference sample less stable?

If yes, the change has likely crossed the line.

### If Telegram Needs Something That Conflicts With Website
- Website stability wins.
- Telegram should adapt locally first.
- Shared changes should be considered only after the isolated path proves the requirement is unavoidable.

---

## 6. Conclusion

### Should We Remain in Documentation / Readiness Mode Now?
- Yes.

### If Telegram Implementation Starts Later, What Strategy Should Be Used?
- Isolation first, then attach, then validate, then consider a tiny shared adjustment only if necessary.

### Should Memory Be Updated?
- Not required for this document-only step.

### Should Version Be Upgraded?
- No. Keep `Pro_v1.05`.
