import type { UnifiedInboundMessage } from '../../../shared/types/unified-inbound-message';
import type { UnifiedSessionContext } from '../../../shared/types/unified-session-context';
import type { UnifiedResponse } from '../../../shared/types/unified-response';
import {
  applyUnifiedDispatchPlaceholder,
  dispatchUnifiedInboundIntent,
  prepareUnifiedInboundIntent,
} from './intent-dispatch';
import type { UnifiedFaqSeedEntry } from './faq-seed';
import { resolveUnifiedFaqSkeleton } from './faq-resolver';
import { namespacedSessionIdForMessage } from '../session-context';
import { runLeadCaptureHook } from '../lead-capture-hook';
import { detectContactIntent } from '../lead-capture-hook/contact-intent-detector';
import { getLeadCaptureI18n } from '../lead-capture-hook/i18n';
import { shouldTriggerHandoff, updateHandoffStateIfTriggered } from '../handoff-trigger';
import { scheduleHandoffNotify } from '../handoff-trigger/notify-outbound';
import { resolveConversationPhase } from '../conversation-runtime/phase';
import { planTurn } from '../conversation-runtime/policy';
import { emitLeadCaptured, emitQualificationTagsUpdated } from '../conversation-runtime/events';
import { determineOwnerAssignment } from '../handoff-trigger/assign';
import { appendHandoffAssignmentRecord } from '../handoff-trigger/assignment-persistence';
import type { TenantRuntimeSettings } from '../../saas/tenant-runtime-settings';

export interface PipelineOptions {
  traceContext?: {
    request_id?: string;
    message_trace_id?: string;
  };
  /** Multi-tenant: FAQ from DB only (empty array = no built-in seed). Omit = legacy seed file. */
  faqEntries?: UnifiedFaqSeedEntry[];
  /** Phase 22B: tenant_settings applied per request (tenant webhooks only). */
  tenantRuntimeSettings?: TenantRuntimeSettings;
}

