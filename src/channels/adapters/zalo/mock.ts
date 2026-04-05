import { normalizeZaloInbound, type ZaloRawInboundEvent } from './index';

export const zaloMockInbound: ZaloRawInboundEvent = {
  id: 'zalo-msg-001',
  user_id: 'zalo-user-1',
  thread_id: 'zalo-thread-1',
  text: 'Please contact me',
  timestamp: '2026-04-03T10:59:00.000Z',
};

export const zaloMockNormalized = normalizeZaloInbound(zaloMockInbound);
