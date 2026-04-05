# Phase 11.27 FAQ Response / Outbound Path Confirmation

## 1. Status

The first minimal FAQ match result is already flowing through the unified inbound pipeline into the existing response candidate path.

## 2. Matched Behavior

When FAQ matches:

- the FAQ answer becomes the response candidate
- the response continues through the existing shared outbound mapping path
- the webhook boundary is unchanged

## 3. No-Match Behavior

When FAQ does not match:

- the flow stays passive
- the existing non-FAQ reply candidate remains in place
- the webhook boundary is unchanged

## 4. Shared Path

Telegram and Website continue to share the same pipeline and outbound path.

No separate channel FAQ branch is introduced.

## 5. Protected Baseline

The webhook baseline remains protected:

- `POST /webhooks/telegram`
- `POST /webhooks/website`
- 200 responses
- visible regression fields
- independent channel behavior