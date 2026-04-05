import type { HandoffSummary } from '../../../../../shared/types/handoff-summary';

export function buildHandoffSummary(input: HandoffSummary): HandoffSummary {
  return {
    ...input,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
  };
}
