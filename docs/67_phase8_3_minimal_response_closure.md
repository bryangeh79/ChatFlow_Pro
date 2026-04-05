# Phase 8.3 Minimal Telegram Response Closure

## Purpose

This step closes the smallest possible Telegram response path:

- Telegram inbound enters the unified inbound flow
- unified response is produced
- Telegram outbound payload is mapped
- Telegram sender returns a minimal send result
- Website baseline remains the reference sample

## What Is Included

- Telegram response mapping via `mapTelegramOutboundPayload`
- Telegram sender reuse through the existing outbound sender boundary
- trace/debug metadata propagation at the minimal level
- verification hook that exercises both Telegram and Website inbound paths

## What Is Not Included

- full bot command handling
- menu / keyboard / state machine expansion
- Telegram-specific shared core redesign
- Website behavior changes
- multi-channel refactor

## Verification

Use the minimal verification hook and confirm:
- Telegram `ok: true`
- Telegram `response.channel === 'telegram'`
- Telegram send result channel is `telegram`
- Website `ok: true`
- Website response channel remains `website`

## Safety Rule

If Website regression is observed, stop and do not continue expanding Telegram features until the baseline is restored.
