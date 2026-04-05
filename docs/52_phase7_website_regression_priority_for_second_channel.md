# Phase 7 Website Regression Priority for Second Channel

## 1. Why Website Regression Checks Must Come First

### Why Website Is the Highest-Priority Protection Target
- Website is the first real stable sample in Phase 7.
- It is the only channel with a proven real closed loop.
- Any second-channel change must preserve this baseline before anything else.

### Why We Cannot Delay the Check Until Later
- If a second-channel change already broke Website, the project may continue in a damaged state for too long.
- Early regression detection prevents compounding errors.
- The first check should happen immediately after any meaningful second-channel change, not after a long chain of new work.

### Why the Order of Checks Must Be Explicit
- A vague checklist can hide the most important breakpoints.
- The order matters because some failures are direct stop signs while others are lower-risk observations.
- The regression path must start with the most critical entry and exit points.

---

## 2. Website Regression Priority Levels

### P0: Highest Priority Checks
These are the checks that can immediately invalidate the Website baseline:
- webhook entry
- parse
- `UnifiedInboundMessage`
- pipeline entry and output
- outbound mapping
- sender boundary
- `UnifiedSendResult`
- fallback behavior

**Why P0:** these are the core success/failure path components. If any of them break, Website is no longer the trusted reference sample.

### P1: High Priority Checks
These are important supporting checks that confirm the baseline remains healthy:
- trace / observability visibility
- timestamp / request / message trace consistency
- result classification and failure visibility
- response content shape consistency

**Why P1:** these do not replace the core path, but they help prove the path is still behaving as expected and can be diagnosed safely.

### P2: General Priority Checks
These are important for long-term maintainability, but they are not the first stop:
- documentation consistency
- acceptance guide alignment
- regression note updates
- reference sample commentary

**Why P2:** these are necessary to keep the project understandable, but they do not outrank the live behavior checks.

---

## 3. Recommended Website Regression Check Order

### Step 1: webhook entry
- confirm Website still receives requests as expected
- stop immediately if entry is broken

### Step 2: parse
- confirm valid input is parsed successfully
- stop immediately if parsing fails unexpectedly

### Step 3: `UnifiedInboundMessage`
- confirm the mapped shape still matches the shared contract
- stop immediately if the shared inbound contract is no longer stable

### Step 4: pipeline
- confirm the message still enters the unified pipeline
- confirm the pipeline still produces the expected behavior

### Step 5: outbound mapping
- confirm response mapping still creates a valid Website payload
- stop if output shape changes unexpectedly

### Step 6: sender
- confirm the sender boundary still behaves as expected
- stop if sending semantics changed unexpectedly

### Step 7: `UnifiedSendResult`
- confirm success/failure recording still appears correctly
- stop if result semantics are wrong or incomplete

### Step 8: fallback
- confirm invalid or failed paths still fail safely
- stop if failures become silent or misleading

### Step 9: documentation consistency
- confirm docs still match the observed behavior
- verify the baseline notes still describe the real chain

---

## 4. Hard Stop Conditions

If any of the following happen, do not continue pushing Telegram work forward:
- Website webhook entry fails
- Website parsing fails unexpectedly
- `UnifiedInboundMessage` shape changes in a way that breaks the baseline
- pipeline behavior changes in a way that affects the first real channel
- outbound mapping no longer produces the expected payload shape
- sender behavior no longer matches the known result semantics
- `UnifiedSendResult` no longer records the outcome clearly
- fallback no longer behaves safely
- documentation no longer matches actual behavior

These are hard blockers, not minor issues.

---

## 5. Relationship to Minimal Change and Isolation First

### Why Regression Priority Belongs With Minimal Change
- the smaller the change, the easier it is to detect impact early
- minimal change only works if the regression gate is strict
- if we allow broad changes without early Website checks, "minimal" becomes meaningless

### Why Isolation First Does Not Replace Regression Checks
- isolating Telegram reduces initial risk
- regression checks prove the baseline still survived
- isolation and regression are complementary, not alternatives

### How to Decide If a Change Has Gone Too Far
Ask:
- Did this change require a Website regression exception?
- Did this change skip any P0 check?
- Did this change alter the baseline while pretending to be local only?

If yes, the change likely crossed the line.

---

## 6. Conclusion

### Should We Remain in Documentation / Readiness Mode Now?
- Yes.

### If Telegram Implementation Starts Later, How Should Regression Checks Run?
- Run P0 first, then P1, then P2; stop immediately on any hard blocker.

### Should Memory Be Updated?
- Not required for this document-only step.

### Should Version Be Upgraded?
- No. Keep `Pro_v1.05`.
