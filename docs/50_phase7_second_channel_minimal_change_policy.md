# Phase 7 Second Channel Minimal Change Policy

## 1. Why Second-Channel Implementation Must Stay Minimal

### Why We Cannot Use Telegram as a Chance to Rebuild Everything
- Website is already the first real stable sample.
- The project does not need a fresh architecture rewrite just because a second channel is coming.
- Rebuilding the core now would risk breaking the only real baseline we have.

### Why We Cannot Chase a "Perfect" Big Architecture
- A larger cleanup may look elegant, but it usually creates unnecessary drift.
- The goal in Phase 7 is controlled expansion, not architectural vanity.
- Stability is more valuable than making the structure look ideal on paper.

### Why Stability Beats Structure Purism
- The first real channel already proved the shared contracts work.
- Future work should protect that proof, not disturb it.
- If a change is not needed to enable the second channel safely, it should not be forced.

---

## 2. Definition of Minimal Change

### What Counts as Minimal Change
- adding a thin Telegram adapter at the edge
- adding a small mapping layer where Telegram payloads meet the unified contract
- adding only the smallest needed sender translation for Telegram output
- adding only the smallest needed tests and docs for Telegram-specific behavior
- making only verified shared adjustments, and only if they are truly required by the new channel

### What Does Not Count as Minimal Change
- refactoring the whole pipeline because the second channel is being added
- redesigning shared models just to make them feel cleaner
- moving directories or reorganizing the repo for aesthetic reasons
- broad normalization rewrites that are not strictly needed
- expanding scope into unrelated channels or business domains

### Allowed Change Shape
- edge-first
- contract-preserving
- adapter-heavy, core-light
- verified in small increments

### High-Risk Expansion Shape
- broad shared-core edits
- multi-module cleanup drives
- opportunistic refactors
- scope creep disguised as architecture improvement

---

## 3. Allowed Scope for Second-Channel Implementation

### Reasonable Minimal Additions
- Telegram intake adapter
- Telegram outbound adapter
- Telegram payload mapping into the shared inbound/output contracts
- Telegram identity/session extraction where required at the edge
- small test coverage for Telegram valid/invalid paths

### Localized Abstraction That May Be Acceptable
- a very small helper if it removes duplication without changing the contract
- a thin wrapper if it preserves shared behavior and reduces edge complexity
- a tiny adapter function if it keeps Telegram-specific logic out of the core

### Shared Layers That Must Be Touched Carefully
- unified inbound model
- session context model
- pipeline contract
- response contract
- outbound sender boundary
- send result contract
- fallback policy
- observability / trace shape

### Changes to Avoid Unless Absolutely Necessary
- altering the contract shape just for convenience
- changing shared semantics because Telegram has a special case
- modifying Website behavior to shorten Telegram implementation time

---

## 4. Forbidden Ways to Implement the Second Channel

### Do Not Use Telegram as a Reason to
- rewrite the pipeline
- rewrite the unified model
- rewrite sender/mapping architecture broadly
- reorganize the project tree just because it feels cleaner
- widen the implementation into WhatsApp, Messenger, Line, Zalo, or any other channel early
- expand into payment, e-commerce, ERP, or complex closing flows

### Do Not Treat These as Acceptable
- "we are already here, so let's clean everything up"
- "while touching this, let's standardize all channels"
- "the code would look better if we refactor the core now"
- "we should future-proof by building for every channel at once"

These are usually the fastest route to delay and regression.

---

## 5. Website Priority and the Minimal Change Rule

### Why Website Is the Judge Line
- Website is the first real sample that already works.
- Any second-channel change must preserve its behavior.
- Website tells us whether the new work stayed disciplined or drifted too far.

### How to Decide If a Change Went Too Far
Ask:
- Did this change exist only because Telegram needed it?
- Did this change alter Website behavior?
- Did this change widen scope beyond the second channel?
- Could Telegram have been solved with a smaller edge-only change?

If the answer is yes to the wrong question, the change is probably too large.

### When Minimal Change and "Cleaner Architecture" Conflict
- Prefer minimal change.
- Prefer preserving the Website sample.
- Prefer shipping the second channel safely over making the design look perfect.

---

## 6. Conclusion

### Should We Still Stay in Documentation / Readiness Mode Right Now?
- Yes.

### If Telegram Implementation Eventually Starts, What Strategy Should Be Used?
- Edge-first, contract-preserving, minimal-increment, verified-at-each-step.

### Should Memory Be Updated?
- Not required for this document-only step.

### Should Version Be Upgraded?
- No. Keep `Pro_v1.05`.
