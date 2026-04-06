import type { UnifiedInboundMessage } from '../../../shared/types/unified-inbound-message';
import type { UnifiedSessionContext } from '../../../shared/types/unified-session-context';
import type { UnifiedDispatchPlaceholderResult } from './intent-dispatch';
import type { UnifiedIntentPreparationResult } from './intent-dispatch';
import type { UnifiedFaqSeedEntry } from './faq-seed';
import { unifiedFaqSeedRegistry } from './faq-seed';

export interface UnifiedFaqResolverResult {
  matched: boolean;
  answer: string | null;
  matched_topic: string | null;
  confidence: number;
}

export interface UnifiedFaqResolverOptions {
  entries?: UnifiedFaqSeedEntry[];
  /**
   * Legacy / default: true. When false (tenant `faq.fallback_enabled === false`), skip English and cross-language FAQ tiers after the primary language pass.
   */
  fallbackEnabled?: boolean;
}

function normalizeFaqText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function keywordOverlapScore(text: string, keywords: string[] | undefined): number {
  if (!keywords || keywords.length === 0) {
    return 0;
  }

  const haystack = normalizeFaqText(text);
  return keywords.reduce((count, keyword) => {
    const normalizedKeyword = normalizeFaqText(keyword);
    return haystack.includes(normalizedKeyword) ? count + 1 : count;
  }, 0);
}

export function resolveUnifiedFaqSkeleton(
  message: UnifiedInboundMessage,
  session: UnifiedSessionContext,
  intent: UnifiedIntentPreparationResult,
  dispatch: UnifiedDispatchPlaceholderResult,
  resolverOpts?: UnifiedFaqResolverOptions,
): UnifiedFaqResolverResult {
  void intent;

  const pool =
    resolverOpts?.entries !== undefined ? resolverOpts.entries : unifiedFaqSeedRegistry.entries;

  const candidateText = message.text ?? '';
  const normalizedCandidate = normalizeFaqText(candidateText);

  // 修复：在 dispatch 仍为占位阶段，只要用户文本非空即允许跑 FAQ 匹配
  const shouldConsiderFaq = normalizedCandidate.length > 0;
  if (!shouldConsiderFaq) {
    return {
      matched: false,
      answer: null,
      matched_topic: null,
      confidence: 0,
    };
  }

  // 确定用户语言优先级：session.current_language > message.language > null
  const userLanguage = session.current_language ?? message.language ?? null;

  // 策略1：先匹配用户当前语言的条目
  const languageSpecificEntries = pool.filter(
    entry => entry.language === userLanguage
  );

  for (const entry of languageSpecificEntries) {
    const normalizedQuestion = normalizeFaqText(entry.question);
    const normalizedAnswer = normalizeFaqText(entry.answer);

    const exactMatch = candidateText === entry.question || candidateText === entry.answer;
    const normalizedExactMatch = normalizedCandidate === normalizedQuestion || normalizedCandidate === normalizedAnswer;
    const keywordOverlap = keywordOverlapScore(candidateText, entry.keywords);

    if (exactMatch || normalizedExactMatch || keywordOverlap > 0) {
      return {
        matched: true,
        answer: entry.answer,
        matched_topic: entry.topic,
        confidence: exactMatch || normalizedExactMatch ? 0.9 : 0.6,
      };
    }
  }

  if (resolverOpts?.fallbackEnabled === false) {
    return {
      matched: false,
      answer: null,
      matched_topic: null,
      confidence: 0,
    };
  }

  // 策略2：如果用户语言没有匹配，回落到英语（en）条目
  if (userLanguage !== 'en') {
    const englishEntries = pool.filter(
      entry => entry.language === 'en'
    );

    for (const entry of englishEntries) {
      const normalizedQuestion = normalizeFaqText(entry.question);
      const normalizedAnswer = normalizeFaqText(entry.answer);

      const exactMatch = candidateText === entry.question || candidateText === entry.answer;
      const normalizedExactMatch = normalizedCandidate === normalizedQuestion || normalizedCandidate === normalizedAnswer;
      const keywordOverlap = keywordOverlapScore(candidateText, entry.keywords);

      if (exactMatch || normalizedExactMatch || keywordOverlap > 0) {
        return {
          matched: true,
          answer: entry.answer,
          matched_topic: entry.topic,
          confidence: exactMatch || normalizedExactMatch ? 0.8 : 0.5, // 英语回落的置信度稍低
        };
      }
    }
  }

  // 策略3：如果英语也没有匹配，回落到所有条目（包括其他语言）
  // 这可以捕捉跨语言的关键词匹配
  const allEntries = pool;
  for (const entry of allEntries) {
    // 跳过已经检查过的语言特定和英语条目
    if (entry.language === userLanguage || (userLanguage !== 'en' && entry.language === 'en')) {
      continue;
    }

    const normalizedQuestion = normalizeFaqText(entry.question);
    const normalizedAnswer = normalizeFaqText(entry.answer);
    const keywordOverlap = keywordOverlapScore(candidateText, entry.keywords);

    // 对于跨语言匹配，只使用关键词重叠（因为问题/答案文本在不同语言中不同）
    if (keywordOverlap > 0) {
      return {
        matched: true,
        answer: entry.answer,
        matched_topic: entry.topic,
        confidence: 0.4, // 跨语言匹配的置信度最低
      };
    }
  }

  return {
    matched: false,
    answer: null,
    matched_topic: null,
    confidence: 0,
  };
}