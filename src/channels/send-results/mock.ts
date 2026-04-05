import { createSendSuccessResult } from './index';

export const sendResultMock = createSendSuccessResult({
  channel: 'website',
  session_id: 'website:visitor-123:session-abc',
  message_trace_id: 'trace-001',
  provider_message_id: 'provider-msg-001',
  retryable: false,
  error: null,
  sent_at: new Date().toISOString(),
  debug_steps: ['mapped', 'sent'],
  trace_id: 'trace-root-001',
  request_id: 'req-001',
});
