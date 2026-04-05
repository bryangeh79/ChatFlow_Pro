import { normalizeWhatsAppInbound, type WhatsAppRawInboundEvent } from './index';

export const whatsappMockInbound: WhatsAppRawInboundEvent = {
  id: 'wa-msg-001',
  from: 'wa-user-1',
  conversation_id: 'wa-chat-1',
  text: 'Can you help me?',
  timestamp: '2026-04-03T10:57:30.000Z',
};

export const whatsappMockNormalized = normalizeWhatsAppInbound(whatsappMockInbound);
