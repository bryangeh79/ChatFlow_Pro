import type { UnifiedInboundMessage } from '../../../shared/types/unified-inbound-message';
import type { UnifiedSessionContext } from '../../../shared/types/unified-session-context';
import type { UnifiedResponse } from '../../../shared/types/unified-response';
import { detectContactIntent } from '../lead-capture-hook/contact-intent-detector';
import { unifiedFaqSeedRegistry } from './faq-seed';

export type UnifiedIntentType = 
  | 'faq_candidate'      // User wants FAQ information
  | 'lead_candidate'     // User wants to provide contact info  
  | 'chitchat_fallback'  // Casual conversation
  | 'unknown';           // Cannot determine (fallback)

export interface UnifiedIntentPreparationResult {
  intent: UnifiedIntentType;
  confidence: number;    // 0.0 to 1.0
  signals: string[];     // What triggered this intent
}

export type UnifiedDispatchStage =
  | 'prioritize_faq'     // Run FAQ first, lead only if FAQ misses
  | 'prioritize_lead'    // Run lead first, FAQ only if no lead
  | 'run_both'           // Run both (no prioritization)
  | 'pass_through';      // Original behavior

export interface UnifiedDispatchPlaceholderResult {
  nextStage: UnifiedDispatchStage;
  capability: 'faq' | 'lead' | 'both' | 'none';
}

/**
 * 简单文本规范化
 */
function normalizeText(text: string): string {
  return text.trim().toLowerCase();
}

/**
 * 检测消息中的FAQ意图信号
 */
function detectFaqIntentSignals(text: string): { signals: string[]; score: number } {
  const normalized = normalizeText(text);
  const signals: string[] = [];
  let score = 0;

  // 问题词检测
  const questionWords = ['what', 'how', 'when', 'where', 'why', 'which', 'who', 'can', 'could', 'would', 'should'];
  const questionWordSignals = questionWords.filter(word => normalized.includes(word));
  if (questionWordSignals.length > 0) {
    signals.push(...questionWordSignals.map(w => `question_word:${w}`));
    score += questionWordSignals.length * 0.1;
  }

  // 问号检测
  if (normalized.includes('?')) {
    signals.push('has_question_mark');
    score += 0.2;
  }

  // FAQ关键词检测
  const faqKeywords = ['help', 'support', 'information', 'detail', 'explain', 'tell me', 'know about'];
  const faqKeywordSignals = faqKeywords.filter(keyword => normalized.includes(keyword));
  if (faqKeywordSignals.length > 0) {
    signals.push(...faqKeywordSignals.map(k => `faq_keyword:${k}`));
    score += faqKeywordSignals.length * 0.15;
  }

  // 检查是否匹配FAQ种子关键词
  let faqSeedMatchCount = 0;
  for (const entry of unifiedFaqSeedRegistry.entries) {
    if (entry.keywords) {
      for (const keyword of entry.keywords) {
        if (normalized.includes(normalizeText(keyword))) {
          faqSeedMatchCount++;
        }
      }
    }
  }
  if (faqSeedMatchCount > 0) {
    signals.push(`faq_seed_matches:${faqSeedMatchCount}`);
    score += Math.min(faqSeedMatchCount * 0.1, 0.3);
  }

  return { signals, score };
}

/**
 * 检测消息中的闲聊意图信号
 */
function detectChitchatIntentSignals(text: string): { signals: string[]; score: number } {
  const normalized = normalizeText(text);
  const signals: string[] = [];
  let score = 0;

  // 问候语检测
  const greetings = ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening'];
  const greetingSignals = greetings.filter(greeting => normalized.includes(greeting));
  if (greetingSignals.length > 0) {
    signals.push(...greetingSignals.map(g => `greeting:${g}`));
    score += greetingSignals.length * 0.2;
  }

  // 闲聊短语检测
  const chitchatPhrases = [
    'how are you', 'what\'s up', 'how is it going', 'how do you do',
    'thanks', 'thank you', 'thank', 'appreciate',
    'bye', 'goodbye', 'see you', 'take care'
  ];
  const chitchatSignals = chitchatPhrases.filter(phrase => normalized.includes(phrase));
  if (chitchatSignals.length > 0) {
    signals.push(...chitchatSignals.map(c => `chitchat:${c}`));
    score += chitchatSignals.length * 0.15;
  }

  return { signals, score };
}

