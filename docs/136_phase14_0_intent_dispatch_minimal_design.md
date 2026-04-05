# Phase 14.0 Intent Dispatch Minimal Design

## Overview
This phase introduces a minimal intent classification system that analyzes user messages to determine their primary intent, enabling better routing between FAQ matching, lead capture, and fallback responses.

## Problem Statement
The current system has limited intent understanding:
- **Placeholder only**: Always returns `intent: 'unknown'`, `confidence: 0`
- **No routing intelligence**: FAQ and lead capture run independently
- **No prioritization**: Both capabilities run regardless of user intent

**Issue**: System can't prioritize responses based on what the user actually wants (FAQ info vs lead capture vs casual chat).

## Solution: Minimal Intent Classification
Introduce a simple intent classification system with 4 intent types:

### 1. Intent Types

| Intent | Description | Priority | Triggers |
|--------|-------------|----------|----------|
| **`faq_candidate`** | User likely wants FAQ information | High | Contains FAQ keywords, question words, information-seeking phrases |
| **`lead_candidate`** | User likely wants to provide contact info | Medium | Contains contact keywords, name/phone/email patterns, explicit contact intent |
| **`chitchat_fallback`** | Casual conversation, no specific intent | Low | Greetings, small talk, unclear statements |
| **`unknown`** | Cannot determine intent (fallback) | Lowest | Default when no other intent detected |

### 2. Priority Order
When multiple intents could apply (e.g., message contains both FAQ and lead keywords):
1. **`lead_candidate`** (highest) - Lead capture is most valuable for business
2. **`faq_candidate`** (medium) - FAQ provides immediate information
3. **`chitchat_fallback`** (low) - Casual conversation
4. **`unknown`** (lowest) - Fallback

### 3. Integration with Existing Capabilities

#### Current Flow (Before):
```
Message → FAQ matching → Lead capture → Response
```

#### New Flow (After):
```
Message → Intent classification → Route based on intent:
  - faq_candidate: Run FAQ matching (prioritized)
  - lead_candidate: Run lead capture (prioritized)  
  - chitchat_fallback: Run both (no prioritization)
  - unknown: Run both (no prioritization)
```

## Implementation Design

### Files Changed
1. **`src/channels/unified-inbound-pipeline/intent-dispatch.ts`**:
   - Update `UnifiedIntentPreparationResult` interface with real intent types
   - Implement `prepareUnifiedInboundIntent()` with simple keyword-based classification
   - Implement `dispatchUnifiedInboundIntent()` with intent-based routing
   - Update `UnifiedDispatchPlaceholderResult` with meaningful `nextStage` values

2. **`src/channels/unified-inbound-pipeline/faq-resolver.ts`** (optional):
   - May read intent to adjust matching behavior (e.g., skip FAQ for `lead_candidate`)

### No Changes To:
- Webhook routes (all 7 remain 200 OK)
- Session store (TTL + count limits unchanged)
- Lead capture (validation + persistence unchanged)
- FAQ seed registry (multilingual content unchanged)

## Detailed Implementation

### 1. Intent Detection Logic (`prepareUnifiedInboundIntent`)

#### FAQ Candidate Detection
- **Keywords**: `what`, `how`, `when`, `where`, `why`, `can`, `help`, `support`, `information`
- **Question patterns**: Ends with `?`, contains question words
- **FAQ-specific**: Matches FAQ seed keywords from any language

#### Lead Candidate Detection  
- **Explicit contact intent**: From existing `detectContactIntent()` function
- **Contact info patterns**: Name, phone, email patterns (from lead capture)
- **Business keywords**: `contact`, `sales`, `quote`, `pricing`, `buy`, `order`

#### Chitchat Fallback Detection
- **Greetings**: `hello`, `hi`, `hey`, `good morning`, `good afternoon`
- **Small talk**: `how are you`, `what's up`, `thanks`, `thank you`
- **Farewells**: `bye`, `goodbye`, `see you`

