# Phase 7 Telegram Planning Baseline

## 1. Telegram Role in ChatFlow Pro

- Telegram is a formal supported channel in ChatFlow Pro.
- It belongs to the second-channel expansion path in Phase 7.
- It shares the same unified product backbone as Website:
  - `UnifiedInboundMessage`
  - `UnifiedSessionContext`
  - unified pipeline
  - `UnifiedResponse`
  - outbound sender boundary
  - `UnifiedSendResult`
  - fallback and trace scaffolding
- It differs from Website in transport and platform semantics:
  - Telegram is bot-based and platform-mediated.
  - Telegram message delivery and reply semantics are not the same as a browser webhook flow.
  - Telegram has platform authentication, bot token, chat identity, and update handling concerns.

### Allowed Scope in Pro Boundary

Telegram may be planned for:
- minimal inbound message capture
- mapping to the unified runtime contract
- minimal reply output
- minimal send result recording
- safe fallback behavior
- trace/observability alignment

### Explicitly Not Doing

- No real Telegram webhook implementation yet
- No Bot SDK integration yet
- No platform auth/token wiring yet
- No production-grade retry or delivery semantics yet
- No scope expansion into e-commerce, payments, ERP, or complex closing flows
- No change to Website as the stable sample template

---

## 2. Telegram Minimal Real Closed Loop Target

### Minimal Inbound Source

- Telegram bot updates delivered through a platform webhook or update transport.
- The first planned real input should be a simple text message update.

### Minimal Message Intake Form

- A Telegram update containing:
  - sender/chat identity
  - message text
  - timestamp
  - update identifier
- The intake layer should normalize this into the unified message shape.

### Mapping to `UnifiedInboundMessage`

- Telegram-specific payload fields should be mapped into:
  - channel = `telegram`
  - platform sender/chat identity
  - session/conversation identifier
  - text content
  - language if available, otherwise resolved later
  - timestamp
  - trace/request identifiers if available

### Minimal Reply Output Form

- A plain text reply is the first required output form.
- Rich media, keyboards, inline buttons, and advanced bot features are out of scope for the first real loop.

### Mapping to `UnifiedResponse` / Outbound Sender

- The Telegram reply should be produced as a unified response first.
- Then it should be mapped into a Telegram sender payload at the channel boundary.
- The sender should return a unified send result that records success or fallback/failure.

### Minimal Send Result Record

- status
- provider message id if available
- retryable flag
- sent/failed timestamp
- trace id
- request id
- message trace id

### Minimal Fallback Behavior

- If Telegram inbound parsing fails, return a safe fallback result.
- If sending fails, return a unified failure or fallback result.
- Never expose internal exception text as a false success.

---

## 3. Telegram and Website Reuse Relationship

### Layers That Can Be Reused Directly

- unified inbound model
- session context model
- pipeline entry contract
- unified response contract
- send result contract
- fallback policy
- trace/observability placeholders
- language/session behavior already established by the runtime

### Layers That Need Thin Adapters

- Telegram webhook/update intake adapter
- Telegram sender adapter
- Telegram payload mapping
- Telegram identity/session extraction
- Telegram-specific transport semantics handling

### Telegram-Specific Attention Points

- bot token and platform authentication
- update delivery semantics
- chat/user identity mapping
- message type boundaries
- retry and failure classification
- sender response normalization

### What Must Not Be Broken for Telegram

- Do not modify the stable Website chain to fit Telegram.
- Do not weaken the Website acceptance-ready sample.
- Do not replace shared contracts with Telegram-private logic.
- Do not introduce platform-specific drift into the unified core.

---

## 4. Telegram True Development Prerequisites

Before real Telegram development starts, the following must be available:

- webhook / bot token / platform auth plan
- transport semantics definition
- session identity rule
- sender identity rule
- message type boundary definition
- minimal observability mapping
- persistence / migration dependency clarity
- test and acceptance criteria

### Notes on Each Item

- **Webhook / bot token / platform auth**: required before live Telegram connectivity.
- **Transport semantics**: define how updates are received, acked, and retried.
- **Session identification**: define how chat/user/update data becomes a stable session key.
- **Sender identification**: define how outbound replies are attributed.
- **Message type boundary**: define what is supported in the first loop, likely text only.
- **Minimal observability**: trace id, request id, success/failure visibility.
- **Persistence / migration**: ensure the storage path is ready before expanding live channel state.
- **Testing / acceptance**: confirm valid and invalid request paths are reproducible.

---

## 5. Recommended Telegram Phase 7 Development Order

### Step 1
Define the Telegram planning contract:
- inbound shape
- session mapping
- sender mapping
- supported message types
- failure/fallback rules

### Step 2
Prepare a thin Telegram adapter plan:
- intake boundary
- outbound boundary
- unified contract mapping
- trace/result behavior

### Step 3
Only after the above is stable, begin real Telegram implementation.

### Why This Order Is the Safest

- It preserves the Website stable sample.
- It prevents Telegram transport details from leaking into the shared core.
- It reduces the chance of premature scope expansion.
- It keeps Phase 7 controlled: plan first, implement later.

---

## 6. Risk and Boundary Reminders

- Do not mistake structural closure for production-ready multi-channel completion.
- Do not over-expand scope while the first real channel is still the reference sample.
- Do not change the Website sample just to accommodate Telegram.
- Do not start WhatsApp, Messenger, Line, or Zalo real development early.
- Keep Telegram in planning mode until prerequisites are explicitly ready.

---

## Current Bottom Line

Telegram is the next planned formal channel, but only as a planning baseline in Phase 7. The Website stable sample remains the reference point and must not be disturbed before any real Telegram work begins.