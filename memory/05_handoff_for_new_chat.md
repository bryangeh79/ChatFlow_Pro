# 05 Handoff for New Chat

**Last updated:** 2026-04-10
**For:** Next Claude session / agent picking up this project

---

## What This Project Is

ChatFlow Pro — multi-tenant SaaS AI reception system.
One platform, multiple tenants (clients), each isolated.
Channels: Telegram + LINE (live). WhatsApp/Messenger/Zalo (stubbed).

---

## Current State in One Sentence

**Main development is complete and sealed. We are in testing/debug/teaching mode.**

---

## The Stack

- **Runtime:** Node.js, TypeScript, compiled to `dist/src/index.js`
- **DB:** SQLite via sql.js (env: `CHATFLOW_SAAS_DB_DRIVER=sqljs`)
- **Server:** Custom HTTP server (not Express), port 3050
- **Dashboard:** Single HTML file: `public/tenant-app.html` (SPA, vanilla JS)
- **AI:** OpenAI API (per-tenant key, configurable model)
- **Channels:** Telegram Bot API, LINE Messaging API

## VPS Access

- **IP:** 45.32.104.102
- **Path:** `/opt/chatflow/ChatFlow_Pro`
- **Process check:** `ps aux | grep node`
- **Logs:** `tail -f /tmp/chatflow.log`
- **Restart:** `kill <PID> && nohup node dist/src/index.js > /tmp/chatflow.log 2>&1 &`
- **Deploy:** `git pull && npm run build` then restart

## Tenant

- **Slug:** starbright01
- **Dashboard:** https://api.starbright-solutions.com/app/
- **Admin token:** sb-admin-2026-changeme (used as Bearer token in API calls)
- **Tenant API base:** `/saas/v1/admin/tenant-ids/starbright01`

---

## What Was Just Completed (This Session)

### Bot Settings — Full 3-Batch Delivery
All settings stored in `tenant_settings.settings_json.bot.*`, per-tenant, runtime-loaded.

**Fields (all configurable in Dashboard → Settings → Bot Settings):**
- `persona` — LLM system prompt override
- `welcome_message` — first-contact greeting text
- `welcome_buttons` — quick-reply button labels (max 5)
- `followup_prompt` — appended to every LLM system prompt
- `leave_message_mode` — boolean toggle
- `leave_message_prompt_text` — configurable (fallback: Chinese default)
- `leave_message_confirmation_text` — configurable (fallback: Chinese default)
- `lead_trigger_after_n` — soft nudge after N exchanges
- `lead_nudge_text` — configurable (fallback: Chinese default)

**Pipeline behaviour:**
- First contact → sends welcome_message + welcome_buttons (Telegram inline keyboard, LINE quickReply)
- LLM calls → use persona as system prompt, append followup_prompt
- leave_message_mode + handoff.enabled=false + handoff keyword → 2-turn collect flow
- leave_message recorded → auto-creates Lead (upsertLeaveMessageLead, dedup by session_id)
- lead_trigger_after_n → soft nudge after N exchanges, once per session

**Key commits:**
- 556ca7d — Batch 1
- 3c48b62 — Batch 2
- a56d83e — Batch 3
- 62d3bcd — Auto Lead creation

---

## Key Files to Know

| File | Purpose |
|---|---|
| `src/saas/tenant-runtime-settings.ts` | Bot settings schema + parser |
| `src/channels/unified-inbound-pipeline/index.ts` | Main pipeline (welcome, leave-msg, nudge, LLM) |
| `src/channels/unified-inbound-pipeline/openai-reply.ts` | LLM call with persona |
| `src/saas/repository.ts` | DB access, including upsertLeaveMessageLead |
| `src/saas/admin-routes.ts` | All tenant admin API routes |
| `src/saas/admin-authorization.ts` | Route permission policies |
| `src/channels/adapters/telegram/real-send.ts` | Telegram send + inline keyboard |
| `src/channels/adapters/line/real-send.ts` | LINE send + quickReply |
| `src/channels/outbound-sender/index.ts` | Dispatch to channel senders |
| `public/tenant-app.html` | Entire dashboard SPA (one file) |

---

## What To Do Next

1. Run test checklist (see `memory/test_checklist.md` or ask for it)
2. Fix any bugs found during testing
3. Help Bryan onboard as admin (teach Bot Settings configuration)
4. Import M33 Lotto Bot FAQ content via Bulk Import
5. Consider VPS systemd setup to survive reboots

---

## What NOT To Do

- Do not start new major features without scope approval
- Do not refactor working pipeline code "for cleanliness"
- Do not touch handoff/lead-capture internals unless there's a real bug
- Do not change the DB schema without a migration file
