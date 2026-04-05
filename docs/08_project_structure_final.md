# 08 Project Structure Final

## Root Structure Recommendation
- `docs/` — PRD, architecture, flows, planning, version notes
- `memory/` — current state, completed work, next phase plan, risks, handoff notes
- `frontend/` — public chat surfaces and admin interface
- `backend/` — API, services, integrations, auth, persistence
- `shared/` — shared types, constants, schemas, utilities
- `locales/` or `i18n/` — language resources and locale config

## Recommended Tree
```text
/workspace
  docs/
    01_module_blueprint.md
    02_user_roles.md
    03_pages_and_admin_list.md
    04_system_flows.md
    05_project_structure_suggestion.md
    06_prd_skeleton.md
    07_tech_stack_and_architecture.md
    08_project_structure_final.md
    09_data_model_draft.md
    10_api_and_service_plan.md
  memory/
    01_project_status.md
    02_completed_work.md
    03_next_phase_plan.md
    04_risks_issues.md
    05_handoff_for_new_chat.md
  frontend/
    app/
    components/
    chat/
    admin/
    styles/
    i18n/
  backend/
    api/
    services/
    modules/
    integrations/
    auth/
    config/
    knowledge-base/
    notifications/
    reports/
    db/
    i18n/
  shared/
    types/
    schemas/
    constants/
    utils/
  locales/
    zh/
    en/
    vi/
    ms-MY/
```

## Directory Responsibility
### `frontend/`
- Chat widget and public chat entry screens
- Admin console screens
- UI components and styling
- Client-side localization hooks

### `backend/`
- API routes and controllers
- Business services
- Channel adapters
- Auth and permissions
- Knowledge base logic
- Notifications and reporting
- Database access and migration-related code
- Localization helpers for server-side content selection

### `shared/`
- Common domain types
- Validation schemas
- Constants such as roles, statuses, and language codes
- Reusable helpers used by both frontend and backend

### `docs/`
- Product and engineering documents
- Phase outputs
- Architecture notes
- PRD and flow references

### `memory/`
- Project continuity files
- Status snapshots
- Handoff notes for future chats

### `locales/` or `i18n/`
- Translation resources
- Locale registry
- Future language expansion slot

## MVP Must-Have Directories
- `frontend/`
- `backend/`
- `shared/`
- `docs/`
- `memory/`
- `locales/` or `i18n/`

## Pre-Reserved but Can Stay Empty at First
- `backend/notifications/`
- `backend/reports/`
- `backend/db/`
- `frontend/admin/` subpages beyond basic shell
- `locales/` future language expansion files

## Scope Guard
This final structure supports reception and support automation only.
It deliberately leaves out commerce, payment, ERP, and complex sales operations.
