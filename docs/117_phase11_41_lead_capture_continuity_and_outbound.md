# Phase 11.41 Lead Capture Continuity and Outbound

## Scope

### What This Phase Does
1. **Cross‑turn merging** – New detection results merge with existing `session.lead_capture_state.collected_fields` before computing `none`/`partial`/`captured`.
2. **Evidence alignment** – Pipeline `debug_metadata` now includes a `leadCaptureResult` object (status, captured_fields, missing_fields) matching the session state.
3. **Minimal outbound prompts** –  
   - `partial` → `lead_capture_prompt` (short sentence, English/Chinese first, expandable to four languages)  
   - `captured` → brief confirmation `reply_text` only when **FAQ misses**; FAQ hits keep FAQ answer.
4. **Documentation** – This document records the phase boundaries and evidence points.

### What This Phase Does NOT Do
- No webhook/adapter contract changes
- No handoff integration
- No menu/command/state‑machine logic
- No database persistence
- No channel‑specific branching
- No clarification‑loop engine
- No ownership/assignment/workflow semantics

## Evidence Points

### 1. Cross‑turn Merging
- **Hook**: `runLeadCaptureHook` merges `existingFields` with `newFields`
- **State**: `session.lead_capture_state.collected_fields` accumulates across turns
- **Status**: `captured` when all three fields are present (regardless of turn count)

### 2. Evidence Alignment
- **Pipeline**: `debug_metadata.leadCaptureResult` contains:
  - `status` – `none` | `partial` | `captured`
  - `captured_fields` – merged collected fields
  - `missing_fields` – still‑missing fields (if any)
- **Consistency**: Matches `session.lead_capture_state` exactly

### 3. Minimal Outbound
- **Partial prompt**: `lead_capture_prompt` added to `UnifiedResponse` when status is `partial`
- **Captured confirmation**: Only when `captured` **and** `!faqResult.matched`
- **FAQ priority**: FAQ hits suppress captured confirmation (no抢答)

## Files Changed
1. `src/channels/lead‑capture‑hook/index.ts` – Added cross‑turn merging
2. `src/channels/unified‑inbound‑pipeline/index.ts` – Added evidence alignment and outbound logic
3. `docs/117_phase11_41_lead_capture_continuity_and_outbound.md` – This document

## Verification
- ✅ `npm run build` passes
- ✅ Dual webhook baseline (`POST /webhooks/telegram`, `POST /webhooks/website`) remains 200‑OK
- ✅ No regression in existing FAQ/handoff flows
- ✅ Evidence field `leadCaptureResult` present in pipeline debug metadata

## Boundaries Held
- Webhook/adapter contracts unchanged
- No handoff/menu/state‑machine expansion
- No database writes
- Channel‑agnostic implementation (Telegram & Website same logic)
- Minimal scope – only the three listed goals implemented