#### Confidence Scoring
- **High (0.8-1.0)**: Clear match with multiple signals
- **Medium (0.5-0.7)**: Some signals present
- **Low (0.1-0.4)**: Weak or ambiguous signals
- **Zero (0)**: No signals detected

### 2. Dispatch Logic (`dispatchUnifiedInboundIntent`)

#### Next Stage Values
- **`prioritize_faq`**: Run FAQ matching first, lead capture only if FAQ misses
- **`prioritize_lead`**: Run lead capture first, FAQ only if no lead detected
- **`run_both`**: Run both capabilities (no prioritization)
- **`pass_through`**: Original behavior (both run independently)

#### Dispatch Rules
| Intent | Confidence | Next Stage | Rationale |
|--------|------------|------------|-----------|
| `faq_candidate` | ≥0.5 | `prioritize_faq` | User wants information, FAQ first |
| `faq_candidate` | <0.5 | `run_both` | Weak FAQ signal, try both |
| `lead_candidate` | ≥0.5 | `prioritize_lead` | User wants to provide contact, lead first |
| `lead_candidate` | <0.5 | `run_both` | Weak lead signal, try both |
| `chitchat_fallback` | any | `run_both` | Casual chat, no prioritization |
| `unknown` | any | `pass_through` | Original behavior (backward compatibility) |

### 3. Integration with Pipeline

#### Modified Pipeline Flow
```typescript
// 1. Prepare intent
const intent = prepareUnifiedInboundIntent(message, session);

// 2. Dispatch based on intent
const dispatch = dispatchUnifiedInboundIntent(intent);

// 3. Run capabilities based on dispatch.nextStage
let faqResult, leadResult;

switch (dispatch.nextStage) {
  case 'prioritize_faq':
    faqResult = runFaqMatching(message, session);
    if (!faqResult.matched) {
      leadResult = runLeadCapture(message, session);
    }
    break;
    
  case 'prioritize_lead':
    leadResult = runLeadCapture(message, session);
    if (leadResult.status === 'none') {
      faqResult = runFaqMatching(message, session);
    }
    break;
    
  case 'run_both':
    faqResult = runFaqMatching(message, session);
    leadResult = runLeadCapture(message, session);
    break;
    
  case 'pass_through':
  default:
    // Original behavior
    faqResult = runFaqMatching(message, session);
    leadResult = runLeadCapture(message, session);
    break;
}
```

## Interface Definitions

### Updated Interfaces
```typescript
export type UnifiedIntentType = 
  | 'faq_candidate'      // User wants FAQ information
  | 'lead_candidate'     // User wants to provide contact info  
  | 'chitchat_fallback'  // Casual conversation
  | 'unknown';           // Cannot determine (fallback)

export interface UnifiedIntentPreparationResult {
  intent: UnifiedIntentType;
  confidence: number;    // 0.0 to 1.0
  signals: string[];     // What triggered this intent
}

export type UnifiedDispatchStage =
  | 'prioritize_faq'     // Run FAQ first, lead only if FAQ misses
  | 'prioritize_lead'    // Run lead first, FAQ only if no lead
  | 'run_both'           // Run both (no prioritization)
  | 'pass_through';      // Original behavior

export interface UnifiedDispatchPlaceholderResult {
  nextStage: UnifiedDispatchStage;
  capability: 'faq' | 'lead' | 'both' | 'none';
}
```

## Examples

### Example 1: FAQ Candidate
```
User: "What are your business hours?"
→ Intent: faq_candidate (confidence: 0.9, signals: ["what", "hours", "?"])
→ Dispatch: prioritize_faq
→ Result: FAQ matching runs first, finds hours entry, returns answer
```

### Example 2: Lead Candidate
```
User: "I want to contact sales, my name is John, phone 123-456-7890"
→ Intent: lead_candidate (confidence: 0.8, signals: ["contact", "sales", "name", "phone"])
→ Dispatch: prioritize_lead  
→ Result: Lead capture runs first, extracts name/phone, prompts for email
```

