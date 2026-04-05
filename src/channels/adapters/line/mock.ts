import { normalizeLineInbound, type LineRawInboundEvent } from './index';

export const lineMockInbound: LineRawInboundEvent = {
  id: 'line-msg-001',
  userId: 'line-user-1',
  conversationId: 'line-chat-1',
  text: 'Hi, I need details',
  timestamp: '2026-04-03T10:58:30.000Z',
};

export const lineMockNormalized = normalizeLineInbound(lineMockInbound);
