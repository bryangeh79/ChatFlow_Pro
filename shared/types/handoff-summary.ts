export interface HandoffSummary {
  conversationId: string;
  languageCode: 'zh' | 'en' | 'vi' | 'ms-MY';
  channel: 'website' | 'telegram' | 'whatsapp' | 'facebook-messenger';
  latestUserIntent?: string;
  latestMessages: string[];
  currentOwnerMemberId?: string;
  fallbackOccurred?: boolean;
  generatedAt?: string;
}
