# 07 Tech Stack and Architecture

## Frontend Recommendation
- Framework: Next.js
- Language: TypeScript
- UI approach: component-based admin UI plus chat widget UI
- Styling: utility-first CSS or component library with a simple theme system
- State handling: lightweight client state plus server-fetched data

### Why
- Good for both public chat surfaces and admin panels
- Easy to split frontend and backend concerns
- Strong ecosystem for localization, routing, and component reuse

## Backend Recommendation
- Runtime: Node.js
- Framework: NestJS or a modular Express/Fastify structure
- Language: TypeScript
- API style: REST for MVP, with room for event-driven extensions later
- Auth: session or token-based admin auth

### Why
- Strong modular structure for conversations, leads, channels, and reports
- Good fit for structured services and integrations
- Easy to share types with the frontend

## Database Recommendation
- Primary database: PostgreSQL
- Optional later support: Redis for queueing, caching, and transient session state

### Why
- Relational data fits conversations, leads, team assignments, and reports well
- Flexible enough for multilingual content fields and audit-style records
- Reliable for operational admin systems

## Multilingual / i18n Recommendation
- Use a structured i18n layer from the start
- Reserve locale-aware fields in database and shared types
- Suggested language codes:
  - zh
  - en
  - vi
  - ms-MY
- Default fallback policy:
  - preferred visitor/channel language first
  - system default language second
  - admin-configured fallback third

### Why
- Prevents later redesign of content storage
- Keeps reply selection and UI rendering language-aware
- Supports future language expansion without breaking existing records

## Knowledge Base / FAQ Implementation Recommendation
- Start with a content-driven FAQ table and knowledge item store
- MVP retrieval approach:
  - keyword matching
  - manual tags
  - simple similarity or ranking later if needed
- Keep answer content language-aware from day one

### Why
- Fast to build and easy for admins to maintain
- Good enough for reception and support MVP behavior
- Leaves room for smarter retrieval later

## Multi-Channel Integration Approach
- Normalize all inbound messages into one conversation event shape
- Build channel adapters for:
  - Website
  - Telegram
  - WhatsApp
  - Facebook Messenger
- Store channel-specific metadata separately from core conversation data
- Keep the core logic channel-agnostic

### Why
- Avoids duplicated business logic per channel
- Makes handoff, reporting, and lead capture consistent
- Makes later channel additions easier to isolate

## What to Build First
### Build early
- Shared types and data models
- Conversation normalization
- Admin auth skeleton
- Basic FAQ and knowledge storage
- Basic lead capture flow
- Default language handling
- Channel adapter interfaces

### Build later
- Advanced retrieval and ranking
- Real-time notification sophistication
- Reporting enrichment
- More advanced queueing or background jobs
- Future language expansion beyond the first four languages

## Summary
The recommended stack is a TypeScript-first web application with Next.js on the frontend, a modular Node.js backend, PostgreSQL as the primary database, and a structured i18n model prepared for four initial languages and future expansion.
