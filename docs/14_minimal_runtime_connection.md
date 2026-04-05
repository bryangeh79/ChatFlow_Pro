# 14 Minimal Runtime Connection

## Flow
1. Website chat entry receives input.
2. Backend website entry adapter normalizes the request.
3. Chat runtime creates or reuses a conversation session.
4. Language service resolves the active language.
5. Incoming message is normalized into a shared message shape.
6. Reply dispatcher returns a minimal mock reply.
7. Frontend widget can display the reply state.

## Module Mapping
- Website entry: `backend/src/modules/channels/website/entry.ts`
- Session init: `backend/src/modules/chat-runtime/services/session-init.ts`
- Language resolution: `backend/src/modules/language/services/resolve-language.ts`
- Reply dispatch: `backend/src/modules/chat-runtime/services/reply-dispatch.ts`
- Frontend entry: `frontend/src/modules/chat-widget/lib/mock-chat-entry.ts`

## Mock Areas
- Session creation is still minimal and deterministic
- Reply content is still mock-level
- No database persistence is wired yet
- No FAQ or knowledge base lookup is active yet

## FAQ / Knowledge Base Hook Point
The next connection point will be the reply dispatch layer.
That is where FAQ lookup and knowledge base retrieval should plug in later.
