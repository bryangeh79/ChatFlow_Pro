# 22 Handoff Trigger Rules

## Minimal Trigger Rules
The current handoff trigger logic is intentionally simple and replaceable.

### Rule 1: User Requests Human
- Trigger when the message contains a human-request signal.
- Example placeholder keywords: human, agent, staff, handoff, 人工, 客服, 真人, 转人工.

### Rule 2: System Rule Requires Human
- Trigger when the runtime marks the conversation as needing human attention.
- This can be a placeholder check such as unsupported input, repeated fallback, or low-confidence handling.

## What These Rules Are
- Simple
- Explainable
- Easy to replace later

## What They Are Not
- Final policy
- Automatic decision engine
- Advanced support routing logic
