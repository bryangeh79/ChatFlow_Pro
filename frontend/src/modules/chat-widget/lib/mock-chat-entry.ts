export type ChatWidgetInput = {
  conversationId?: string;
  message: string;
  preferredLanguage?: 'zh' | 'en' | 'vi' | 'ms-MY';
};

export type ChatWidgetMessageState = {
  id: string;
  content: string;
  senderType: 'visitor' | 'system';
  languageCode: 'zh' | 'en' | 'vi' | 'ms-MY';
};

export function mockChatEntry(input: ChatWidgetInput): ChatWidgetMessageState {
  return {
    id: input.conversationId ?? 'widget_mock',
    content: input.message,
    senderType: 'visitor',
    languageCode: input.preferredLanguage ?? 'en',
  };
}
