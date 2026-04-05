# 12 Minimal Chat Boot Flow

## Goal
Create the smallest possible chat loop for ChatFlow Pro on the Website channel:
entry -> session init -> language resolution -> message intake -> response dispatch.

## Minimal Flow
1. Visitor opens the website chat entry.
2. System creates or reuses a conversation/session.
3. System binds the conversation to channel = website.
4. System resolves the language using the priority chain.
5. User sends a message.
6. System normalizes the message into a shared message shape.
7. Chat runtime processes the message.
8. System returns a minimal reply in the resolved language.

## Session Initialization
- Create a conversation if none exists.
- Reuse the existing conversation if the visitor returns within the active session window.
- Store:
  - conversation id
  - channel
  - current language
  - session state

## Language Resolution
Priority order:
1. Visitor explicit language choice
2. Conversation stored language
3. Channel default language
4. System default language

Supported languages in Phase 3:
- zh
- en
- vi
- ms-MY

## Default Fallback Logic
- If the requested language is unavailable, fall back to the channel default.
- If the channel default is unavailable, fall back to the system default.
- If no language hint exists, use the system default.

## Message Intake Path
- Website widget submits a message payload.
- Payload is normalized into shared message format.
- Runtime stores or forwards the message to the conversation handler.
- Runtime checks language context before composing a reply.

## Response Dispatch
- Return a minimal system reply.
- The reply may be a fixed mock response in the chosen language.
- The response dispatcher must reserve a slot for future FAQ / knowledge base lookup.

## In Scope for This Phase
- Website entry only
- Session bootstrap
- Language resolution and fallback
- Message normalization
- Minimal reply dispatch

## Out of Scope for This Phase
- Telegram / WhatsApp / Messenger webhooks
- Complex FAQ search
- Knowledge base ranking
- Database migration
- Real admin UI
- Advanced permissions
