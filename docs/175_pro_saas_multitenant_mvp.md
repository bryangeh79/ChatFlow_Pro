# ChatFlow Pro — Multi-tenant SaaS (MVP)

## Goal

Move from single-tenant env-injection toward **multi-tenant SaaS**: per-customer credentials, FAQ, and settings in a database, with a minimal admin UI and tenant-scoped webhooks.

## What shipped (MVP)

- **SQLite (sql.js)** file DB, default path `data/chatflow-saas.sqlite` (override `CHATFLOW_SAAS_DB_PATH`).
- **Tables**: `tenants`, `tenant_credentials`, `tenant_faq_entries`, `tenant_settings`.
- **Tenant webhooks**: `GET|POST /webhooks/t/<slug>/<channel>` where `<channel>` is one of `telegram|website|whatsapp|messenger|line|zalo`.
- **Runtime**: `AsyncLocalStorage` tenant context; **sessions namespaced** by `tenantId`; **FAQ** for tenant routes loaded **only from DB** (no built-in seed).
- **Outbound**: all seven channels resolve credentials **per request** — tenant DB if tenant context is active, else existing **process env** (legacy single-tenant mode unchanged).
- **Admin**:
  - Dashboard: `GET /saas/admin` → `public/saas-admin.html`
  - API: `GET /saas/v1/health`, `GET|POST /saas/v1/admin/tenants`, `PUT .../credentials`, `GET|PUT .../faq`, `PUT .../settings`
  - Auth: `Authorization: Bearer <CHATFLOW_SAAS_ADMIN_TOKEN>` for `/saas/v1/admin/*`

## Explicit non-goals (this MVP)

- No encryption-at-rest for credential values (production should add KMS/envelope encryption).
- **Handoff / lead notify / OpenAI** paths are not yet driven by `tenant_settings` (settings JSON is stored for the next iteration).
- No subdomain-based tenant routing yet (path-based `slug` only).

## Next steps (recommended)

1. Wire `tenant_settings` into conversation/handoff/notify policy.
2. Add authenticated tenant users (JWT) instead of a single global admin token.
3. Postgres + migrations for hosted SaaS; keep sql.js for local dev if desired.
