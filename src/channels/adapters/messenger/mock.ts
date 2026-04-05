import { normalizeMessengerInbound, type MessengerRawInboundEvent } from './index';

export const messengerMockInbound: MessengerRawInboundEvent = {
  mid: 'msgr-msg-001',
  sender: { id: 'msgr-user-1', name: 'Guest' },
  thread: { id: 'msgr-thread-1' },
  text: 'I want to talk to support',
  timestamp: '2026-04-03T10:58:00.000Z',
};

export const messengerMockNormalized = normalizeMessengerInbound(messengerMockInbound);
