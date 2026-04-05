import type { LanguageResolutionContext, SupportedLanguageCode } from '../../../../../shared/types/language';

const supported: SupportedLanguageCode[] = ['zh', 'en', 'vi', 'ms-MY'];

export function resolveLanguage(ctx: LanguageResolutionContext): SupportedLanguageCode {
  const candidates = [ctx.explicitLanguage, ctx.conversationLanguage, ctx.channelDefaultLanguage, ctx.systemDefaultLanguage];
  for (const candidate of candidates) {
    if (candidate && supported.includes(candidate)) return candidate;
  }
  return ctx.systemDefaultLanguage;
}
