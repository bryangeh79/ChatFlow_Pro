# Phase 9.4 Telegram Minimal Sender / Transport

## Purpose

This step advances Telegram one small but real notch beyond the minimal response closure:

- Telegram outbound still comes from the unified response
- Telegram sender now exposes a clearer minimal transport boundary
- send result reflects a more explicit transport step
- Website baseline remains untouched

## What Changed

- The minimal sender boundary now returns a clearer provider message id
- The transport step is visible in the send result debug steps
- Verification can observe the transport-like step for Telegram

## What Did Not Change

- No Telegram command system
- No menus or keyboards
- No richer interaction
- No user/admin联动
- No shared core redesign
- No Website behavior changes

## Verification Notes

The minimal verification hook should confirm:
- Telegram outbound payload still exists
- Telegram send result still returns successfully
- Telegram send result now exposes a transport-like step
- Website baseline still remains stable

## Safety Rule

If a future change requires shared contract reshaping or alters Website semantics, stop and reassess before proceeding.
