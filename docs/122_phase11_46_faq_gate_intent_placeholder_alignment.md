# Phase 11.46 FAQ Gate Fix · Intent Placeholder Alignment

## Scope

### What This Phase Does
1. **FAQ gate fix** – `resolveUnifiedFaqSkeleton` now allows FAQ matching when user text is non‑empty, regardless of the placeholder `dispatch.nextStage === 'pass‑through'`.
2. **Documentation** – This document explains current behavior and the transition path for future real intent dispatch.

### What This Phase Does NOT Do
- No webhook changes
- No FAQ seed content changes
- No intent‑dispatch implementation (still placeholder)
- No lead‑capture rule changes

## Implementation Fix

### Before (Bug)
```typescript
const shouldConsiderFaq = dispatch.nextStage === 'pass-through' ? false : true;
// Result: always false because dispatch is placeholder (pass‑through)
```

### After (Fixed)
```typescript
const shouldConsiderFaq = normalizedCandidate.length > 0;
// Result: true when user text is non‑empty
```

### Why This Was a Bug
- `dispatchUnifiedInboundIntent` returns `{ nextStage: 'pass‑through', capability: 'none' }` (placeholder)
- The old gate `dispatch.nextStage === 'pass‑through' ? false : true` meant FAQ was **never** considered
- This broke the FAQ flow entirely during the placeholder phase

## Current Behavior (Post‑Fix)

| Condition | FAQ Considered? | Result |
|-----------|----------------|--------|
| User text empty/null | No | `matched: false` |
| User text non‑empty | Yes | FAQ matching runs |
| Dispatch placeholder | Ignored | FAQ matching runs |
| Real keywords match | Yes | `matched: true` |

**Key**: FAQ matching now works with the existing seed entries (greeting, availability, support, contact, hours).

## Future Transition Path

### When Real Intent Dispatch Is Implemented
The gate should evolve to:

```typescript
// Future logic (not implemented yet)
const shouldConsiderFaq = 
  normalizedCandidate.length > 0 && 
  (dispatch.nextStage === 'pass‑through' || 
   dispatch.capability === 'faq' || 
   dispatch.capability === 'general');
```

### Transition Steps
1. **Current (Phase 11.46)**: Simple text‑non‑empty gate (fixed)
2. **Future with intent**: Add dispatch‑based filtering (e.g., exclude FAQ when `capability === 'lead_capture'`)
3. **Final**: Full intent‑aware FAQ routing

### Backward Compatibility
The fix maintains compatibility:
- Existing webhooks unchanged
- Lead capture flows unchanged  
- FAQ matching restored
- Debug metadata unchanged

## Files Changed
1. `src/channels/unified‑inbound‑pipeline/faq‑resolver.ts` – Line 33‑34 gate fix

## Verification
- ✅ `npm run build` passes
- ✅ Dual webhook baseline unchanged (200 OK)
- ✅ FAQ matching now works with seed entries
- ✅ `faq_hit` path restored in debug steps

## Test Example
**Message**: "hello" or "start"  
**Before**: `matched: false` (gate blocked)  
**After**: `matched: true`, `answer: "Send a message to begin."`  
**Debug**: `debug_steps` includes `'faq_hit'`