### Example 3: Chitchat Fallback
```
User: "Hello, how are you today?"
→ Intent: chitchat_fallback (confidence: 0.7, signals: ["hello", "how are you"])
→ Dispatch: run_both
→ Result: Both FAQ and lead run, likely no matches, generic response
```

### Example 4: Ambiguous (Run Both)
```
User: "I need information about pricing"
→ Intent: faq_candidate (confidence: 0.4, signals: ["information", "pricing"])
→ Dispatch: run_both (confidence < 0.5)
→ Result: Both run, FAQ might match pricing, lead might detect contact intent
```

## Constraints & Boundaries

### No Menu/State Machine
- **No conversation states**: Intent is per-message, not tracked across turns
- **No user choices**: No "select option 1, 2, 3" menu system
- **No branching logic**: Simple linear flow based on single intent
- **No persistence**: Intent not saved to session (recalculated each message)

### Minimal Scope
- **Keyword-based only**: No ML/NLP models
- **Simple rules**: If-else logic, not complex classification
- **Limited signals**: Only message text, no other context
- **Backward compatible**: `unknown` intent preserves original behavior

## Impact on Existing System

### No Breaking Changes
- **Webhook responses**: Unchanged (still 200 OK)
- **Session store**: Unchanged (TTL + count limits still apply)
- **Lead capture**: Unchanged (validation + persistence still work)
- **FAQ matching**: Unchanged (language priority matching still works)

### Behavioral Improvements
1. **Better routing**: Intent-based prioritization of FAQ vs lead capture
2. **Reduced conflicts**: Less "抢答" (both capabilities responding)
3. **Improved UX**: More relevant responses based on user intent
4. **Debug information**: Intent signals help understand system decisions

### Performance Impact
- **Minimal overhead**: Simple keyword matching on message text
- **No external calls**: All logic local, no API calls
- **Early returns**: Can skip unnecessary capability runs

## Testing Considerations

### Test Scenarios
1. **Clear FAQ intent**: Should prioritize FAQ matching
2. **Clear lead intent**: Should prioritize lead capture
3. **Chitchat**: Should run both (no prioritization)
4. **Ambiguous**: Should run both (low confidence)
5. **No intent**: Should use pass-through (original behavior)
6. **Mixed signals**: Should use priority order (lead > FAQ > chitchat)

### Verification Points
- ✅ Intent detection works for all 4 intent types
- ✅ Dispatch logic follows defined rules
- ✅ Pipeline integrates intent correctly
- ✅ No regression in FAQ/lead functionality
- ✅ Backward compatibility maintained

## Future Extension Points

### Enhanced Intent Detection
1. **More signals**: Session history, user profile, time of day
2. **Pattern learning**: Track which intents lead to successful outcomes
3. **ML integration**: Simple classifier for better accuracy
4. **Context awareness**: Consider previous messages in conversation

### Additional Intents
1. **`handoff_request`**: User wants human agent
2. **`complaint`**: User has issue/concern
3. **`feedback`**: User providing feedback
4. **`transactional`**: User wants to complete transaction

### Advanced Dispatch
1. **Confidence thresholds**: Configurable thresholds for each intent
2. **A/B testing**: Test different dispatch strategies
3. **Analytics**: Track intent distribution and success rates
4. **Dynamic adjustment**: Adjust based on time, channel, user segment

## Verification
- ✅ `npm run build` passes
- ✅ All 7 webhook routes remain 200 OK
- ✅ No changes to webhook contract
- ✅ Intent system integrates with existing pipeline
- ✅ Backward compatibility maintained via `unknown` intent

## Next Steps After Implementation
1. **Monitor effectiveness**: Track if intent classification improves user experience
2. **Refine detection**: Adjust keywords and thresholds based on real usage
3. **Add more intents**: Expand beyond initial 4 as needed
4. **Integrate with analytics**: Log intents for analysis and improvement