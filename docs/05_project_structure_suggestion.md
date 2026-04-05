# 05 Project Structure Suggestion

## Recommended Top-Level Layout
- `docs/` — product blueprints, PRD, flow notes, architecture notes
- `memory/` — project status, completed work, next phase plan, risks, handoff notes
- `frontend/` — user-facing chat widget and admin UI
- `backend/` — API, services, auth, integrations, business logic
- `shared/` — shared types, constants, validation schemas, helpers
- `locales/` or `i18n/` — language resources and future translation assets

## Suggested Product Code Layout
### frontend/
- `app/` or `pages/` — routing and screens
- `components/` — reusable UI pieces
- `chat/` — chat widget UI
- `admin/` — backend/admin screens
- `styles/` — theme and layout styles
- `i18n/` — language-aware UI hooks or bindings

### backend/
- `api/` — route handlers
- `services/` — conversation, lead, handoff, report services
- `modules/` — feature modules by domain
- `integrations/` — channel adapters
- `knowledge-base/` — FAQ and content retrieval logic
- `notifications/` — alert dispatch logic
- `auth/` — login and access control
- `config/` — environment and runtime settings
- `i18n/` or `language/` — default language and fallback logic

### shared/
- `types/` — domain models
- `constants/` — statuses, roles, language codes
- `schemas/` — validation definitions
- `utils/` — reusable helpers

### locales/ or i18n/
- `zh/` — Chinese resources
- `en/` — English resources
- `vi/` — Vietnamese resources
- `ms/` — Malay (Malaysia) resources
- `index` / registry file for future expansion

## Why This Structure Works
- Keeps docs separate from runtime code
- Keeps future multilingual support visible from the start
- Makes channel adapters independent of core conversation logic
- Allows shared logic between frontend and backend
- Leaves a clean place for future expansion without changing the product boundary

## Phase 2 Readiness Notes
This structure is intentionally simple enough for a Phase 2 build skeleton.
It already reserves language configuration, locale resources, and shared domain types.
