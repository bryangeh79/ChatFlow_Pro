# Phase 7 Website Minimal Real Integration Plan

## 1) Real Webhook Integration
### Goal
Receive a real Website event through a real webhook endpoint.

### Dependencies
- Existing unified inbound contract
- Existing Website adapter skeleton
- Existing unified pipeline skeleton
- Existing error and trace scaffolding

### Layers Touched
- adapter
- types
- errors
- pipeline entry

### Completion Mark
- A real Website event can reach the system through a real webhook route.

### Risks
- Webhook payload shape mismatch
- Transport/auth mismatch
- Duplicate deliveries

## 2) Real Inbound Parsing
### Goal
Convert the real Website webhook payload into `UnifiedInboundMessage`.

### Dependencies
- Real webhook input
- Website raw inbound shape
- Unified inbound message type

### Layers Touched
- adapter
- types
- unified pipeline input

### Completion Mark
- Real inbound payload consistently becomes a valid unified message.

### Risks
- Missing required fields
- Unsupported message type
- Attachment shape drift

## 3) Real Outbound Sending
### Goal
Send a real Website response back to the browser/chat client.

### Dependencies
- UnifiedResponse contract
- Outbound mapping layer
- Sender interface layer

### Layers Touched
- outbound mapping
- sender
- types

### Completion Mark
- A real response can be sent back from the Website channel.

### Risks
- Delivery semantics mismatch
- Outbound mapping mismatch
- Transport failure

## 4) Real Error Fallback
### Goal
Return a safe fallback when parsing, pipeline, or sending fails.

### Dependencies
- Fallback policy
- Error structures
- Observability scaffolding

### Layers Touched
- errors
- sender
- outbound mapping
- pipeline

### Completion Mark
- Failures result in safe, traceable fallback behavior.

### Risks
- Leaking internal errors
- Incomplete recovery behavior
- Incorrect retryability flags

## 5) Minimal Acceptance Cases
### Goal
Prove the full Website loop works in both success and failure paths.

### Dependencies
- Real webhook
- Real inbound parsing
- Pipeline
- Outbound sending
- Fallback path

### Layers Touched
- all of the above in a minimal test path

### Completion Mark
- At least one success path and one failure path are validated.

### Risks
- Test setup too shallow
- False positives from mocks
- Missing failure branch coverage

## Recommended Execution Order
1. Real webhook integration
2. Real inbound parsing
3. Real outbound sending
4. Real error fallback
5. Minimal acceptance cases

### Why This Order
- Webhook is the entry gate; without it, nothing is real.
- Parsing comes next because the payload must become the unified model before anything else can work.
- Outbound sending comes after we know we can receive and normalize correctly.
- Error fallback is then validated against actual failure points.
- Acceptance cases come last because they need the full path to exist.

### Critical Bottleneck
- The key closure point is **real inbound parsing into the unified model**.
- If this fails, pipeline, outbound, and acceptance validation all become unstable.

## First-Scope Boundary
### Included
- Real webhook
- Real inbound parsing
- Real outbound
- Real sending semantics
- Minimal error handling

### Excluded
- Multi-channel real rollout
- Large database expansion
- Large backend work
- Complex permission system
- Complex retry system
- Production-grade monitoring system
- Cross-channel orchestration

## Minimal Acceptance Plan
### Success Example
1. A real Website message arrives.
2. Webhook receives it.
3. Adapter converts it into `UnifiedInboundMessage`.
4. Unified pipeline produces `UnifiedResponse`.
5. Sender returns a successful outbound result.

### Failure Example
1. A real Website message arrives with a malformed field.
2. Webhook receives it.
3. Adapter/parser fails safely.
4. Error handling creates a safe fallback response.
5. No internal exception is exposed to the user.

### Validation Points
- Webhook reception confirmed
- Unified message model confirmed
- Pipeline output confirmed
- Outbound delivery confirmed
- Fallback behavior confirmed