export function runUnifiedInboundPipeline(
  message: UnifiedInboundMessage,
  session?: UnifiedSessionContext,
  options?: PipelineOptions,
): { session: UnifiedSessionContext; response: UnifiedResponse } {
  const faqResolverOpts =
    options?.faqEntries !== undefined ? { entries: options.faqEntries } : undefined;

  let nextSession: UnifiedSessionContext =
    session ?? {
      session_id: namespacedSessionIdForMessage(message),
      channel: message.channel,
      external_user_id: message.external_user_id,
      external_session_id: message.external_session_id,
      current_language: message.language ?? null,
      first_seen_at: message.timestamp,
      last_seen_at: message.timestamp,
      lead_capture_state: { status: 'none' },
      handoff_state: { enabled: true, status: 'none' },
    };

  if (options?.tenantRuntimeSettings !== undefined) {
    const handoffEnabled = options.tenantRuntimeSettings.handoff.enabled !== false;
    nextSession = {
      ...nextSession,
      handoff_state: {
        ...nextSession.handoff_state,
        enabled: handoffEnabled,
      },
    };
  }

  // 准备意图分类
  const intentPreparation = prepareUnifiedInboundIntent(message, nextSession);
  const dispatchResult = dispatchUnifiedInboundIntent(intentPreparation);

  let sessionAfterLeadCapture = nextSession;
  let faqResult;

  // 根据意图分发结果执行不同的流程
  switch (dispatchResult.nextStage) {
    case 'prioritize_faq':
      // 先运行FAQ匹配
      faqResult = resolveUnifiedFaqSkeleton(
        message,
        nextSession,
        intentPreparation,
        dispatchResult,
        faqResolverOpts,
      );
      // 如果FAQ未命中，再运行lead capture
      if (!faqResult.matched) {
        sessionAfterLeadCapture = runLeadCaptureHook(message, nextSession, options?.traceContext, {
          tenantRuntimeSettings: options?.tenantRuntimeSettings,
        });
      } else {
        sessionAfterLeadCapture = nextSession; // FAQ命中，不需要lead capture
      }
      break;

    case 'prioritize_lead':
      // 先运行lead capture
      sessionAfterLeadCapture = runLeadCaptureHook(message, nextSession, options?.traceContext, {
        tenantRuntimeSettings: options?.tenantRuntimeSettings,
      });
      
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
        faqResult = resolveUnifiedFaqSkeleton(
          message,
          sessionAfterLeadCapture,
          intentPreparation,
          dispatchResult,
          faqResolverOpts,
        );
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
      sessionAfterLeadCapture = runLeadCaptureHook(message, nextSession, options?.traceContext, {
        tenantRuntimeSettings: options?.tenantRuntimeSettings,
      });
      faqResult = resolveUnifiedFaqSkeleton(
        message,
        sessionAfterLeadCapture,
        intentPreparation,
        dispatchResult,
        faqResolverOpts,
      );
      break;

    case 'pass_through':
    default:
      // 原始行为：先lead capture，然后FAQ
      sessionAfterLeadCapture = runLeadCaptureHook(message, nextSession, options?.traceContext, {
        tenantRuntimeSettings: options?.tenantRuntimeSettings,
      });
      faqResult = resolveUnifiedFaqSkeleton(
        message,
        sessionAfterLeadCapture,
        intentPreparation,
        dispatchResult,
        faqResolverOpts,
      );
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

  // 在 lead capture 之后处理 handoff 触发
  const sessionAfterHandoffCheck = updateHandoffStateIfTriggered(message, sessionAfterLeadCapture);
  
  // 获取分配信息（需要在 handoff notify 之前）
  const assignment = determineOwnerAssignment(sessionAfterHandoffCheck);
  
  const tenantNotifyEnabled =
    options?.tenantRuntimeSettings === undefined ||
    options.tenantRuntimeSettings.notify.enabled !== false;

  // 如果 handoff 状态新变为 pending，发送通知
  if (
    tenantNotifyEnabled &&
    sessionAfterLeadCapture.handoff_state.status !== 'pending' &&
    sessionAfterHandoffCheck.handoff_state.status === 'pending'
  ) {
    const hs = sessionAfterHandoffCheck.handoff_state;
    
    // 记录分配历史（如果发生了新分配）
    if (assignment.assign_reason !== 'none' && assignment.assigned_owner_id) {
      const tagHits = sessionAfterHandoffCheck.metadata?.qualification_tags as string[] || [];
      appendHandoffAssignmentRecord(
        sessionAfterHandoffCheck.session_id,
        sessionAfterHandoffCheck.channel,
        assignment.assigned_owner_id,
        assignment.assign_mode,
        assignment.assign_reason,
        options?.traceContext?.request_id,
        tagHits.length > 0 ? tagHits : undefined,
        assignment.online_agents?.length
      );
    }
    
    scheduleHandoffNotify({
      event: 'handoff_pending',
      session_id: sessionAfterHandoffCheck.session_id,
      channel: sessionAfterHandoffCheck.channel,
      external_user_id: sessionAfterHandoffCheck.external_user_id,
      external_session_id: sessionAfterHandoffCheck.external_session_id,
      reason: hs.reason ?? null,
      triggered_at: hs.triggered_at ?? null,
      request_id: options?.traceContext?.request_id,
      message_trace_id: options?.traceContext?.message_trace_id,
      assigned_owner_id: hs.assigned_owner_id ?? undefined,
      assign_reason: assignment.assign_reason,
      online_agents_count: assignment.online_agents?.length,
      assignment_log_id: assignment.assign_reason !== 'none' ? 
        `${Date.now().toString(36).slice(-6)}-${simpleStringHash(sessionAfterHandoffCheck.session_id).toString(36).slice(-6)}` : 
        undefined,
    });
  }
  
  // 证据对齐：添加 leadCaptureResult
  const leadCaptureResult = {
    status: sessionAfterHandoffCheck.lead_capture_state.status,
    captured_fields: sessionAfterHandoffCheck.lead_capture_state.collected_fields,
    missing_fields: sessionAfterHandoffCheck.lead_capture_state.missing_fields,
  };

  // 确定对话阶段
  const phaseContext = resolveConversationPhase(
    message,
    sessionAfterHandoffCheck,
    intentPreparation,
    faqResult.matched
  );

  // 使用策略规划当前轮次
  const policyContext = {
    message,
    session: sessionAfterHandoffCheck,
    phase: phaseContext,
    faqAnswer: faqResult.answer,
    faqMatched: faqResult.matched,
    ...(options?.tenantRuntimeSettings !== undefined
      ? { suppress_reply_tenant_enabled: options.tenantRuntimeSettings.suppress_reply.enabled }
      : {}),
  };
  
  const turnPlan = planTurn(policyContext);

  const botReplyAllowed =
    options?.tenantRuntimeSettings === undefined ||
    options.tenantRuntimeSettings.bot.enabled !== false;
  const effectiveShouldSend = botReplyAllowed && turnPlan.should_send;

  // 确定是否需要 handoff
  const handoffRequired = shouldTriggerHandoff(message, sessionAfterHandoffCheck);
  
  // 处理 lead captured 事件和资格标签
  if (sessionAfterHandoffCheck.lead_capture_state.status === 'captured') {
    const capturedFields = sessionAfterHandoffCheck.lead_capture_state.collected_fields || {};
    
    // 计算资格标签
    const qualificationTags = computeQualificationTags(
      capturedFields,
      message.text || ''
    );
    
    // 发射事件 - 需要将 unknown 转换为 string
    const stringFields: Record<string, string> = {};
    for (const [key, value] of Object.entries(capturedFields)) {
      stringFields[key] = String(value || '');
    }
    emitLeadCaptured(sessionAfterHandoffCheck, stringFields, qualificationTags);
    
    // 更新会话元数据中的标签
    const previousTags = sessionAfterHandoffCheck.metadata?.qualification_tags as string[] || [];
    if (JSON.stringify(qualificationTags) !== JSON.stringify(previousTags)) {
      sessionAfterHandoffCheck.metadata = {
        ...sessionAfterHandoffCheck.metadata,
        qualification_tags: qualificationTags
      };
      emitQualificationTagsUpdated(sessionAfterHandoffCheck, qualificationTags, previousTags);
    }
  }

  const response: UnifiedResponse = applyUnifiedDispatchPlaceholder({
    channel: message.channel,
    session_id: sessionAfterHandoffCheck.session_id,
    kind: faqResult.matched ? 'text' : 'text',
    reply_text: turnPlan.reply_text,
    should_send: effectiveShouldSend,
    handoff_required: handoffRequired,
    lead_capture_prompt: turnPlan.lead_capture_prompt,
    debug_steps: [...debug_steps, `phase:${phaseContext.phase}`, `policy:${turnPlan.policy_path}`],
    debug_metadata: {
      debug_steps: [...debug_steps, `phase:${phaseContext.phase}`, `policy:${turnPlan.policy_path}`],
      intentPreparation,
      dispatchResult,
      faqResult,
      leadCaptureResult,
      conversation_phase: phaseContext.phase,
      qualification_tags: sessionAfterHandoffCheck.metadata?.qualification_tags as string[] || [],
      policy_path: turnPlan.policy_path,
      assign_mode: assignment.assign_mode,
      assign_reason: assignment.assign_reason,
      assigned_owner_id: sessionAfterHandoffCheck.handoff_state.assigned_owner_id || null,
      online_agents: assignment.online_agents,
      balance_strategy: assignment.balance_strategy,
      ...(options?.tenantRuntimeSettings !== undefined
        ? {
            saas_control: {
              tenant_runtime_settings_injected: true,
              handoff_enabled_effective: options.tenantRuntimeSettings.handoff.enabled !== false,
              handoff_trigger_suppressed: options.tenantRuntimeSettings.handoff.enabled === false,
              notify_enabled_effective: options.tenantRuntimeSettings.notify.enabled !== false,
              notify_http_suppressed: options.tenantRuntimeSettings.notify.enabled === false,
              lead_capture_enabled: options.tenantRuntimeSettings.lead_capture.enabled !== false,
              lead_capture_suppressed: options.tenantRuntimeSettings.lead_capture.enabled === false,
              bot_enabled: options.tenantRuntimeSettings.bot.enabled !== false,
              bot_reply_suppressed: options.tenantRuntimeSettings.bot.enabled === false,
              suppress_reply_enabled: options.tenantRuntimeSettings.suppress_reply.enabled !== false,
              suppress_reply_suppressed: options.tenantRuntimeSettings.suppress_reply.enabled === false,
            },
          }
        : {}),
      ...turnPlan.debug_metadata_patch,
    },
  });

  sessionAfterHandoffCheck.recent_faq_hit = {
    faq_id: faqResult.matched ? faqResult.matched_topic ?? undefined : undefined,
    matched: faqResult.matched,
    confidence: faqResult.confidence,
  };

  return {
    session: sessionAfterHandoffCheck,
    response,
  };

// 辅助函数：计算资格标签
function computeQualificationTags(
  capturedFields: Record<string, unknown>,
  messageText: string
): string[] {
  const tags: string[] = [];

  // 规则1: name+phone+email 全齐 => complete_profile
  const hasName = !!String(capturedFields.name || '').trim();
  const hasPhone = !!String(capturedFields.phone || '').trim();
  const hasEmail = !!String(capturedFields.email || '').trim();
  
  if (hasName && hasPhone && hasEmail) {
    tags.push('complete_profile');
  }

  // 规则2: 文本含高意向词 => high_intent
  const highIntentKeywords = [
    '咨询', '报价', '购买', '合作', '价格', '费用', '多少钱',
    'consult', 'quote', 'buy', 'purchase', 'cooperate', 'price', 'cost', 'how much'
  ];
  
  const textLower = messageText.toLowerCase();
  const hasHighIntent = highIntentKeywords.some(keyword => 
    textLower.includes(keyword.toLowerCase())
  );
  
  if (hasHighIntent) {
    tags.push('high_intent');
  }

  // 规则3: handoff pending => needs_handoff (在handoff阶段处理)

  return tags;
}

// 辅助函数：简单字符串哈希
function simpleStringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
}