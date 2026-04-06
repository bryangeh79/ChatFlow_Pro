import type { UnifiedInboundMessage } from '../../../shared/types/unified-inbound-message';
import type { UnifiedSessionContext } from '../../../shared/types/unified-session-context';
import type { ConversationPhaseContext } from './phase';
import { getLeadCaptureI18n } from '../lead-capture-hook/i18n';
import { shouldSuppressReplyOnHandoff } from '../../config/suppress-reply';

export interface TurnPlan {
  reply_text: string | null;
  should_send: boolean;
  lead_capture_prompt: string | null;
  debug_metadata_patch: Record<string, unknown>;
  policy_path: string;
}

export interface PolicyContext {
  message: UnifiedInboundMessage;
  session: UnifiedSessionContext;
  phase: ConversationPhaseContext;
  faqAnswer: string | null;
  faqMatched: boolean;
}

/**
 * 规划当前轮次的回复策略
 */
export function planTurn(ctx: PolicyContext): TurnPlan {
  const { phase, session, faqAnswer, faqMatched } = ctx;
  const i18n = getLeadCaptureI18n(session);
  
  // 根据阶段选择策略
  switch (phase.phase) {
    case 'handoff':
      return planHandoffTurn(ctx);
    
    case 'post_capture':
      return planPostCaptureTurn(ctx);
    
    case 'capture':
      return planCaptureTurn(ctx);
    
    case 'faq_first':
      return planFaqFirstTurn(ctx);
    
    case 'discover':
    case 'free_chat':
    default:
      return planDefaultTurn(ctx);
  }
}

function planHandoffTurn(ctx: PolicyContext): TurnPlan {
  const { session } = ctx;
  const suppress = shouldSuppressReplyOnHandoff();
  const i18n = getLeadCaptureI18n(session);
  
  // handoff时根据配置决定是否抑制回复
  const shouldSend = !suppress;
  const replyText = suppress ? null : i18n.handoffMessage || 'Transferred to human agent, please wait.';
  
  return {
    reply_text: replyText,
    should_send: shouldSend,
    lead_capture_prompt: null,
    debug_metadata_patch: {
      handoff_suppressed: suppress,
      handoff_status: session.handoff_state?.status
    },
    policy_path: 'handoff'
  };
}

function planPostCaptureTurn(ctx: PolicyContext): TurnPlan {
  const { faqAnswer, faqMatched, session } = ctx;
  const i18n = getLeadCaptureI18n(session);
  
  // captured后：如果FAQ命中，使用FAQ回答；否则使用简短确认
  let replyText = faqMatched ? faqAnswer : i18n.capturedConfirmation;
  
  // 添加下一步引导
  if (!faqMatched) {
    // 可以添加一句下一步引导，例如是否需要人工或报价
    const nextStepPrompt = i18n.postCaptureNextStep || '如需进一步咨询或报价，请告诉我们。';
    replyText = replyText ? `${replyText}\n\n${nextStepPrompt}` : nextStepPrompt;
  }
  
  return {
    reply_text: replyText,
    should_send: true,
    lead_capture_prompt: null,
    debug_metadata_patch: {
      post_capture_guidance: !faqMatched
    },
    policy_path: 'post_capture'
  };
}

function planCaptureTurn(ctx: PolicyContext): TurnPlan {
  const { session, faqAnswer, faqMatched } = ctx;
  const i18n = getLeadCaptureI18n(session);
  const leadState = session.lead_capture_state;
  
  let replyText = faqMatched ? faqAnswer : null;
  let leadCapturePrompt: string | null = null;
  
  // partial状态时添加单槽引导
  if (leadState?.status === 'partial' && leadState.missing_fields && leadState.missing_fields.length > 0) {
    // 单槽引导：一次只追问一个缺失字段
    const missingField = leadState.missing_fields[0]; // 优先级：name -> phone -> email
    leadCapturePrompt = i18n.singleFieldPrompt?.(missingField) || 
                       `请提供您的${missingField}。`;
  }
  
  // 合并提示到回复文本
  if (leadCapturePrompt) {
    if (replyText) {
      replyText = `${replyText}\n\n${leadCapturePrompt}`;
      leadCapturePrompt = null;
    } else {
      replyText = leadCapturePrompt;
      leadCapturePrompt = null;
    }
  }
  
  return {
    reply_text: replyText,
    should_send: true,
    lead_capture_prompt: leadCapturePrompt,
    debug_metadata_patch: {
      single_field_prompt: leadState?.missing_fields?.[0] || null
    },
    policy_path: 'capture'
  };
}

function planFaqFirstTurn(ctx: PolicyContext): TurnPlan {
  const { faqAnswer } = ctx;
  
  // FAQ优先：直接使用FAQ回答
  return {
    reply_text: faqAnswer,
    should_send: true,
    lead_capture_prompt: null,
    debug_metadata_patch: {
      faq_priority: true
    },
    policy_path: 'faq_first'
  };
}

function planDefaultTurn(ctx: PolicyContext): TurnPlan {
  const { faqAnswer, faqMatched, message } = ctx;
  
  // 默认：FAQ命中则使用，否则使用原始消息文本
  const replyText = faqMatched ? (faqAnswer || null) : (message.text || null);
  
  return {
    reply_text: replyText,
    should_send: true,
    lead_capture_prompt: null,
    debug_metadata_patch: {
      default_fallback: !faqMatched
    },
    policy_path: 'default'
  };
}