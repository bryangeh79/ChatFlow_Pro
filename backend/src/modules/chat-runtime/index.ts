export type ChatRuntimeInput = {
  conversationId?: string;
  sessionId?: string;
  message: string;
  preferredLanguage?: 'zh' | 'en' | 'vi' | 'ms-MY';
  channel?: 'website';
};

export type ChatRuntimeOutput = {
  conversationId: string;
  language: 'zh' | 'en' | 'vi' | 'ms-MY';
  replyKey: 'welcome' | 'fallback' | 'unknown_input' | 'handoff_pending';
  replyText: string;
};
