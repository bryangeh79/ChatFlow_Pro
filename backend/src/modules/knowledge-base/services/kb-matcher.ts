import type { FaqItem } from '../types/faq-item';
import type { KbMatchResult } from '../types/kb-match-result';

export function matchFaq(input: string, items: FaqItem[]): KbMatchResult {
  const normalized = input.trim().toLowerCase();

  const exact = items.find((item) => item.isActive && item.question.trim().toLowerCase() === normalized);
  if (exact) {
    return { matched: true, matchType: 'exact', itemId: exact.id, answer: exact.answer, confidence: 1, fallbackRequired: false };
  }

  const keyword = items.find((item) => item.isActive && item.keywords.some((k) => normalized.includes(k.toLowerCase())));
  if (keyword) {
    return { matched: true, matchType: 'keyword', itemId: keyword.id, answer: keyword.answer, confidence: 0.7, fallbackRequired: false };
  }

  const tagged = items.find((item) => item.isActive && item.tags.some((t) => normalized.includes(t.toLowerCase())));
  if (tagged) {
    return { matched: true, matchType: 'tags', itemId: tagged.id, answer: tagged.answer, confidence: 0.5, fallbackRequired: false };
  }

  return { matched: false, matchType: 'none', fallbackRequired: true };
}
