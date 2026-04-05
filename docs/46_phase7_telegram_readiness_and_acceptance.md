# Phase 7 Telegram Readiness and Acceptance

## 1. Start Preconditions for Minimal Real Telegram Integration

Before real Telegram development begins, the following must already be prepared:

### Required Information
- Telegram bot identity and intended channel scope
- Target update type for the first loop, likely plain text messages
- Expected session identity mapping rules
- Expected sender identity mapping rules
- Expected fallback behavior for parse/send failures
- Minimal acceptance scenario for valid and invalid requests

### Required Accounts / Permissions / Configuration
- Telegram bot token available and valid
- Telegram bot platform ownership or administrative access confirmed
- Webhook or update delivery configuration plan confirmed
- Token storage / secret handling location confirmed
- Any required environment variables or deployment secrets identified

### Required System-Level Dependencies
- Unified inbound model remains the shared contract
- Unified response and send result contracts remain unchanged
- Trace / observability fields remain available
- Persistence / migration path is understood before live state is expanded
- Website stable sample remains untouched

### Cannot Start If These Are Missing
- Bot token is not ready
- Platform auth plan is not ready
- Transport semantics are not defined
- Session mapping is not defined
- Sender mapping is not defined
- Fallback behavior is not defined
- Acceptance criteria are not defined
- Website stable sample would need to be modified to proceed

---

## 2. Definition of Done for Minimal Real Telegram Integration

### What Counts as Complete
The minimal real Telegram loop is complete only when all of the following are true:
- Telegram inbound update is received through the real channel path
- Telegram inbound is mapped into `UnifiedInboundMessage`
- The unified pipeline processes the message
- A `UnifiedResponse` is produced
- Telegram outbound mapping is created from the unified response
- Telegram sender boundary returns a `UnifiedSendResult`
- A failure path returns a safe fallback or failure result
- Valid and invalid paths are both reproducible
- Website stable sample is not broken

### What Must Not Be Misread as Complete
- Mock / placeholder adapter work
- Skeleton-only documentation
- Planning-only contract notes
- A code path that compiles but cannot receive real Telegram updates
- A sender stub that never actually records a real send result
- A change that only works by disturbing Website behavior

### Boundary With Mock / Skeleton / Planning
- **Planning**: describes the intended shape only
- **Skeleton**: structural placeholder, no live Telegram connectivity
- **Mock**: simulated closed loop, not real platform integration
- **Minimal real integration**: actual Telegram update path with real inbound and outbound handling

---

## 3. Acceptance Checklist for Minimal Real Telegram Integration

### Inbound
- A real Telegram update is received
- Required fields are present or safely rejected
- Parsing does not silently fail

### UnifiedInboundMessage Mapping
- Telegram payload is mapped into `UnifiedInboundMessage`
- Channel identity is set correctly
- Session identity is stable
- Text content is preserved
- Timestamp / trace identifiers are handled as designed

### Pipeline
- The message enters the unified pipeline
- Pipeline produces a valid response or controlled failure
- No channel-private logic leaks into the core

### Outbound Mapping
- `UnifiedResponse` is converted into Telegram sender payload
- Output shape is valid for Telegram transport
- No Telegram-specific behavior breaks shared contracts

### Sender
- Telegram sender boundary exists and is exercised
- Sender returns success or failure in a unified format
- Provider message id is recorded if available

### UnifiedSendResult
- A minimal send result record exists
- Status, retryable flag, timestamps, and trace identifiers are present where possible

### Fallback
- Invalid inbound data produces a safe fallback or failure path
- Send failure produces a safe unified failure result
- Internal exception details are not exposed as success

### Website Stability
- The Website stable sample remains functional
- Website acceptance behavior is unchanged
- No regression is introduced in the first real channel

---

## 4. Pre-Implementation Risk Check List

### Scope Drift Risk
- Are we accidentally moving into WhatsApp / Messenger / Line / Zalo?
- Are we introducing e-commerce, payment, ERP, or complex sales logic?
- Are we adding unnecessary Telegram features too early?

### Architecture Drift Risk
- Are Telegram-private fields leaking into shared contracts?
- Are we changing the unified pipeline just for Telegram?
- Are we weakening the standardized inbound/outbound shape?

### Website Regression Risk
- Does any Telegram change affect the Website stable sample?
- Are shared contracts still compatible with the existing Website path?
- Does the new work alter the reference behavior of the first real channel?

### Platform / Auth Risk
- Is the bot token valid and securely handled?
- Is platform authentication defined before implementation starts?
- Is transport/retry behavior understood?

### Observability Risk
- Do we have minimal request / trace / result visibility?
- Can success and failure be distinguished?
- Can we reproduce the path for debugging?

### Persistence Risk
- Is the storage path for live Telegram state understood?
- Are migration implications known before the channel goes live?

---

## 5. Minimal Execution Order When Real Telegram Development Starts

### Step 1: Lock the Telegram contract boundaries
Define:
- inbound shape
- session key rule
- sender identity rule
- supported message types
- failure / fallback behavior

**Why first:** this prevents Telegram-specific ambiguity from contaminating the shared core.

### Step 2: Build the thin Telegram intake and outbound adapters
Implement:
- webhook/update intake boundary
- mapping into `UnifiedInboundMessage`
- outbound mapping from `UnifiedResponse`
- unified send result recording

**Why second:** this creates the first live channel path while keeping the rest of the system stable.

### Step 3: Add minimal observability and failure handling
Confirm:
- trace visibility
- failure classification
- fallback behavior
- reproducible valid and invalid paths

**Why third:** observability is needed to verify the new channel without guesswork.

### Step 4: Run acceptance checks against the Website baseline
Confirm:
- Telegram works
- Website still works
- shared contracts remain intact
- no scope drift occurred

**Why fourth:** the first real channel must remain the anchor reference while the second channel is introduced.

---

## 6. Conclusion

### Ready to Discuss Real Telegram Development?
Not yet in the implementation sense. The project is ready to discuss the path and criteria, but not ready to start real Telegram code work until the listed preconditions are met.

### What Is Still Missing
- Real bot token / auth readiness
- Transport semantics confirmation
- Session and sender mapping finalization
- Persistence and migration clarity
- A concrete implementation kickoff decision that does not disturb the Website sample

### Next Unique Priority Action
Keep Telegram in readiness/planning mode, preserve the Website stable sample, and do not start real Telegram development until all preconditions are explicitly satisfied.