# 03 Next Phase Plan

**Last updated:** 2026-04-10
**Status:** Main development CLOSED. No new phase planned.

---

## Current Priority: Testing & Stabilisation

The system is production-ready. The next phase is NOT new features —
it is making the existing features work reliably for real tenants.

### Priority Order

1. **Real-world testing** — run every checklist item with a real Telegram/LINE account
2. **Bug fixes** — reproduce → fix → deploy (no scope creep)
3. **UX micro-fixes** — copy/label/layout issues found during testing
4. **Admin onboarding** — teach Bryan to configure and manage tenants
5. **M33 Lotto Bot FAQ import** — Bryan has content ready; load via Bulk Import

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
