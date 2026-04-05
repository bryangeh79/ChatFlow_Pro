# Phase 11.35 Next Capability Candidate Evaluation

## Candidates Evaluated

- lead capture
- handoff

## Recommendation

Choose **lead capture** as the next real capability segment.

## Why Lead Capture

Lead capture is the better next step because:

- it can continue along the existing shared pipeline / capability-hook direction
- it can remain inside the shared session / response path without reopening webhook routing
- it has more direct product value at this point than handoff refinement
- it fits the "first finish, then perfect" approach better than handoff

## Why Not Handoff First

Handoff is more stateful and more operationally invasive:

- it pushes sooner into ownership / assignment / workflow semantics
- it is more likely to pull in state handling and edge cases
- it has a higher risk of widening beyond the current minimal shared path

## Current Conclusion

The next real capability segment should be lead capture, not further FAQ refinement and not handoff first.