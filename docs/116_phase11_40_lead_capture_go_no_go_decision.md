# Phase 11.40 Lead Capture Go / No-Go Decision

## Decision

Choose **A. Enter the first minimal real lead capture implementation now**.

## Why

The lead capture first-cut design is now sufficiently complete:

- mount layer is defined
- minimal fields are defined
- trigger signals are defined
- minimal output contract is defined
- pipeline consumption boundary is defined
- session update limit is defined
- verification standard is defined
- shared Telegram / Website path is defined

There is no missing minimum prerequisite that should block a first implementation cut.

## First Cut Layer

The first cut must begin at the **shared lead capture hook / resolver boundary inside the unified inbound pipeline**.

It must not begin in webhook handlers.

## First Cut Allowed Scope

The first cut may implement only:

- explicit contact intent / explicit contact info detection
- minimal fields: name / phone / email
- minimal result states: none / partial / captured
- minimal shared pipeline consumption
- minimal lead_capture_state updates
- minimal shared verification / evidence points

## First Cut Not Allowed

The first cut must not implement:

- state machine behavior
- ownership / assignment / workflow semantics
- handoff integration
- menu / command system
- clarification loop engine
- webhook contract changes
- channel-specific lead capture branches

## Current Conclusion

Lead capture is ready for the first minimal real implementation cut, and that cut must stay narrowly bounded to the shared hook / resolver path.