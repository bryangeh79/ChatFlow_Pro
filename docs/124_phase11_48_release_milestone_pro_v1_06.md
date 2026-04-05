# Phase 11.48 Release Milestone Pro_v1.06

## Overview
This milestone marks the completion of the **Lead Capture + FAQ integration** capability chain, upgrading from Pro_v1.05 to Pro_v1.06.

## Delivered Capabilities (Phase 11.40–11.47)

### Lead Capture Flow
1. **Detection** – Explicit contact intent detection + name/phone/email field extraction
2. **Cross‑turn merging** – Fields accumulate across multiple messages within a session
3. **State management** – `none` → `partial` → `captured` status progression
4. **File persistence** – Captured leads appended to `data/local‑captured‑leads.jsonl` (git‑ignored)
5. **i18n prompts** – Four‑language support (zh/en/vi/ms‑MY) for partial prompts and captured confirmations
6. **Empty‑reply fallback** – When partial and reply empty, prompt becomes main reply

### FAQ Integration
7. **Matching restored** – FAQ gate fixed, seed entries (greeting, availability, support, contact, hours) now match
8. **Priority handling** – FAQ hits suppress captured confirmations; partial prompts appended to FAQ answers
9. **Debug evidence** – `leadCaptureResult` and `faqResult` in pipeline debug metadata

### Infrastructure
10. **In‑memory session store** – Cross‑request continuity with Map<session_id, UnifiedSessionContext>
11. **Session cap** – Maximum 1000 sessions with FIFO eviction
12. **JSONL rotation** – File rotation at 5MB or 10k lines (timestamped backups)
13. **Failure safety** – All persistence errors caught and silenced; webhook 200 always preserved

### Unified Pipeline
14. **Shared boundary** – Telegram & Website use same lead+FAQ logic
15. **Outbound merge** – `lead_capture_prompt` merged into `reply_text` (user‑visible)
16. **Evidence alignment** – Session state ↔ debug metadata consistency

## Known Limitations

### Session Store
- **In‑memory only** – Lost on process restart
- **Single‑process** – No multi‑instance coordination
- **Simple FIFO** – Not true LRU (doesn't track access frequency)
- **No TTL** – Only size‑based eviction, no age‑based expiration

### JSONL Persistence
- **File‑based only** – No database, no backend API
- **Backup accumulation** – No automatic cleanup of old backup files
- **Single‑writer** – Concurrent writes from multiple instances may conflict

### Field Extraction
- **Regex‑based** – Simple patterns may have false positives/negatives
- **Limited validation** – No format checking for email/phone/name

### FAQ Content
- **Placeholder seeds** – English‑only, minimal coverage
- **No i18n** – FAQ answers not translated to four languages

### Intent Dispatch
- **Placeholder only** – Real intent classification not yet implemented
- **Simple gate** – FAQ matching runs on any non‑empty text

## Version Bump: Pro_v1.05 → Pro_v1.06
**Rationale**: First complete capability chain (lead capture + FAQ) beyond basic webhook baseline.

**Backward Compatibility**:  
- Webhook contracts unchanged (Telegram & Website still 200 OK)
- Existing sessions continue working
- No breaking changes to external interfaces

## Next Steps
After acceptance of Pro_v1.06, choose Phase 12 direction:
1. **Technical debt** – Field validation, session TTL, backup cleanup
2. **Next capability** – Handoff integration, menu/command system, richer FAQ
3. **Channel expansion** – Telegram real development (beyond placeholder)
4. **Admin interface** – Backend leads viewing/management

## Verification Checklist
- ✅ `npm run build` passes
- ✅ Dual webhook baseline intact (POST /webhooks/telegram, /webhooks/website)
- ✅ Lead detection → persistence → i18n flow works
- ✅ FAQ matching restored and interacts with lead capture
- ✅ Session store enables cross‑request continuity
- ✅ Memory/disk bounds enforced (1000 sessions, 5MB/10k lines)
- ✅ All errors silenced (webhook 200 preserved)