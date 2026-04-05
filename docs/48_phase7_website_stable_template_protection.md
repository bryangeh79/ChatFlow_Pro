# Phase 7 Website Stable Template Protection

## 1. Website Sample Status

### Why Website Is the First Real Stable Sample
- Website is the first channel that completed a real closed loop in Phase 7.
- It is acceptance-ready, reproducible, and already stabilized as the reference sample.
- It is the only channel currently carrying real milestone weight.

### Why Website Has Template Meaning Now
- It shows the shared runtime contracts work in real use.
- It provides the known-good path future channels should copy.
- It defines the baseline for acceptance and regression checks.

### Why Future Channels Must Follow It
- Later channels should be adapted from this sample, not used to redesign it.
- If a second channel requires changing Website behavior, the project loses its reference anchor.

---

## 2. Website Reusable Layers

### Shared Layers That Can Continue to Be Reused
- `UnifiedInboundMessage`
- `UnifiedSessionContext`
- unified inbound pipeline
- `UnifiedResponse`
- outbound mapping layer
- sender boundary
- `UnifiedSendResult`
- fallback policy
- trace / observability placeholders
- language/session/runtime behavior already established

### Reusable Design Ideas
- normalize inbound once, then route through the unified core
- keep channel-specific behavior at the edge
- let sender and result handling stay contract-driven
- keep fallback behavior consistent across channels

### Shared Capability vs Website-Private Logic
- Shared capability: model, pipeline, response, sender, fallback, trace
- Website-private logic: only the Website-specific intake/output boundary and any Website transport details

---

## 3. Website Protection Red Lines

### Modules That Must Not Be Casually Changed for Telegram
- Website real webhook / entry handling
- Website inbound parsing path
- Website mapping into `UnifiedInboundMessage`
- Website outbound mapping and sender path
- Website `UnifiedSendResult` semantics
- Website fallback behavior

### Changes That Can Cause Regression Risk
- altering shared contracts without regression checks
- introducing Telegram-specific fields into the shared core
- changing Website parsing behavior to suit Telegram transport
- weakening success/failure visibility
- changing trace or fallback semantics in a way that affects the first real channel

### Changes That Require Verification Before Approval
- any shared model change
- any shared pipeline change
- any outbound/result contract change
- any fallback policy change
- any observability/trace shape change

### What Counts as Breaking the Stable Sample
- the Website success path stops reproducing reliably
- the Website failure path stops failing safely
- Website output behavior changes without a deliberate acceptance decision
- Website documentation no longer matches the actual chain

---

## 4. Protection Principles for Future Telegram Work

### Best Approach: Isolate, Then Attach, Then Verify
- Keep Telegram work at the edge.
- Keep the shared core unchanged unless a verified shared improvement is needed.
- Verify Telegram changes against the Website baseline before considering them complete.

### Good Practices
- build Telegram as a thin adapter, not a second architecture
- preserve the Website reference path exactly as accepted
- use contract-based mapping instead of ad hoc channel logic
- check both success and failure paths against the Website baseline

### Practices Most Likely to Cause Rework
- changing shared contracts too early
- pulling Telegram-specific transport rules into the core
- editing Website behavior just to simplify Telegram implementation
- skipping regression checks because the code "looks aligned"

---

## 5. Website Regression Minimum Check List

If any second-channel work is started later, the following should be checked at minimum:

### Inbound
- Website webhook entry still receives requests
- Website parsing still succeeds on valid input
- invalid input still fails safely

### UnifiedInboundMessage
- Website still maps to the same shared inbound shape
- required fields remain stable
- no Telegram-only fields leak into the shared message

### Pipeline
- Website still enters the unified pipeline
- pipeline output remains consistent
- shared processing still behaves as expected

### Outbound Mapping
- Website response mapping still produces valid payloads
- output shape still matches the baseline sample

### Sender
- Website sender still returns the expected success/failure behavior
- no transport changes silently altered the result contract

### UnifiedSendResult
- success record still appears correctly
- failure record still appears correctly
- retryable/fallback metadata is still meaningful

### Fallback
- Website failure still routes to safe fallback behavior
- no internal exception text becomes a false success

### Documentation Consistency
- docs still match actual behavior
- acceptance guidance still matches the observed chain
- channel readiness documents still preserve the Website-first boundary

---

## 6. Conclusion

### Should Website Continue to Be the Priority Protection Target?
- Yes.

### Current Unique Priority Action
- Preserve the Website stable template and keep Telegram in planning/readiness/documentation only.

### Should Memory Be Updated?
- Not required for this document-only step.

### Should Version Be Upgraded?
- No. Keep `Pro_v1.05`.
