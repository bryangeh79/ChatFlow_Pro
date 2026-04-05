import type { SupportedLanguageCode } from '../../../../../shared/types/language';
import { resolveFaqReply } from '../../knowledge-base/services/faq-resolver';
import { requestHandoff } from '../../collaboration/services/handoff-service';
import type { Conversation } from '../../../../../shared/types/conversation';

const fallbackReplies: Record<SupportedLanguageCode, string> = {
  zh: '我先按默认内容回复你。',
  en: 'I will use the default reply for now.',
  vi: 'Tôi sẽ dùng câu trả lời mặc định trước.',
  'ms-MY': 'Saya akan gunakan balasan lalai dahulu.',
};

const handoffReplies: Record<SupportedLanguageCode, string> = {
  zh: '已为你转接人工，稍后会有同事接手。',
  en: 'You have been routed to a human. A staff member will take over shortly.',
  vi: 'Bạn đã được chuyển sang người thật. Nhân viên sẽ tiếp nhận sớm.',
  'ms-MY': 'Anda telah dipindahkan kepada manusia. Staf akan mengambil alih sebentar lagi.',
};

function shouldTriggerHandoff(input: string): boolean {
  const text = input.toLowerCase();
  return ['human', 'agent', 'staff', 'handoff', '人工', '客服', '真人', '转人工'].some((k) => text.includes(k.toLowerCase()));
}

export function dispatchReply(language: SupportedLanguageCode, replyKey: 'welcome' | 'fallback' | 'unknown_input', userInput = '', conversation?: Conversation): string {
  if (conversation && shouldTriggerHandoff(userInput)) {
    requestHandoff(conversation, 'visitor', 'user_request');
    return handoffReplies[language] ?? handoffReplies.en;
  }

  const faqResult = resolveFaqReply(userInput, language);
  if (faqResult.matched && faqResult.answer) return faqResult.answer;
  return fallbackReplies[language] ?? fallbackReplies.en;
}
