# Phase 11.19 FAQ Real Capability Entry Conditions

## 1. Purpose

This note defines when it is worth moving from the frozen FAQ seed baseline into a real FAQ capability segment.

## 2. When It Is Worth Continuing

Only continue into a real FAQ capability segment if all of the following are true:

- FAQ is needed as a real, user-visible capability, not just a seed/reference layer
- the current shared seed set is no longer enough for the intended product behavior
- there is a clear reason to introduce real FAQ handling without changing webhook stability
- the next change can stay bounded to the shared pipeline and shared content source

## 3. Hard Boundaries Before Entering

Before any real FAQ work begins, the following must stay protected:

- `POST /webhooks/telegram` remains stable and returns `200`
- `POST /webhooks/website` remains stable and returns `200`
- message / session / response / outboundPayload / sendResult / provider_message_id / debug_steps remain visible and intact
- Telegram and Website continue sharing the same baseline architecture
- no menu system, command system, state machine, lead capture, or handoff expansion is introduced by accident

## 4. First Cut Location

If real FAQ capability is ever started, the first cut should land in the shared FAQ content source / resolver boundary, not in the webhook handlers.

That means the first real change should be made in the shared pipeline layer that already sits behind:

- intent preparation
- dispatch placeholder
- FAQ hook
- FAQ resolver
- shared FAQ content source

## 5. Single Recommendation

Do not enter a real FAQ capability segment yet unless there is a concrete need to move beyond the frozen sample seed baseline.

If that need appears, start at the shared content source / resolver boundary and keep Telegram / Website behavior stable.