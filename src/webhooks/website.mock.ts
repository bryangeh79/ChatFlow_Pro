import { handleWebsiteWebhook } from './website';

export const websiteWebhookSuccessSample = handleWebsiteWebhook({
  id: 'web-msg-002',
  user_id: 'visitor-456',
  session_id: 'session-def',
  text: 'Hello from the website',
  language: 'en',
  timestamp: '2026-04-03T11:07:00.000Z',
});

export const websiteWebhookFailureSample = handleWebsiteWebhook({
  id: 'broken-001',
  text: 'missing session fields',
});
