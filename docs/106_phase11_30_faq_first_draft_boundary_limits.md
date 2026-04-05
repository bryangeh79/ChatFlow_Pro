# Phase 11.30 FAQ First Draft Boundary Limits

## 1. Purpose

This note freezes what the first FAQ implementation actually supports, and what it does not support.

## 2. What This First Draft Supports

The first draft supports only the following FAQ match behaviors:

- exact match
- normalized exact match
- tiny keyword overlap assist

The first draft also supports only the minimal shared FAQ path:

- shared seed registry lookup
- shared resolver result
- shared pipeline consumption
- shared response candidate path
- shared outbound mapping path
- shared observability evidence points

## 3. What This First Draft Does Not Support

The first draft does **not** support:

- semantic retrieval
- fuzzy ranking engines
- multi-stage scoring systems
- multi-turn FAQ flows
- lead capture
- handoff
- menu systems
- command systems
- state machines
- richer interactive flows
- webhook contract changes
- response contract changes
- channel-specific FAQ branches

## 4. Why This Is Still a Minimal FAQ Capability

This is still only a minimal FAQ capability because:

- it relies on a tiny shared seed registry
- it uses a very small rule set
- it returns only a four-field result contract
- it stays inside the shared pipeline
- it does not expand into a larger conversation system

## 5. Telegram / Website Safety

Telegram and Website remain safe because they share the same resolver, the same pipeline path, and the same outbound mapping path.

The existing webhook baseline remains unchanged:

- `POST /webhooks/telegram`
- `POST /webhooks/website`
- 200 responses
- visible regression fields
- independent channel behavior

## 6. Current Conclusion

This first draft is intentionally narrow.
It is a minimal FAQ capability, not a full FAQ system.