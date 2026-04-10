# 03 Next Phase Plan

**Last updated:** 2026-04-11
**Status:** Main development CLOSED. No new phase planned.

---

## Current Priority: Testing & Stabilisation

The system is production-ready. The next phase is NOT new features —
it is making the existing features work reliably for real tenants.

### Immediate Next Actions (Stabilisation — Not New Features)

**Step 1 — Deploy commit `78aaa81` to VPS** (PENDING as of 2026-04-11)
```bash
cd /opt/chatflow/ChatFlow_Pro
git pull origin main
npm run build
kill $(ps aux | grep 'node dist' | grep -v grep | awk '{print $2}')
nohup node dist/src/index.js > /tmp/chatflow.log 2>&1 &
```

**Step 2 — Verify FAQ translation flow live**
- Open Dashboard → Knowledge → click 🌐 Translate on any FAQ entry
- Click ⚡ Generate Draft → must return translated question + answer (not 502)
- Test all languages: EN, VI, MS-MY
- Click Save & Publish → confirm status shows "published"
- Check VPS logs: `tail -f /tmp/chatflow.log` — must show no "crash" or unhandled errors

**Step 3 — Confirm no more 502 / crash in logs**
- If logs show errors, report them for next fix cycle
- If clean: mark FAQ translation chain as verified

---

### Priority Order (Ongoing)

1. **Deploy + verify `78aaa81`** ← CURRENT BLOCKER
2. **Real-world testing** — run every checklist item with a real Telegram/LINE account
3. **Bug fixes** — reproduce → fix → deploy (no scope creep)
4. **UX micro-fixes** — copy/label/layout issues found during testing
5. **Admin onboarding** — teach Bryan to configure and manage tenants
6. **M33 Lotto Bot FAQ import** — Bryan has content ready; load via Bulk Import

---

## Known Remaining Experience Gaps (Not Bugs — Acceptable)

| Gap | Impact | Fix effort |
|---|---|---|
| leave_message lead has conversation_id = NULL | Leads detail "来源会话" blank | Medium — needs webhook-level conversation upsert |
| lead name empty if no lead capture before leave msg | Lead shows "—" | Low — improve prompt text in Bot Settings |
| leave_message_mode only triggers when handoff.enabled = false | If handoff ON + no agents, no leave-msg mode | Medium — needs agent presence system |
| lead_nudge_text / leave-msg text hardcoded language | Non-Chinese users need to self-configure | Low — tenant sets own text in Bot Settings |
| LINE quick reply only on welcome (not subsequent turns) | Minor UX gap | Low |
| No systemd for VPS process | Reboot kills the process | Low — add systemd unit file |
| No auto-restart on crash | Manual nohup restart needed | Low |

---

## If New Features Are Requested (Future)

Do not start without:
1. Explicit scope approval from Bryan
2. Memory sync current state first
3. Write ADR before coding

Candidates (parked, not scheduled):
- Agent presence / online status for leave_message_mode handoff-enabled path
- Multi-language auto-detect for leave-msg / nudge text
- Separate tenant for M33 Lotto Bot (Method B: own slug + own channels)
- Systemd service for VPS
- Conversation → lead auto-link (conversation_id backfill)
