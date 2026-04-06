import type { UnifiedInboundMessage } from '../../../shared/types/unified-inbound-message';
import type { UnifiedSessionContext } from '../../../shared/types/unified-session-context';
import type { UnifiedIntentPreparationResult } from '../unified-inbound-pipeline/intent-dispatch';

export type ConversationPhase =
  | 'discover'           // 初始阶段：探索用户意图，未检测到lead信号
  | 'capture'            // 捕获阶段：检测到lead信号，正在收集信息
  | 'post_capture'       // 捕获后阶段：lead已完整收集，等待下一步
  | 'faq_first'          // FAQ优先阶段：FAQ命中，lead信号弱或无
  | 'handoff'            // 转人工阶段：需要人工介入
  | 'free_chat';         // 自由聊天阶段：无特定目标

export interface ConversationPhaseContext {
  phase: ConversationPhase;
  previousPhase?: ConversationPhase;
  transitionReason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 根据消息、会话、意图和FAQ匹配结果确定对话阶段
 */
export function resolveConversationPhase(
  message: UnifiedInboundMessage,
  session: UnifiedSessionContext,
  intent: UnifiedIntentPreparationResult,
  faqMatched?: boolean
): ConversationPhaseContext {
  const leadStatus = session.lead_capture_state?.status;
  const handoffStatus = session.handoff_state?.status;
  
  // 1. 检查是否在handoff状态
  if (handoffStatus === 'pending' || handoffStatus === 'assigned') {
    return {
      phase: 'handoff',
      transitionReason: handoffStatus === 'pending' ? 'handoff_pending' : 'handoff_assigned'
    };
  }
  
  // 2. 检查lead捕获状态
  if (leadStatus === 'captured') {
    return {
      phase: 'post_capture',
      transitionReason: 'lead_captured'
    };
  }
  
  if (leadStatus === 'partial') {
    return {
      phase: 'capture',
      transitionReason: 'lead_partial'
    };
  }
  
  // 3. 检查FAQ匹配
  if (faqMatched === true) {
    return {
      phase: 'faq_first',
      transitionReason: 'faq_matched'
    };
  }
  
  // 4. 检查是否有lead意图
  const hasLeadIntent = intent.intent === 'lead_candidate' && intent.confidence > 0.5;
  if (hasLeadIntent) {
    return {
      phase: 'capture',
      transitionReason: 'lead_intent_detected'
    };
  }
  
  // 5. 默认：探索阶段
  return {
    phase: 'discover',
    transitionReason: 'no_signals'
  };
}