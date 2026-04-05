import type { ChatRuntimeInput, ChatRuntimeOutput } from '../../chat-runtime';

export function websiteChatEntry(input: ChatRuntimeInput): ChatRuntimeOutput {
  return {
    conversationId: input.conversationId ?? 'conv_website_mock',
    language: input.preferredLanguage ?? 'en',
    replyKey: 'welcome',
    replyText: 'Welcome to ChatFlow Pro',
  };
}
