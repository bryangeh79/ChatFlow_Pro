# 15 FAQ / Knowledge Base MVP Strategy

## Goal
Provide the smallest useful content-answering layer for ChatFlow Pro.
The resolver should try FAQ / knowledge base content first, then fall back to the system reply.

## Minimal Matching Strategy
The MVP uses simple rules only:
- exact question match
- keyword match
- tags match

## Supported Inputs
- Exact question text
- Keywords contained in the incoming message
- Tags attached to FAQ / knowledge items

## Not Supported in MVP
- Embedding search
- Vector databases
- Semantic ranking
- Multi-step reasoning
- Long-context retrieval orchestration

## Content Organization
Each FAQ / knowledge item should carry:
- language code
- question
- answer
- keywords
- tags
- active flag

## Match Handling
- If a match is found, return the stored answer.
- If no match is found, return no-match and let reply dispatch fall back to the default reply.

## Multilingual Rule
- Matching should first consider the active conversation language.
- Content should be language-aware.
- The MVP must still keep the four locked languages structurally available.
