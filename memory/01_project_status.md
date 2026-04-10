# 01 Project Status

**Last updated:** 2026-04-10
**Version:** v1.7.108
**Phase:** PRODUCTION — Testing / Debug / UX / Teaching mode

---

## Current State

| Dimension | Status |
|---|---|
| Hosted / production-ready v1 | ✅ 100% |
| Can sell / deliver to tenant | ✅ 100% |
| Main development line | ✅ CLOSED — do not reopen |
| Active mode | 🔍 Test · Debug · UX · Teaching |

---

## Infrastructure

| Item | Value |
|---|---|
| VPS | 45.32.104.102 (Vultr) |
| Domain | api.starbright-solutions.com:3050 |
| Process | `nohup node dist/src/index.js > /tmp/chatflow.log 2>&1 &` |
| DB driver | SQLite / sql.js (`CHATFLOW_SAAS_DB_DRIVER=sqljs`, `CHATFLOW_SAAS_SQLJS_COMPAT=1`) |
| Repo | https://github.com/bryangeh79/ChatFlow_Pro — branch: main |
| Deploy cmd | `cd /opt/chatflow/ChatFlow_Pro && git pull && npm run build && kill $(ps aux | grep 'node dist' | grep -v grep | awk '{print $2}') && nohup node dist/src/index.js > /tmp/chatflow.log 2>&1 &` |

## Active Tenant

| Item | Value |
|---|---|
| Slug | starbright01 |
| Admin token | sb-admin-2026-changeme |
| Dashboard | https://api.starbright-solutions.com/app/ |

---

## Completed Feature Set (Sealed — Do Not Reopen)

1. ✅ Multi-tenant SaaS core (auth, tenant isolation, DB migrations, go-live check)
2. ✅ Unified inbound pipeline (intent → FAQ → lead capture → handoff → LLM)
3. ✅ Telegram channel (webhook + send + inline keyboard quick reply)
4. ✅ LINE channel (webhook + send + quickReply items)
5. ✅ FAQ CRUD (dashboard + bulk Q:/A: import + product categories)
6. ✅ AI Settings page (OpenAI key masked, model selector, test connection)
7. ✅ Bot Settings — 3 batches fully delivered:
   - Batch 1: persona, welcome_message, welcome_buttons (max 5), followup_prompt
   - Batch 2: leave_message_mode + pipeline, lead_trigger_after_n + pipeline
   - Batch 3: de-hardcode 3 text fields, LINE quick reply parity, Leads leave-msg visibility
8. ✅ Auto leave-message → Lead (upsertLeaveMessageLead, dedup by session_id via latest_note)
9. ✅ Leads page: phone/email fields, 留言 badge, 📩 leave-msg highlight block

---

## Latest Debug Fix Snapshot (2026-04-11)

**Commit:** `78aaa81` — FAQ Translation Stability Fix

**What was fixed:**
- `POST /knowledge/:id/generate-translation` was returning 502 Bad Gateway
- Root cause: redundant `await import('./repository')` inside the handler (line 1339) — `getTenantCredentialsForOutbound` was already statically imported at line 16; dynamic import caused resolution failure at runtime
- Secondary: `upsertFaqTranslation` was unguarded — any DB exception would crash the handler with no JSON response
- Frontend: `api()` helper was passing raw nginx 502 HTML as the error message

**Files changed:** `src/saas/admin-routes.ts`, `public/tenant-app.html`

**Current status:** ⚠️ Code fixed and pushed to GitHub (`main`). **Awaiting deployment and live verification on VPS.** Not yet confirmed resolved in production.

---

## Current Work Mode Rules

- NO new main feature lines without explicit approval
- Allowed: real-test → reproduce → fix → deploy
- Allowed: UI/UX micro-adjustment (labels, copy, layout)
- Allowed: admin teaching support and documentation
- Allowed: memory sync after each session
