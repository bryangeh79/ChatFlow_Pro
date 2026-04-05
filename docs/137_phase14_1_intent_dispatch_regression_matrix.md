# Phase 14.1 Intent Dispatch Regression Matrix

## Overview
This document provides a comprehensive regression test matrix for the intent dispatch system implemented in Phase 14.0. It defines expected behaviors for each dispatch stage across various user message scenarios.

## Test Matrix Structure
Each test case includes:
- **User Message**: Example input text
- **Expected Intent**: Predicted intent type
- **Expected Confidence**: Approximate confidence range
- **Expected nextStage**: Dispatch stage based on intent and confidence
- **Lead Hook Run?**: Whether lead capture hook should execute
- **FAQ Run?**: Whether FAQ matching should execute
- **Priority Order**: Which runs first (if both run)
- **Typical Reply**: Expected response content

## Regression Test Matrix

### 1. prioritize_faq Stage Tests

#### Test 1.1: Clear FAQ Question (English)
| Aspect | Value |
|--------|-------|
| **User Message** | "What are your business hours?" |
| **Expected Intent** | `faq_candidate` |
| **Expected Confidence** | 0.8-0.9 |
| **Expected nextStage** | `prioritize_faq` |
| **Lead Hook Run?** | Only if FAQ misses |
| **FAQ Run?** | Yes (first) |
| **Priority Order** | FAQ → (if no match) → Lead |
| **Typical Reply** | "We respond through the shared webhook baseline." |

#### Test 1.2: Clear FAQ Question (Chinese)
| Aspect | Value |
|--------|-------|
| **User Message** | "你们的工作时间是什么？" |
| **Expected Intent** | `faq_candidate` |
| **Expected Confidence** | 0.8-0.9 |
| **Expected nextStage** | `prioritize_faq` |
| **Lead Hook Run?** | Only if FAQ misses |
| **FAQ Run?** | Yes (first) |
| **Priority Order** | FAQ → (if no match) → Lead |
| **Typical Reply** | "我们通过共享的webhook基线进行回复。" |

#### Test 1.3: FAQ Keyword Match
| Aspect | Value |
|--------|-------|
| **User Message** | "I need help with pricing information" |
| **Expected Intent** | `faq_candidate` |
| **Expected Confidence** | 0.6-0.7 |
| **Expected nextStage** | `prioritize_faq` |
| **Lead Hook Run?** | Only if FAQ misses |
| **FAQ Run?** | Yes (first) |
| **Priority Order** | FAQ → (if no match) → Lead |
| **Typical Reply** | FAQ answer or generic response if no match |

#### Test 1.4: Question Mark Only
| Aspect | Value |
|--------|-------|
| **User Message** | "?" |
| **Expected Intent** | `faq_candidate` |
| **Expected Confidence** | 0.3-0.4 |
| **Expected nextStage** | `run_both` (confidence < 0.5) |
| **Lead Hook Run?** | Yes |
| **FAQ Run?** | Yes |
| **Priority Order** | Both run (no priority) |
| **Typical Reply** | Generic response or prompt for clarification |

### 2. prioritize_lead Stage Tests

#### Test 2.1: Explicit Contact Intent
| Aspect | Value |
|--------|-------|
| **User Message** | "I want to contact sales for a quote" |
| **Expected Intent** | `lead_candidate` |
| **Expected Confidence** | 0.7-0.8 |
| **Expected nextStage** | `prioritize_lead` |
| **Lead Hook Run?** | Yes (first) |
| **FAQ Run?** | Only if lead status is 'none' |
| **Priority Order** | Lead → (if status 'none') → FAQ |
| **Typical Reply** | Lead capture prompt or confirmation |

#### Test 2.2: Name + Phone Provided
| Aspect | Value |
|--------|-------|
| **User Message** | "My name is John, phone 13800138000" |
| **Expected Intent** | `lead_candidate` |
| **Expected Confidence** | 0.8-0.9 |
| **Expected nextStage** | `prioritize_lead` |
| **Lead Hook Run?** | Yes (first) |
| **FAQ Run?** | Only if lead status is 'none' |
| **Priority Order** | Lead → (if status 'none') → FAQ |
| **Typical Reply** | Partial prompt for missing email |

#### Test 2.3: Complete Contact Info
| Aspect | Value |
|--------|-------|
| **User Message** | "Name: Jane, Phone: 13900139000, Email: jane@example.com" |
| **Expected Intent** | `lead_candidate` |
| **Expected Confidence** | 0.9-1.0 |
| **Expected nextStage** | `prioritize_lead` |
| **Lead Hook Run?** | Yes (first) |
| **FAQ Run?** | Only if lead status is 'none' |
| **Priority Order** | Lead → (if status 'none') → FAQ |
| **Typical Reply** | Captured confirmation |

