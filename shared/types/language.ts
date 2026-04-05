export type SupportedLanguageCode = 'zh' | 'en' | 'vi' | 'ms-MY';

export interface LanguageResolutionContext {
  explicitLanguage?: SupportedLanguageCode;
  conversationLanguage?: SupportedLanguageCode;
  channelDefaultLanguage?: SupportedLanguageCode;
  systemDefaultLanguage: SupportedLanguageCode;
}
