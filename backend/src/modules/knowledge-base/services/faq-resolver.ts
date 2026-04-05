import type { SupportedLanguageCode } from '../../../../../shared/types/language';
import type { FaqItem } from '../types/faq-item';
import type { KbMatchResult } from '../types/kb-match-result';
import { matchFaq } from './kb-matcher';
import seed from '../data/faq-seed.json';

export function resolveFaqReply(input: string, languageCode: SupportedLanguageCode): KbMatchResult {
  const items = (seed as FaqItem[]).filter((item) => item.languageCode === languageCode);
  return matchFaq(input, items);
}