#### Test 2.4: Weak Lead Signal
| Aspect | Value |
|--------|-------|
| **User Message** | "maybe contact later" |
| **Expected Intent** | `lead_candidate` |
| **Expected Confidence** | 0.4-0.5 |
| **Expected nextStage** | `run_both` (confidence < 0.5) |
| **Lead Hook Run?** | Yes |
| **FAQ Run?** | Yes |
| **Priority Order** | Both run (no priority) |
| **Typical Reply** | Generic response |

### 3. run_both Stage Tests

#### Test 3.1: Chitchat Greeting
| Aspect | Value |
|--------|-------|
| **User Message** | "Hello, how are you today?" |
| **Expected Intent** | `chitchat_fallback` |
| **Expected Confidence** | 0.7-0.8 |
| **Expected nextStage** | `run_both` |
| **Lead Hook Run?** | Yes |
| **FAQ Run?** | Yes |
| **Priority Order** | Both run (no priority) |
| **Typical Reply** | Generic greeting response |

#### Test 3.2: Casual Thanks
| Aspect | Value |
|--------|-------|
| **User Message** | "Thank you for your help!" |
| **Expected Intent** | `chitchat_fallback` |
| **Expected Confidence** | 0.6-0.7 |
| **Expected nextStage** | `run_both` |
| **Lead Hook Run?** | Yes |
| **FAQ Run?** | Yes |
| **Priority Order** | Both run (no priority) |
| **Typical Reply** | "You're welcome" or similar |

#### Test 3.3: Low Confidence FAQ
| Aspect | Value |
|--------|-------|
| **User Message** | "information about services" |
| **Expected Intent** | `faq_candidate` |
| **Expected Confidence** | 0.4-0.5 |
| **Expected nextStage** | `run_both` (confidence < 0.5) |
| **Lead Hook Run?** | Yes |
| **FAQ Run?** | Yes |
| **Priority Order** | Both run (no priority) |
| **Typical Reply** | FAQ answer or generic response |

#### Test 3.4: Low Confidence Lead
| Aspect | Value |
|--------|-------|
| **User Message** | "thinking about buying" |
| **Expected Intent** | `lead_candidate` |
| **Expected Confidence** | 0.3-0.4 |
| **Expected nextStage** | `run_both` (confidence < 0.5) |
| **Lead Hook Run?** | Yes |
| **FAQ Run?** | Yes |
| **Priority Order** | Both run (no priority) |
| **Typical Reply** | Generic response |

### 4. pass_through Stage Tests

#### Test 4.1: Empty Message
| Aspect | Value |
|--------|-------|
| **User Message** | "" |
| **Expected Intent** | `unknown` |
| **Expected Confidence** | 0.0 |
| **Expected nextStage** | `pass_through` |
| **Lead Hook Run?** | Yes |
| **FAQ Run?** | Yes |
| **Priority Order** | Lead → FAQ (original behavior) |
| **Typical Reply** | No response or error handling |

#### Test 4.2: Unclear Statement
| Aspect | Value |
|--------|-------|
| **User Message** | "The weather is nice today" |
| **Expected Intent** | `unknown` |
| **Expected Confidence** | 0.1-0.2 |
| **Expected nextStage** | `pass_through` |
| **Lead Hook Run?** | Yes |
| **FAQ Run?** | Yes |
| **Priority Order** | Lead → FAQ (original behavior) |
| **Typical Reply** | Generic response or no match |

#### Test 4.3: Technical Jargon
| Aspect | Value |
|--------|-------|
| **User Message** | "API endpoint configuration parameters" |
| **Expected Intent** | `unknown` |
| **Expected Confidence** | 0.1-0.2 |
| **Expected nextStage** | `pass_through` |
| **Lead Hook Run?** | Yes |
| **FAQ Run?** | Yes |
| **Priority Order** | Lead → FAQ (original behavior) |
| **Typical Reply** | Generic response or no match |

### 5. Edge Case Tests

#### Test 5.1: Mixed FAQ and Lead Signals
| Aspect | Value |
|--------|-------|
| **User Message** | "What are your hours? Also my name is Bob" |
| **Expected Intent** | `lead_candidate` (priority: lead > faq) |
| **Expected Confidence** | 0.7-0.8 |
| **Expected nextStage** | `prioritize_lead` |
| **Lead Hook Run?** | Yes (first) |
| **FAQ Run?** | Only if lead status is 'none' |
| **Priority Order** | Lead → (if status 'none') → FAQ |
| **Typical Reply** | Lead capture prompt (name detected) |

