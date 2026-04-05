# Phase 11.45 Lead Outbound i18n + Empty‑Reply Fallback

## Scope

### What This Phase Does
1. **Empty‑reply fallback** – When `partial` and `lead_capture_prompt` exists but `replyText` is empty/null, the final `reply_text` becomes the prompt itself (no silent drop).
2. **Four‑language i18n** – `partial` prompts and `captured` confirmations now support zh/en/vi/ms‑MY based on `session.current_language` (falls back to English).
3. **Documentation** – This document explains the behavior matrix including FAQ hits, partial, captured, and empty‑text scenarios.

### What This Phase Does NOT Do
- No webhook changes
- No lead‑detection rule changes
- No outbound‑mapper modifications
- No FAQ‑rule alterations

## Implementation Details

### i18n Resource File
**Location**: `src/channels/lead‑capture‑hook/i18n.ts`  
**Structure**:  
```typescript
const i18nMap = {
  'zh': { partialPrompt: (fields) => `请提供您的${fields}...`, capturedConfirmation: '谢谢！...' },
  'en': { partialPrompt: (fields) => `Please provide your ${fields}...`, ... },
  'vi': { ... },
  'ms‑MY': { ... },
};
```

**Lookup**:  
```typescript
const i18n = getLeadCaptureI18n(session); // falls back to 'en'
```

### Fallback Logic (Empty Reply)
**Before**:  
```typescript
if (lead_capture_prompt && replyText) {
  replyText = `${replyText}\n\n${lead_capture_prompt}`;
  lead_capture_prompt = null;
}
// If replyText empty, prompt was silently dropped
```

**After**:  
```typescript
if (lead_capture_prompt) {
  if (replyText) {
    replyText = `${replyText}\n\n${lead_capture_prompt}`;
    lead_capture_prompt = null;
  } else {
    // Fallback: empty reply → prompt becomes main reply
    replyText = lead_capture_prompt;
    lead_capture_prompt = null;
  }
}
```

## Behavior Matrix

| Scenario | FAQ Hit? | Lead Status | `replyText` Before | Final `reply_text` (User Sees) |
|----------|----------|-------------|-------------------|--------------------------------|
| Normal message | No | `none` | "Hello" | "Hello" |
| FAQ match | Yes | `none` | FAQ answer | FAQ answer |
| Partial lead, normal reply | No | `partial` | "My name is John" | "My name is John<br><br>[i18n prompt]" |
| Partial lead, FAQ hit | Yes | `partial` | FAQ answer | FAQ answer + prompt |
| **Partial lead, empty reply** | No | `partial` | `null`/empty | **[i18n prompt]** (fallback) |
| Captured, no FAQ | No | `captured` | (replaced) | "[i18n confirmation]" |
| Captured, FAQ hit | Yes | `captured` | FAQ answer | FAQ answer (no confirmation) |

### Language Fallback Chain
1. Use `session.current_language` (zh/en/vi/ms‑MY)
2. If language not in map → fallback to `en`
3. If `session.current_language` is `null` → fallback to `en`

### Field Translation in Prompts
Missing fields are translated in prompts:
- `['phone', 'email']` → "电话和邮箱" (zh), "số điện thoại và email" (vi), etc.

## Files Changed
1. `src/channels/lead‑capture‑hook/i18n.ts` – Four‑language resource file
2. `src/channels/unified‑inbound‑pipeline/index.ts` – Added i18n lookup and empty‑reply fallback

## Verification
- ✅ `npm run build` passes
- ✅ Dual webhook baseline unchanged (200 OK)
- ✅ i18n strings for all four languages
- ✅ Empty‑reply fallback works
- ✅ Language fallback to English

## Test Cases
1. **Partial, empty reply, zh language** → Chinese prompt
2. **Partial, FAQ hit, vi language** → Vietnamese prompt appended to FAQ
3. **Captured, no FAQ, ms‑MY** → Malay confirmation
4. **Unknown language code** → English fallback
5. **Null session language** → English fallback

## Boundaries Held
- Webhook contracts unchanged
- Lead‑detection rules unchanged  
- Outbound mappers unchanged
- Minimal diff – only i18n + fallback logic added