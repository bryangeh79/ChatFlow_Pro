# Phase 11.44 Outbound User‑Visible Prompt Merge

## Scope

### What This Phase Does
1. **Prompt‑to‑reply merge** – When `lead_capture_prompt` is non‑empty, it is merged into the user‑visible `reply_text`.
2. **Implementation choice** – Option A: Merge inside `runUnifiedInboundPipeline` (FAQ/original + newline + prompt).
3. **Debug preservation** – `debug_metadata.leadCaptureResult` remains intact.
4. **Prompt field** – `lead_capture_prompt` is set to `null` after merging (clean‑up choice).
5. **Documentation** – This document records the strategy and behavior.

### What This Phase Does NOT Do
- No webhook contract changes
- No lead‑detection rule changes
- No outbound‑mapping modifications (Telegram/Website payload mappers unchanged)
- No FAQ‑rule alterations

## Implementation Strategy

### Chosen Option: Pipeline‑Internal Merge
**Location**: `src/channels/unified‑inbound‑pipeline/index.ts`  
**Logic**:  
```typescript
if (lead_capture_prompt && replyText) {
  replyText = `${replyText}\n\n${lead_capture_prompt}`;
  lead_capture_prompt = null; // cleaned after merge
}
```

**Why this option**:  
- Keeps merge logic in one place (pipeline)  
- Outbound mappers stay simple (just send `reply_text`)  
- Consistent across all channels (Telegram, Website, etc.)

### Alternative Considered (Not Implemented)
Option B: Merge in outbound mappers (`mapTelegramOutboundPayload` / `mapWebsiteOutboundPayload`)  
**Rejected** because it would duplicate logic across channels.

## Behavior Matrix

| Scenario | FAQ Hit? | Lead Status | `reply_text` (User Sees) | `lead_capture_prompt` |
|----------|----------|-------------|--------------------------|----------------------|
| Normal message | No | `none` | Original message | `null` |
| FAQ match | Yes | `none` | FAQ answer | `null` |
| Partial lead | No | `partial` | Original + prompt | `null` (merged) |
| Partial lead | Yes | `partial` | FAQ answer + prompt | `null` (merged) |
| Captured, no FAQ | No | `captured` | Confirmation sentence | `null` |
| Captured, FAQ hit | Yes | `captured` | FAQ answer (no confirmation) | `null` |

### Key Points
1. **FAQ priority** – FAQ hits suppress captured confirmation (as before).
2. **Prompt merging** – Only when `lead_capture_prompt` exists **and** `replyText` exists.
3. **Captured confirmation** – Unaffected (already a complete `reply_text` replacement).
4. **Empty replyText** – If `replyText` is `null`/empty, prompt is not merged (edge case).

## Files Changed
1. `src/channels/unified‑inbound‑pipeline/index.ts` – Added prompt‑merge logic (lines ~70‑80)

## Verification
- ✅ `npm run build` passes
- ✅ Dual webhook baseline unchanged (200 OK)
- ✅ `debug_metadata.leadCaptureResult` preserved
- ✅ `lead_capture_prompt` cleaned to `null` after merge
- ✅ User sees merged text (original/FAQ + prompt)

## Test Cases
1. **Partial lead, no FAQ** → `"User message\n\nPlease provide your phone and email..."`
2. **Partial lead, FAQ hit** → `"FAQ answer\n\nPlease provide your phone and email..."`
3. **Captured, no FAQ** → `"Thank you! Your contact information has been received."` (no merge)
4. **Captured, FAQ hit** → `"FAQ answer"` (no confirmation, no prompt)

## Boundaries Held
- Webhook contracts unchanged
- Lead‑detection rules unchanged
- Outbound mappers unchanged (they just send `reply_text`)
- Minimal diff – only the merge logic added