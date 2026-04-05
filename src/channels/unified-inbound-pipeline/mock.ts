import type { UnifiedResponse } from '../../../shared/types/unified-response';
import { websiteMockNormalized } from '../adapters/website/mock';
import { runUnifiedInboundPipeline } from './index';

export const websiteMockPipelineResult: {
  response: UnifiedResponse;
} = {
  response: runUnifiedInboundPipeline(websiteMockNormalized).response,
};
