# Phase 16.x — Meta Graph & Zalo token refresh ADR (design only)

## Status

**Decision / documentation.** The original Phase 16.x deliverable was design-only. **Update:** **Zalo** option **C** = **Phase 17.1** (`docs/154`). **Meta** (WhatsApp + Messenger) option **C** MVP = **Phase 17.2** (`docs/156`, `fb_exchange_token`). Unconfigured in-process refresh still behaves like **option A** (env + restart).

## Problem

| Channel | Token env (today) | Expiry / rotation reality |
|--------|-------------------|---------------------------|
| **WhatsApp Cloud** | `WHATSAPP_ACCESS_TOKEN` | Meta Graph tokens vary by how they were created (long-lived system user, etc.); Meta documents rotation and app-level flows. |
| **Messenger** | `MESSENGER_PAGE_ACCESS_TOKEN` | Page access tokens can expire or be invalidated; depends on Meta app settings and token type. |
| **Zalo OA** | `ZALO_ACCESS_TOKEN` | OAuth access token; expires per Zalo policy; refresh typically uses a **refresh token** exchange (see current Zalo Open API docs). |

Pro today reads these from environment configuration; there is **no** automatic refresh in-process.

## Explicitly out of scope (this ADR)

- Implementing refresh logic in Node.
- Changing webhook handlers, signature verification, or `200 OK` degraded-send policy.
- **Telegram** `TELEGRAM_BOT_TOKEN`: rotation is operational (BotFather / new token string), not an OAuth refresh loop in Pro.
- **Line** `LINE_CHANNEL_ACCESS_TOKEN`: LINE has its own token lifecycle; treat like a separate future ADR if product requires auto-refresh.

## Options

### A — Platform-level rotation (default recommendation for Pro MVP)

Operators or CI rotate values in the hosting **secret store** (K8s Secret, PaaS env, Vault injection, etc.). Rolling restart or redeploy loads new env.

- **Pros**: Minimal code; no new secrets in memory beyond today; clear audit trail in platform.
- **Cons**: Small window where traffic may hit invalid token until deploy completes; requires runbook.

### B — External cron / sidecar

A separate job exchanges refresh tokens (Zalo / Meta per official APIs), writes results to a store the app reads (with reload or coordinated restart).

- **Pros**: Webhook path stays free of token exchange latency.
- **Cons**: More moving parts; must secure refresh credentials strictly.

### C — In-process refresh on 401 (future epic)

On outbound `401` / documented “expired token” signals: coordinated single-flight refresh, update in-memory credential, **one** retry. Requires persistent or injected storage for new access tokens and, for Zalo, secure handling of `refresh_token`.

- **Pros**: Better UX for long-running processes without frequent deploys.
- **Cons**: Concurrency, persistence, and **never log tokens** requirements; needs dedicated security review.

## Decision

1. **Accept A** as the **documented default** for production Pro until product prioritizes automation.
2. **B** is acceptable for teams with SRE capacity; document in runbooks, not in core code in this phase.
3. **C** is **deferred** to a **future phase** (e.g. Phase 17+) with its own spec and threat model.

## Future environment shape (not implemented; placeholders)

If **C** is implemented later, expect **additional** secrets such as:

- Zalo: refresh token and app secret / app id as required by official token endpoint.
- Meta: follow **current** Meta documentation for the token types in use (may include app secret + short-lived token exchange patterns).

**Do not** add these to `.env.example` until implementation is approved; avoid implying features that do not exist.

## Future code hooks (informal)

Outbound real-send modules already classify HTTP failures. A later change can introduce a narrow `TokenProvider` or refresh callback **without** altering unified message/session models.

## References (verify against live vendor docs)

- Meta: Graph API token and app documentation for WhatsApp Cloud and Pages.
- Zalo: Open API OAuth / OA token refresh documentation.
- Internal: `docs/146`, `docs/147` (WhatsApp / Messenger outbound), `docs/149` (Zalo outbound).
