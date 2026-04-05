# Phase 11.11 Unified Inbound Intent Dispatch Placeholder

## 1. Status

A minimal intent preparation / dispatch placeholder layer has been placed beside the unified inbound pipeline.

## 2. Current Inputs and Outputs

### Intent preparation

Input:

- `UnifiedInboundMessage`
- `UnifiedSessionContext`

Output:

- `intent: 'unknown'`
- `confidence: 0`
- `signals: []`

### Dispatch placeholder

Input:

- `UnifiedIntentPreparationResult`

Output:

- `nextStage: 'pass-through'`
- `capability: 'none'`

## 3. Boundary

The placeholder layer is intentionally passive.

It does not implement:

- FAQ logic
- lead capture logic
- handoff logic
- menu logic
- command logic
- state machine logic
- multi-turn logic

## 4. Baseline Protection

The following remain protected:

- `POST /webhooks/telegram`
- `POST /webhooks/website`
- 200 response behavior
- visible regression fields
- independent channel behavior

## 5. Current Result

This is a no-op / pass-through skeleton only.
It exists to define the next layer boundary without changing existing runtime behavior.