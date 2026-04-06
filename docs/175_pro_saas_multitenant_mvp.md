# ChatFlow Pro — Multi-tenant SaaS (MVP)

## Goal

Move from single-tenant env-injection toward **multi-tenant SaaS**: per-customer credentials, FAQ, and settings in a database, with a minimal admin UI and tenant-scoped webhooks.

**SaaS MVP status**: **Sealed (Phase 23 closed, 2026-04-07).** Feature scope described in this document is **complete for MVP**; further SaaS work is **Phase 24 — SaaS v1 Hardening** (tenant auth/RBAC, Postgres, multi-instance session store, credential encryption/rotation/audit) — see **`memory/03_next_phase_plan.md`**.

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
- **OpenAI / LLM** is not yet driven by `tenant_settings` or the main conversation chain (keys may exist in `tenant_credentials` only). **Tenant-path** handoff / lead / notify **are** gated by `tenant_settings` — see §「tenant_settings → runtime matrix」.
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

### Idle GET — product freeze (Phase 23, option **A**)

- **Idle GET stays HTTP 200** with informational JSON (`ok`, `channel`, `verification` note). This is an **explicit product decision**, not an oversight relative to hub-token enforcement.
- **Hub challenge GET** on the tenant path remains **strict**: tenant verify token in **`tenant_credentials`** only; no process-env fallback (`tenant_verify_token_missing` when missing).
- **Recommended liveness check**: use **`GET /health`** (`{ "ok": true }` in `src/server.ts`). **Do not** rely on idle GET on `/webhooks/...` or `/webhooks/t/...` as the primary probe — those endpoints exist for vendor flows and debugging, not as the supported health contract.
- **Known MVP boundary**: tenant URLs include **`/webhooks/t/<slug>/...`**. Valid vs invalid `slug` can be distinguished (**404** `tenant_not_found` vs **200** idle ping). Together with JSON `channel` / `verification` strings, this is a **limited information surface**, **accepted for MVP** (not a pending “fix idle” backlog item).

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

## Phase 23 — SaaS MVP acceptance notes

- **T0 / T1**: `npm run build`; `npm run staging:docker-smoke` (and repo CI) remain the default regression ladder (`docs/158`).
- **Tenant POST/GET boundary** (when GitHub secret `CHATFLOW_SAAS_ADMIN_TOKEN` is set): CI job **`tenant-boundary-verify`** runs `verify:tenant-post-signature-boundary` + `verify:tenant-get-verify-boundary` (see § above).
- **Idle GET (frozen)**: **200 informational JSON** on legacy and tenant paths when no `hub.*` query — documented above; **not** a defect vs hub verify rules.
- **Liveness**: operators should treat **`GET /health`** as the supported probe, not webhook idle GET.

---

## `tenant_settings` → runtime matrix (Phase 23)

Merged JSON via Admin **`PUT .../settings`**; stored in **`tenant_settings.settings_json`**. Parsed in **`src/saas/tenant-runtime-settings.ts`** (`parseTenantRuntimeSettings`). Loaded per **tenant POST** webhook in **`src/saas/tenant-webhook-http.ts`** (`loadTenantRuntimeSettingsForTenantRequest`). **Legacy** `/webhooks/*` does **not** load tenant settings.

| Key (JSON path) | Effective when `false` (default is on) | Primary runtime read sites | Verify script |
|-----------------|----------------------------------------|----------------------------|---------------|
| `handoff.enabled` | Handoff machinery no-op: `session.handoff_state.enabled` false; triggers/updates skipped (`src/channels/handoff-trigger/index.ts`). | `src/channels/unified-inbound-pipeline/index.ts` | `npm run verify:saas-handoff-disabled` |
| `notify.enabled` | No async HTTP notify for handoff pending or first lead JSONL persist (when tenant context). | `unified-inbound-pipeline/index.ts`, `src/channels/lead-capture-hook/index.ts`, `lead-capture-hook/persistence.ts` | `npm run verify:saas-notify-disabled` |
| `lead_capture.enabled` | Lead hook returns session unchanged — no merge/persist/capture progression from hook. | `src/channels/lead-capture-hook/index.ts` | `npm run verify:saas-lead-capture-disabled` |
| `bot.enabled` | Pipeline sets `effectiveShouldSend` false — no outbound user reply for that turn (sender sees `should_send === false`). | `unified-inbound-pipeline/index.ts` | `npm run verify:saas-bot-disabled` |
| `suppress_reply.enabled` | Env-driven handoff reply suppression cannot apply (`CHATFLOW_SUPPRESS_REPLY_ON_HANDOFF` gated out for tenant). | `unified-inbound-pipeline/index.ts` → `planTurn` → `src/channels/conversation-runtime/policy.ts` | `npm run verify:saas-suppress-reply-disabled` |
| `faq.fallback_enabled` | FAQ resolver skips English/cross-language fallback tiers after primary language; default-phase user text echo when FAQ misses is off. | `faq-resolver.ts` (via `buildFaqResolverOptions`), `policy.ts` `default` phase | `npm run verify:saas-faq-fallback-disabled` |

**Gaps (documented, not “missing implementation” bugs)**:

- **`faq.fallback_enabled`**: does **not** disable `post_capture` / `capture` phase i18n guidance when FAQ does not match — see `memory/04_risks_issues.md` (FAQ fallback scope).
- **Unknown keys** in `settings_json` are **ignored** at parse time (safe no-op).

---

## Next steps (recommended)

1. Extend `tenant_settings` only with explicit runtime read sites and tests (avoid “dark” keys).
2. Add authenticated tenant users (JWT) instead of a single global admin token.
3. Postgres + migrations for hosted SaaS; keep sql.js for local dev if desired.
