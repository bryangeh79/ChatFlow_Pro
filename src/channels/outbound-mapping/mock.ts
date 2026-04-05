import type { UnifiedResponse } from '../../../shared/types/unified-response';
import { mapUnifiedResponseToOutboundPayload } from './index';

export const outboundMockResponse: UnifiedResponse = {
  channel: 'website',
  session_id: 'website:visitor-123:session-abc',
  kind: 'text',
  reply_text: 'Thanks, I can help with that.',
  should_send: true,
};

export const outboundMockPayload = mapUnifiedResponseToOutboundPayload(outboundMockResponse);
