import type { UnifiedInboundMessage } from '../../../shared/types/unified-inbound-message';
import type { UnifiedSessionContext } from '../../../shared/types/unified-session-context';
import type { UnifiedResponse } from '../../../shared/types/unified-response';
import {
  applyUnifiedDispatchPlaceholder,
  dispatchUnifiedInboundIntent,
  prepareUnifiedInboundIntent,
} from './intent-dispatch';
import { resolveUnifiedFaqSkeleton } from './faq-resolver';
import { runLeadCaptureHook } from '../lead-capture-hook';
import { detectContactIntent } from '../lead-capture-hook/contact-intent-detector';
import { getLeadCaptureI18n } from '../lead-capture-hook/i18n';

export function runUnifiedInboundPipeline(
  message: UnifiedInboundMessage,
  session?: UnifiedSessionContext,
): { session: UnifiedSessionContext; response: UnifiedResponse } {
  const nextSession: UnifiedSessionContext =
    session ?? {
      session_id: `${message.channel}:${message.external_user_id}:${message.external_session_id}`,
      channel: message.channel,
      external_user_id: message.external_user_id,
      external_session_id: message.external_session_id,
      current_language: message.language ?? null,
      first_seen_at: message.timestamp,
      last_seen_at: message.timestamp,
      lead_capture_state: { status: 'none' },
      handoff_state: { enabled: true, status: 'none' },
    };

  // 准备意图分类
  const intentPreparation = prepareUnifiedInboundIntent(message, nextSession);
  const dispatchResult = dispatchUnifiedInboundIntent(intentPreparation);

  let sessionAfterLeadCapture = nextSession;
  let faqResult;

  // 根据意图分发结果执行不同的流程
  switch (dispatchResult.nextStage) {
    case 'prioritize_faq':
      // 先运行FAQ匹配
      faqResult = resolveUnifiedFaqSkeleton(message, nextSession, intentPreparation, dispatchResult);
      // 如果FAQ未命中，再运行lead capture
      if (!faqResult.matched) {
        sessionAfterLeadCapture = runLeadCaptureHook(message, nextSession);
      } else {
        sessionAfterLeadCapture = nextSession; // FAQ命中，不需要lead capture
      }
      break;

    case 'prioritize_lead':
      // 先运行lead capture
      sessionAfterLeadCapture = runLeadCaptureHook(message, nextSession);
      
      // 检查本次消息是否有新的lead信号
      const contactDetection = detectContactIntent(message);
      const hasNewLeadSignals = contactDetection.hasExplicitContactIntent || 
                               contactDetection.detectedFields.name || 
                               contactDetection.detectedFields.phone || 
                               contactDetection.detectedFields.email;
      
      // 决定是否运行FAQ：
      // 1. 如果lead capture状态是'none'（完全没有检测到任何内容），运行FAQ
      // 2. 如果lead capture状态是'partial'但本次没有新的lead信号，运行FAQ（允许继续对话）
      // 3. 如果lead capture状态是'captured'或本次有新的lead信号，跳过FAQ
      const shouldRunFaq = 
        sessionAfterLeadCapture.lead_capture_state.status === 'none' ||
        (sessionAfterLeadCapture.lead_capture_state.status === 'partial' && !hasNewLeadSignals);
      
      if (shouldRunFaq) {
        faqResult = resolveUnifiedFaqSkeleton(message, sessionAfterLeadCapture, intentPreparation, dispatchResult);
      } else {
        // 不需要FAQ
        faqResult = {
          matched: false,
          answer: null,
          matched_topic: null,
          confidence: 0,
        };
      }
      break;

    case 'run_both':
      // 同时运行两者（无优先级）
      sessionAfterLeadCapture = runLeadCaptureHook(message, nextSession);
      faqResult = resolveUnifiedFaqSkeleton(message, sessionAfterLeadCapture, intentPreparation, dispatchResult);
      break;

    case 'pass_through':
    default:
      // 原始行为：先lead capture，然后FAQ
      sessionAfterLeadCapture = runLeadCaptureHook(message, nextSession);
      faqResult = resolveUnifiedFaqSkeleton(message, sessionAfterLeadCapture, intentPreparation, dispatchResult);
      break;
  }

  const debug_steps = [
    'welcome_hook',
    'reply_hook',
    'faq_hook',
    'lead_capture_hook',
    'handoff_hook',
    dispatchResult.nextStage,
    faqResult.matched ? 'faq_hit' : 'faq_no_match',
  ];

  // 证据对齐：添加 leadCaptureResult
  const leadCaptureResult = {
    status: sessionAfterLeadCapture.lead_capture_state.status,
    captured_fields: sessionAfterLeadCapture.lead_capture_state.collected_fields,
    missing_fields: sessionAfterLeadCapture.lead_capture_state.missing_fields,
  };

  // 获取 i18n 字符串
  const i18n = getLeadCaptureI18n(sessionAfterLeadCapture);

  // 最小出站逻辑
  let replyText = faqResult.matched ? faqResult.answer : message.text ?? null;
  let lead_capture_prompt: string | null = null;

  if (sessionAfterLeadCapture.lead_capture_state.status === 'partial') {
    // partial 状态时添加提示（i18n）
    const missingFields = sessionAfterLeadCapture.lead_capture_state.missing_fields || [];
    if (missingFields.length > 0) {
      lead_capture_prompt = i18n.partialPrompt(missingFields);
    }
  } else if (sessionAfterLeadCapture.lead_capture_state.status === 'captured' && !faqResult.matched) {
    // captured 状态且 FAQ 未命中时使用简短确认（i18n）
    replyText = i18n.capturedConfirmation;
  }

  // 合并 lead_capture_prompt 到 reply_text（用户可见）
  // 兜底：如果 replyText 为空但 prompt 存在，使用 prompt 作为 replyText
  if (lead_capture_prompt) {
    if (replyText) {
      replyText = `${replyText}\n\n${lead_capture_prompt}`;
      lead_capture_prompt = null;
    } else {
      // 兜底：空回复时，prompt 成为主回复
      replyText = lead_capture_prompt;
      lead_capture_prompt = null;
    }
  }

  const response: UnifiedResponse = applyUnifiedDispatchPlaceholder({
    channel: message.channel,
    session_id: sessionAfterLeadCapture.session_id,
    kind: faqResult.matched ? 'text' : 'text',
    reply_text: replyText,
    should_send: true,
    handoff_required: Boolean(message.handoff_flag),
    lead_capture_prompt,
    debug_steps,
    debug_metadata: {
      debug_steps,
      intentPreparation,
      dispatchResult,
      faqResult,
      leadCaptureResult, // 证据对齐要求
    },
  });

  sessionAfterLeadCapture.recent_faq_hit = {
    faq_id: faqResult.matched ? faqResult.matched_topic ?? undefined : undefined,
    matched: faqResult.matched,
    confidence: faqResult.confidence,
  };

  return {
    session: sessionAfterLeadCapture,
    response,
  };
}