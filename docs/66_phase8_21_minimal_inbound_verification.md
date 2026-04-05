# Phase 8.21 Minimal Inbound Verification

## Purpose

This verification entry exists to confirm the smallest safe step of Phase 8.21:

- Telegram inbound enters the unified inbound flow
- Website inbound still enters the original Website path
- The project has a reusable minimal verification hook before response closure work begins

## How to Use

Run the minimal verification entry and inspect the returned object.

Expected signals:
- Telegram result is `ok: true`
- Telegram `message.channel` is `telegram`
- Telegram `response.channel` is `telegram`
- Website result is `ok: true`
- Website `message.channel` is `website`
- Website `response.channel` is `website`

## Scope

This verification does not implement Telegram response sending.
This verification does not modify Website presentation behavior.
This verification does not expand into full bot functionality.
