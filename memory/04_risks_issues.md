# 04 Risks and Issues

**Last updated:** 2026-04-10

---

## Active Risks

### R1 — VPS process not persistent (HIGH)
- **Issue:** Process started with `nohup`, dies on VPS reboot
- **Impact:** Service goes down after any VPS restart
- **Fix:** Add systemd unit file (low effort, not yet done)
- **Workaround:** Manual restart: `nohup node dist/src/index.js > /tmp/chatflow.log 2>&1 &`

### R2 — Telegram/LINE tokens were exposed in plain text (MEDIUM)
- **Issue:** Bot tokens appeared in terminal/conversation history during setup
- **Impact:** Tokens could be compromised if logs are leaked
- **Fix:** Rotate tokens via @BotFather (Telegram) and LINE Console, re-save in Dashboard
- **Status:** Pending rotation

### R3 — SQLite single-file DB, no backup (MEDIUM)
- **Issue:** DB file on VPS, no automated backup
- **Impact:** Data loss on VPS failure
- **Fix:** Daily cron to backup DB file to remote storage
- **Status:** Not implemented

### R4 — Admin token is weak and hardcoded (LOW-MEDIUM)
- **Issue:** `sb-admin-2026-changeme` is the admin token
- **Impact:** If leaked, full admin access to all tenants
- **Fix:** Change to strong random token in env vars
- **Status:** Pending

---

## Known UX Issues (Non-Critical)

| Issue | Where | Status |
|---|---|---|
| leave_message lead shows conversation_id = NULL | Leads detail | Acceptable — noted in 03 |
| lead name = "—" if no prior lead capture | Leads list | Acceptable — improve prompt text |
| Bot Settings page: no "saved" state indicator except alert() | Dashboard | Minor UX polish |
| Leads page still uses some mock fallback data paths | Dashboard | Cleanup opportunity |
| LINE quick reply buttons only on first-contact welcome | LINE channel | Minor gap |

---

## Resolved Issues (Archive)

| Issue | Resolution |
|---|---|
| LINE 403 on Verify | Credentials were swapped (Secret ↔ Token); re-saved correctly |
| LINE auto-reply conflict | Disabled Auto-response in LINE OA Manager |
| AI settings keySaved wrong field | Fixed: `input.has_openai_key` |
| Settings AI route wrong function | Fixed: route → viewAi() |
| Knowledge page showed mock data | Full rewrite of viewKnowledge() |
| Test connection showed raw JSON error | Parse error_code, show human-readable message |
| Telegram chatId parse failed for SaaS multi-tenant session format | Fixed parseTelegramChatIdFromSessionId |
| LINE userId parse failed for SaaS multi-tenant session format | Fixed parseLineRecipientFromSessionId |
