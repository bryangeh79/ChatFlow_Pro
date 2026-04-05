# 27 Admin Reuse Boundary

## Must Reuse Existing Objects
- `conversation`
- `message`
- `lead`
- `handoff`
- `handoff summary`
- `assignment`
- `languageCode`
- FAQ / knowledge item structures

## Must Not Redefine
- conversation owner meaning
- assignment status meaning
- handoff status meaning
- language code set
- FAQ item identity model

## Admin Is a Viewing / Managing Layer
- Phase 5 pages only manage or display existing runtime objects.
- Phase 5 must not become a new source of truth for conversation state.
- Data models should remain shared between runtime and admin.

## Future Database Compatibility
When persistence is added later, the same object model should be stored and retrieved rather than replaced.