/**
 * 准备意图分类
 */
export function prepareUnifiedInboundIntent(
  message: UnifiedInboundMessage,
  session: UnifiedSessionContext,
): UnifiedIntentPreparationResult {
  const text = message.text || '';
  const normalizedText = normalizeText(text);
  
  if (!text.trim()) {
    return {
      intent: 'unknown',
      confidence: 0,
      signals: ['empty_message'],
    };
  }

  // 检测FAQ意图
  const faqDetection = detectFaqIntentSignals(text);
  
  // 检测闲聊意图
  const chitchatDetection = detectChitchatIntentSignals(text);
  
  // 检测联系意图（使用现有的lead capture检测器）
  const contactDetection = detectContactIntent(message);
  const hasLeadIntent = contactDetection.hasExplicitContactIntent || 
                       contactDetection.detectedFields.name || 
                       contactDetection.detectedFields.phone || 
                       contactDetection.detectedFields.email;
  
  const leadSignals: string[] = [];
  if (contactDetection.hasExplicitContactIntent) {
    leadSignals.push('explicit_contact_intent');
  }
  if (contactDetection.detectedFields.name) {
    leadSignals.push('detected_name');
  }
  if (contactDetection.detectedFields.phone) {
    leadSignals.push('detected_phone');
  }
  if (contactDetection.detectedFields.email) {
    leadSignals.push('detected_email');
  }
  
  const leadScore = hasLeadIntent ? 0.5 + (leadSignals.length * 0.1) : 0;

  // 确定主要意图（优先级：lead > faq > chitchat > unknown）
  const intentScores = {
    lead_candidate: leadScore,
    faq_candidate: faqDetection.score,
    chitchat_fallback: chitchatDetection.score,
    unknown: 0.1, // 默认基础分数
  };

  // 找到最高分数的意图
  let maxIntent: UnifiedIntentType = 'unknown';
  let maxScore = 0;
  let allSignals: string[] = [];

  for (const [intent, score] of Object.entries(intentScores)) {
    if (score > maxScore) {
      maxScore = score;
      maxIntent = intent as UnifiedIntentType;
    }
  }

  // 收集所有信号
  if (maxIntent === 'lead_candidate') {
    allSignals = [...leadSignals];
  } else if (maxIntent === 'faq_candidate') {
    allSignals = [...faqDetection.signals];
  } else if (maxIntent === 'chitchat_fallback') {
    allSignals = [...chitchatDetection.signals];
  }

  // 如果最高分数太低，回退到unknown
  if (maxScore < 0.3) {
    maxIntent = 'unknown';
    maxScore = 0.1;
    allSignals = ['low_confidence_all_intents'];
  }

  return {
    intent: maxIntent,
    confidence: Math.min(maxScore, 1.0),
    signals: allSignals,
  };
}

/**
 * 根据意图分发到不同的处理阶段
 */
export function dispatchUnifiedInboundIntent(
  preparation: UnifiedIntentPreparationResult,
): UnifiedDispatchPlaceholderResult {
  const { intent, confidence } = preparation;

  switch (intent) {
    case 'faq_candidate':
      if (confidence >= 0.5) {
        return {
          nextStage: 'prioritize_faq',
          capability: 'faq',
        };
      } else {
        return {
          nextStage: 'run_both',
          capability: 'both',
        };
      }

    case 'lead_candidate':
      if (confidence >= 0.5) {
        return {
          nextStage: 'prioritize_lead',
          capability: 'lead',
        };
      } else {
        return {
          nextStage: 'run_both',
          capability: 'both',
        };
      }

    case 'chitchat_fallback':
      return {
        nextStage: 'run_both',
        capability: 'both',
      };

    case 'unknown':
    default:
      return {
        nextStage: 'pass_through',
        capability: 'none',
      };
  }
}

/**
 * 应用分发占位符（保持向后兼容性）
 */
export function applyUnifiedDispatchPlaceholder(
  response: UnifiedResponse,
): UnifiedResponse {
  return response;
}