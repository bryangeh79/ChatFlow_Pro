# 16 Reply Resolution Flow

## Current Flow
1. Message enters the runtime through the website entry path.
2. The message is normalized.
3. Language is resolved.
4. Reply dispatch asks the FAQ / knowledge base resolver for a content match.
5. If the resolver returns a match, the answer is returned.
6. If the resolver returns no-match, reply dispatch returns fallback content.
7. The frontend widget displays the selected reply.

## Resolver Position
The FAQ / knowledge base resolver sits inside the reply dispatch layer.
This keeps content lookup separate from transport and session bootstrap.

## Matched Reply Path
- Resolver returns matched answer
- Reply dispatch marks it as FAQ / KB resolved reply
- Reply text is returned to the chat widget

## Fallback Reply Path
- Resolver returns no-match
- Reply dispatch uses fallback content
- System reply remains available

## Multilingual Handling
- The active language is passed into resolver and dispatch
- The response should prefer the same language as the conversation
- If content for that language does not exist, fallback logic applies

## Upgrade Point Later
This resolver layer can later be replaced by a stronger retrieval engine without changing the session bootstrap or transport layer.
