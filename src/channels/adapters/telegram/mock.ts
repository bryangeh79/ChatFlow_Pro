import { normalizeTelegramInbound, type TelegramRawInboundEvent } from './index';

export const telegramMockInbound: TelegramRawInboundEvent = {
  update_id: 'tg-upd-001',
  from: { id: 'tg-user-1', username: 'guest', language_code: 'en' },
  chat: { id: 'tg-chat-1' },
  text: 'Need pricing info',
  timestamp: '2026-04-03T10:57:00.000Z',
};

export const telegramMockNormalized = normalizeTelegramInbound(telegramMockInbound);