#### Test 5.2: FAQ Question with Contact Keyword
| Aspect | Value |
|--------|-------|
| **User Message** | "How can I contact support?" |
| **Expected Intent** | `faq_candidate` (contains "how" + "contact") |
| **Expected Confidence** | 0.7-0.8 |
| **Expected nextStage** | `prioritize_faq` |
| **Lead Hook Run?** | Only if FAQ misses |
| **FAQ Run?** | Yes (first) |
| **Priority Order** | FAQ → (if no match) → Lead |
| **Typical Reply** | FAQ answer about contact |

#### Test 5.3: Chitchat with Name
| Aspect | Value |
|--------|-------|
| **User Message** | "Hi, I'm Sarah" |
| **Expected Intent** | `chitchat_fallback` (greeting dominates) |
| **Expected Confidence** | 0.6-0.7 |
| **Expected nextStage** | `run_both` |
| **Lead Hook Run?** | Yes |
| **FAQ Run?** | Yes |
| **Priority Order** | Both run (no priority) |
| **Typical Reply** | Greeting response (name may be captured) |

## Known Boundaries & Limitations

### 1. prioritize_lead with Existing Partial Session (FIXED in Phase 14.2)
**Scenario**: User has partial lead capture session (e.g., name provided, missing phone/email), sends new message.

