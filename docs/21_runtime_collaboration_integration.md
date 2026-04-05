# 21 Runtime Collaboration Integration

## How Collaboration Hooks into Runtime
- Runtime session initialization can carry default owner, assignment, and handoff state.
- Manual assignment updates the conversation owner before or during active conversation handling.
- Human handoff is checked during message processing inside reply dispatch.
- When handoff is triggered, the summary service generates a small context packet.
- The runtime then returns a pending-human style reply instead of a normal FAQ/fallback reply.

## Owner Position in the Chain
- The owner is a runtime conversation field.
- It represents who is responsible for the conversation at the current moment.

## Assignment Timing
- Assignment can take effect when a member is selected.
- The conversation owner is updated immediately in the smallest runtime model.

## Handoff Insertion Point
- Handoff is checked before the normal reply path completes.
- If triggered, it interrupts the normal FAQ/fallback response path.

## Summary Generation
- Summary is generated at handoff time.
- It uses the conversation, recent messages, current language, current channel, and fallback state.

## Real vs Placeholder
### Real in this phase
- Owner field
- Manual assignment structure
- Handoff trigger check
- Handoff summary generation
- Pending-human reply path

### Still Placeholder
- Persistent storage
- Admin collaboration UI
- Notification fan-out
- Automatic assignment
