import { normalizeWebsiteInbound, type WebsiteRawInboundEvent } from './index';

export const websiteMockInbound: WebsiteRawInboundEvent = {
  id: 'web-msg-001',
  user_id: 'visitor-123',
  session_id: 'session-abc',
  text: 'Hello, I need help',
  language: 'en',
  timestamp: '2026-04-03T10:55:00.000Z',
};

export const websiteMockNormalized = normalizeWebsiteInbound(websiteMockInbound);
