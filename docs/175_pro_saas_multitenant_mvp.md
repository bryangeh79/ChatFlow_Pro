# ChatFlow Pro — Multi-tenant SaaS (MVP)

## Goal

Move from single-tenant env-injection toward **multi-tenant SaaS**: per-customer credentials, FAQ, and settings in a database, with a minimal admin UI and tenant-scoped webhooks.

## What shipped (MVP)

- **SQLite (sql.js)** file DB, default path `data/chatflow-saas.sqlite` (override `CHATFLOW_SAAS_DB_PATH`).
- **Tables**: `tenants`, `tenant_credentials`, `tenant_faq_entries`, `tenant_settings`.
- **Tenant webhooks**: `GET|POST /webhooks/t/<slug>/<channel>` where `<channel>` is one of `telegram|website|whatsapp|messenger|line|zalo`.
- **Runtime**: `AsyncLocalStorage` tenant context; **sessions namespaced** by `tenantId`; **FAQ** for tenant routes loaded **only from DB** (no built-in seed).
- **Outbound**: all seven channels resolve credentials **per request** — tenant DB if tenant context is active, else existing **process env** (legacy single-tenant mode unchanged).
- **Inbound verification (tenant path only, Phase 22D)**: `POST` signing secrets and `GET` hub verify tokens for the channels below are read **only from `tenant_credentials`** — **no fallback to process `env`**. Legacy `/webhooks/<channel>` is unchanged. Details → **§ Tenant webhook verification** below.
- **Admin**:
  - Dashboard: `GET /saas/admin` → `public/saas-admin.html`
  - API: `GET /saas/v1/health`, `GET|POST /saas/v1/admin/tenants`, `PUT .../credentials`, `GET|PUT .../faq`, `PUT .../settings`
  - Auth: `Authorization: Bearer <CHATFLOW_SAAS_ADMIN_TOKEN>` for `/saas/v1/admin/*`

## Explicit non-goals (this MVP)

- No encryption-at-rest for credential values (production should add KMS/envelope encryption).
- **Handoff / lead notify / OpenAI** paths are not yet driven by `tenant_settings` (settings JSON is stored for the next iteration).
- No subdomain-based tenant routing yet (path-based `slug` only).

## Tenant webhook verification (Phase 22D / 22E)

### What operators must configure (tenant path)

On **`GET|POST /webhooks/t/<slug>/<channel>`**, the following apply **in addition to** outbound/send credentials:

1. **POST signature secret** (channels that support inbound signing): must exist in **`tenant_credentials`** or the server returns **403** (e.g. `tenant_secret_missing` / `signature_invalid`) with `debug_metadata.saas_control` flags — **the process `env` app/signing secret is not used** on this path.
2. **GET verify token** (Meta-style hub subscribe, where applicable): must exist in **`tenant_credentials`** or hub challenge requests return **403** `tenant_verify_token_missing` — **even if** `META_WEBHOOK_VERIFY_TOKEN` (or per-channel env) matches the query token.

Legacy **`/webhooks/<channel>`** keeps the previous behaviour (env tokens/secrets and optional skip when unset).

### Channel differences

| Channel | Tenant POST body signature | Tenant GET hub verify | Notes |
|--------|----------------------------|------------------------|--------|
| **Telegram** | None | N/A (GET is informational JSON only) | No Meta hub flow on tenant GET. |
| **Zalo** | None (no official body signature in product) | Tenant **`ZALO_WEBHOOK_VERIFY_TOKEN`** required for hub-style GET; **no env fallback** | Align expectations with `docs/144`. |
| **WhatsApp, Messenger, Line, Website** | **Required** tenant secret (see keys below) | **Required** tenant verify token for subscribe GET | Same keys as env names, stored per tenant in DB. |

### GET semantics (tenant path, non-Telegram hub-capable channels)

- **Idle GET** — request has **no** `hub.mode` / `hub.verify_token` / `hub.challenge`: server returns an **informational JSON ping**; **does not** require a configured verify token.
- **Hub challenge GET** — Meta-style subscribe with `hub.mode=subscribe` and challenge: **requires** the tenant verify token in DB; missing → **403** `tenant_verify_token_missing`.

### Credential key names (verify + signing)

Use the same **key names** as `.env.example` in Admin **`PUT .../credentials`**:

| Channel | POST signing / secret keys | GET verify token key |
|--------|----------------------------|----------------------|
| WhatsApp | `WHATSAPP_APP_SECRET` or `META_APP_SECRET` | `WHATSAPP_WEBHOOK_VERIFY_TOKEN` |
| Messenger | `MESSENGER_APP_SECRET` or `META_APP_SECRET` | `MESSENGER_WEBHOOK_VERIFY_TOKEN` |
| Line | `LINE_CHANNEL_SECRET` | `LINE_WEBHOOK_VERIFY_TOKEN` |
| Website | `WEBSITE_WEBHOOK_SIGNING_SECRET` | `WEBSITE_WEBHOOK_VERIFY_TOKEN` |
| Zalo | — | `ZALO_WEBHOOK_VERIFY_TOKEN` |
| Telegram | — | — |

### CI regression (`tenant-boundary-verify`)

- Workflow: `.github/workflows/ci.yml` job **`tenant-boundary-verify`** runs `npm run verify:tenant-post-signature-boundary` and `npm run verify:tenant-get-verify-boundary` after `npm ci` + `npm run build`.
- **GitHub Actions secret** **`CHATFLOW_SAAS_ADMIN_TOKEN`** must be set (trusted repo only). If **unset**, the job is **skipped** (workflow still passes).
- **Fork pull requests** do not run this job; **same-repo** pull requests and **push** events run it when the secret is set (see `if:` in `ci.yml`).

---

## Next steps (recommended)

1. Wire `tenant_settings` into conversation/handoff/notify policy.
2. Add authenticated tenant users (JWT) instead of a single global admin token.
3. Postgres + migrations for hosted SaaS; keep sql.js for local dev if desired.