**Original Behavior (Phase 14.0-14.1)**:
- Intent detection runs on new message only (doesn't consider session state)
- If new message has no lead signals → may get `faq_candidate` or `chitchat_fallback`
- Dispatch may prioritize FAQ over continuing lead capture

**Fixed Behavior (Phase 14.2+)**:
- When `prioritize_lead` is selected and session is `partial`:
  - Check if current message has new lead signals (explicit intent or detected fields)
  - If NO new lead signals: Allow FAQ to run (user may be asking unrelated question)
  - If HAS new lead signals: Skip FAQ (user is continuing lead capture)

**Example Flow (Fixed)**:
```
Message 1: "My name is John" → lead_candidate → partial capture (missing phone/email)
Message 2: "What are your hours?" → lead_candidate (weak) → prioritize_lead
→ Check: No new lead signals in message 2
→ Result: FAQ runs, answers hours question, partial state persists
Message 3: "My phone is 13800138000" → lead_candidate → prioritize_lead  
→ Check: Has new lead signal (phone)
→ Result: Lead capture runs, updates partial state, FAQ skipped
```

**Implementation Details**:
```typescript
// In prioritize_lead branch:
const contactDetection = detectContactIntent(message);
const hasNewLeadSignals = contactDetection.hasExplicitContactIntent || 
                         contactDetection.detectedFields.name || 
                         contactDetection.detectedFields.phone || 
                         contactDetection.detectedFields.email;

const shouldRunFaq = 
  sessionAfterLeadCapture.lead_capture_state.status === 'none' ||
  (sessionAfterLeadCapture.lead_capture_state.status === 'partial' && !hasNewLeadSignals);
```

**Updated Test Case**:
| Aspect | Value |
|--------|-------|
| **Scenario** | Existing partial session, new message without lead signals |
| **User Message** | "What are your hours?" (after providing name) |
| **Session State** | `partial` (name provided) |
| **New Lead Signals** | None |
| **Expected Behavior** | FAQ should run (user asking unrelated question) |
| **Lead Hook Run?** | Yes (updates last_seen_at but no new fields) |
| **FAQ Run?** | Yes (allowed because no new lead signals) |
| **Result** | FAQ answer provided, partial state persists for next turn |

### 2. Confidence Threshold Sensitivity
**Issue**: Confidence thresholds (0.5 for `prioritize_faq`/`prioritize_lead`) are hardcoded and may not be optimal for all scenarios.

**Examples of threshold sensitivity**:
- Confidence 0.49 → `run_both` (no priority)
- Confidence 0.51 → `prioritize_faq`/`prioritize_lead`

**Impact**: Small variations in signal detection can cause different dispatch behavior.

### 3. Language Detection vs Intent Detection
**Interaction**: FAQ language priority matching uses `session.current_language`, intent detection uses message text only.

**Potential Conflict**:
- User sends English message but `session.current_language` is Chinese
- FAQ matching prioritizes Chinese entries (may miss)
- Intent detection works on English text

**Result**: Intent may be correct but FAQ matching may be in wrong language.

### 4. Signal Overlap and Priority
**Priority Order**: `lead_candidate` > `faq_candidate` > `chitchat_fallback` > `unknown`

**Edge Cases**:
- Message contains both strong FAQ and strong lead signals → `lead_candidate` wins
- Message contains FAQ signals and chitchat signals → `faq_candidate` wins
- This may not always match user intent

### 5. No Session State Consideration
**Limitation**: Intent detection only looks at current message, not:
- Previous messages in session
- Current lead capture state
- FAQ match history
- User profile or preferences

**Impact**: May miss context that would improve intent classification.

## Verification Checklist

### Core Functionality
- [ ] `prioritize_faq`: FAQ runs first, lead only if FAQ misses
- [ ] `prioritize_lead`: Lead runs first, FAQ only if lead status 'none'
- [ ] `run_both`: Both run with no priority
- [ ] `pass_through`: Original behavior (lead → FAQ)

### Intent Detection Accuracy
- [ ] FAQ questions correctly identified as `faq_candidate`
- [ ] Contact info correctly identified as `lead_candidate`
- [ ] Greetings correctly identified as `chitchat_fallback`
- [ ] Unclear messages fall back to `unknown`

### Confidence Scoring
- [ ] Clear signals produce high confidence (≥0.7)
- [ ] Weak signals produce medium confidence (0.3-0.6)
- [ ] No signals produce low confidence (≤0.2)
- [ ] Confidence thresholds work correctly (0.5 cutoff)

### Integration Points
- [ ] Intent detection integrates with existing lead capture detector
- [ ] Intent detection checks FAQ seed keywords
- [ ] Dispatch integrates with pipeline execution order
- [ ] Debug metadata includes intent information

## Test Execution Notes

### Manual Testing
For each test case in the matrix:
1. Send the user message via any webhook route
2. Check response `debug_metadata.intentPreparation`
3. Verify intent, confidence, and signals match expectations
4. Check `debug_metadata.dispatchResult.nextStage`
5. Verify lead capture and FAQ execution order
6. Verify response content

### Automated Testing Considerations
Potential test automation approach:
```typescript
// Pseudocode for test automation
const testCases = [
  {
    message: "What are your hours?",
    expectedIntent: "faq_candidate",
    expectedStage: "prioritize_faq",
    expectedLeadRun: "after_faq_miss",
    expectedFaqRun: true,
  },
  // ... more test cases
];

for (const test of testCases) {
  const result = runUnifiedInboundPipeline(test.message, mockSession);
  assert(result.intent === test.expectedIntent);
  assert(result.dispatch.nextStage === test.expectedStage);
  // ... more assertions
}
```

## Expected System Behavior Summary

### When prioritize_faq is selected:
1. Run FAQ matching first
2. If FAQ matches: return answer, skip lead capture
3. If FAQ misses: run lead capture
4. Lead capture may still find contact info even if FAQ missed

### When prioritize_lead is selected:
1. Run lead capture first
2. If lead status becomes 'partial' or 'captured': skip FAQ
3. If lead status remains 'none': run FAQ matching
4. FAQ may still match even if lead found nothing

### When run_both is selected:
1. Run lead capture
2. Run FAQ matching
3. No priority between them
4. Response logic handles potential conflicts (FAQ > captured > partial)

### When pass_through is selected:
1. Run lead capture
2. Run FAQ matching
3. Original priority order (lead → FAQ)
4. Backward compatibility with pre-intent-dispatch behavior

## Next Steps for Refinement

### Short-term Improvements
1. **Threshold tuning**: Adjust confidence thresholds based on real usage
2. **Signal weighting**: Give different weights to different signal types
3. **Session awareness**: Consider existing lead capture state in intent detection
4. **Boundary handling**: Special case for continuing partial lead sessions

### Long-term Enhancements
1. **ML-based classification**: Replace keyword-based with simple classifier
2. **Context awareness**: Consider conversation history
3. **A/B testing**: Test different dispatch strategies
4. **Analytics integration**: Track intent accuracy and user satisfaction

## Phase 14.2 Patch Notes

### Fix Applied
**Issue**: `prioritize_lead` stage was skipping FAQ when session was in `partial` state, even if the current message had no new lead signals.

**Problem**: Users in middle of lead capture who ask unrelated questions (e.g., "What are your hours?") would not get FAQ answers.

**Solution**: Modified `prioritize_lead` logic to check for new lead signals in current message:
- If session is `partial` AND current message has NO new lead signals → Allow FAQ to run
- If session is `partial` AND current message HAS new lead signals → Skip FAQ (continue lead capture)
- If session is `none` → Always allow FAQ (original behavior)
- If session is `captured` → Skip FAQ (lead already complete)

**Code Changes**:
- Modified `src/channels/unified-inbound-pipeline/index.ts` `prioritize_lead` branch
- Added `hasNewLeadSignals` check using `detectContactIntent()`
- Updated FAQ run decision logic

**Impact**: Better user experience for partial lead sessions, allowing mixed conversation (lead capture + FAQ questions).

## Conclusion
This regression matrix provides comprehensive coverage of the intent dispatch system's expected behaviors. It serves as both a verification guide and a reference for understanding the system's capabilities and limitations. The matrix should be updated as the system evolves and real-world usage patterns emerge.