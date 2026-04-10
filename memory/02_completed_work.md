# 02 Completed Work

**Last updated:** 2026-04-11 — FAQ Translation Stability Fix added

---

## FAQ Translation Stability Fix ✅ (2026-04-11)

**Commit:** `78aaa81`
**Status:** Code fixed, pushed to GitHub. ⚠️ Awaiting VPS deployment + live verification.

**Background:**
`POST /knowledge/:id/generate-translation` (the "⚡ Generate Draft" button in the Translation Panel) was returning 502 Bad Gateway. The route was added as part of the SaaS IA / multilingual restructure (Knowledge workbench, FAQ translation workflow).

**Root cause (primary):**
Line 1339 in `src/saas/admin-routes.ts` had a redundant dynamic import:
```typescript
// BUG — was:
const { getTenantCredentialsForOutbound } = await import('./repository');
```
`getTenantCredentialsForOutbound` is already statically imported at line 16. The dynamic import was resolving incorrectly at runtime, causing the handler to crash before returning any JSON → nginx surfaced this as 502.

**Root cause (secondary):**
`upsertFaqTranslation()` called after the OpenAI fetch had no try/catch. Any DB-level exception (e.g. missing column) would crash the handler with no JSON response body.

**Fixes applied (`src/saas/admin-routes.ts`):**
1. Removed dynamic `await import('./repository')` — use static import directly
2. Wrapped `upsertFaqTranslation` in try/catch → returns `500 { ok:false, error:"db_error:..." }` instead of crashing
3. OpenAI non-200 responses now captured as `warning` field in the 200 response, not as a thrown error
4. fetch timeout increased from 15s → 20s

**Fix applied (`public/tenant-app.html`):**
5. `api()` helper: 502/503/504 now return `"Server error (502) — please retry or check server logs"` instead of raw nginx HTML blob
6. Generate Draft catch block: error prefixed with ⚠ for visual clarity

**Expected result after deploy:**
- Generate Draft returns `{ ok: true, translation: {...} }` for EN / VI / MS / ZH
- DB errors return clean 500 JSON (no crash)
- Frontend shows readable error text if anything fails

---

## Bot Settings — Batch 1 ✅ (2026-04-10)

**Commit:** 556ca7d

Files changed:
- `src/saas/tenant-runtime-settings.ts` — extended bot block: persona, welcome_message, welcome_buttons, followup_prompt, leave_message_mode, lead_trigger_after_n
- `src/channels/unified-inbound-pipeline/openai-reply.ts` — persona + followup_prompt injected into system prompt
- `src/channels/unified-inbound-pipeline/index.ts` — first-contact welcome message + quick_reply_buttons on response
- `shared/types/unified-response.ts` — added quick_reply_buttons?: string[]
- `src/channels/adapters/telegram/real-send.ts` — inline_keyboard from quickReplyButtons
- `src/channels/outbound-sender/index.ts` — pass quick_reply_buttons to Telegram sender
- `src/saas/admin-authorization.ts` — GET/PUT /bot-settings policies
- `src/saas/admin-routes.ts` — GET/PUT /bot-settings route handlers
- `public/tenant-app.html` — Bot Settings page (full CRUD UI), nav entry, SPA route

---

## Bot Settings — Batch 2 ✅ (2026-04-10)

**Commit:** 3c48b62

Files changed:
- `src/channels/unified-inbound-pipeline/index.ts`:
  - Exchange count tracking: `metadata.bot_exchange_count` incremented each turn
  - leave_message_mode logic: 2-turn state machine (prompt → collect → confirm → auto-lead)
  - lead_trigger_after_n: soft nudge appended after N exchanges, once per session

---

## Bot Settings — Batch 3 ✅ (2026-04-10)

**Commit:** a56d83e

Files changed:
- `src/saas/tenant-runtime-settings.ts` — 3 new fields: leave_message_prompt_text, leave_message_confirmation_text, lead_nudge_text
- `src/channels/unified-inbound-pipeline/index.ts` — use configurable text, fallback to defaults; write conversation_summary = "[留言] {text}"
- `src/saas/admin-routes.ts` — GET/PUT /bot-settings updated for 3 new fields
- `src/channels/adapters/line/real-send.ts` — LINE quickReply items from quickReplyButtons
- `src/channels/outbound-sender/index.ts` — pass quick_reply_buttons to LINE sender
- `public/tenant-app.html`:
  - Bot Settings: textarea inputs for 3 new text fields
  - normalizeLead: pass through phone, email, inquiry_summary, latest_note, is_leave_message
  - Leads list: 留言 badge chip
  - Leads detail: 📩 leave-msg highlight block + phone/email in info grid
  - Leads sidebar: phone/email in Contact snapshot

---

## Leave Message Auto-Lead ✅ (2026-04-10)

**Commit:** 62d3bcd

Files changed:
- `src/saas/repository.ts` — new `upsertLeaveMessageLead()`:
  - Dedup key: `latest_note = "[leave_msg:{session_id}]"`
  - SELECT before INSERT (no duplicate)
  - inquiry_summary = "[留言] {text}"
  - Copies name/phone/email from lead_capture_state if available
  - status = 'new', conversation_id = NULL
  - calls persistIfNeeded() for SQLite disk write
- `src/channels/unified-inbound-pipeline/index.ts`:
  - Fire-and-forget after leave_message_recorded
  - tenantId guard (SaaS path only)
  - debug_steps: 'leave_lead_created' or 'leave_lead_exists'

---

## Earlier Completed Work (Pre Bot-Settings)

### LINE Channel Full End-to-End ✅
- Fixed parseLineRecipientFromSessionId for SaaS multi-tenant format
- Channel Secret + Access Token stored in tenant credentials
- Webhook verification passing
- LINE auto-response disabled (required manual action in LINE OA Manager)

### FAQ CRUD + Bulk Import ✅
- viewKnowledge() full rewrite: no mock data, real API CRUD
- Product + language filters, slide-in panel, enable/disable toggle
- Bulk import: Q:/A: format parser, sequential POST per entry
- Products page: list/add/delete products (tenant_products table)

### AI Settings Page ✅
- Status-first layout: current model, ON/OFF toggle, masked key display
- Test connection with human-readable error messages
- Route fixed: /app/settings/ai → viewAi()

### Telegram Channel ✅
- parseTelegramChatIdFromSessionId fixed for SaaS multi-tenant format
- Inline keyboard support added

### Multi-tenant SaaS Core ✅
- tenant_products table (schema + migration)
- Admin authorization policies
- Runtime settings loaded per request
