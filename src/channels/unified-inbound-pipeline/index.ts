import type { UnifiedInboundMessage } from '../../../shared/types/unified-inbound-message';
import type { UnifiedSessionContext } from '../../../shared/types/unified-session-context';
import type { UnifiedResponse } from '../../../shared/types/unified-response';
import {
  applyUnifiedDispatchPlaceholder,
  dispatchUnifiedInboundIntent,
  prepareUnifiedInboundIntent,
} from './intent-dispatch';
import type { UnifiedFaqSeedEntry } from './faq-seed';
import { resolveUnifiedFaqSkeleton, type UnifiedFaqResolverOptions } from './faq-resolver';
import { namespacedSessionIdForMessage } from '../session-context';
import { runLeadCaptureHook } from '../lead-capture-hook';
import { detectContactIntent } from '../lead-capture-hook/contact-intent-detector';
import { getLeadCaptureI18n } from '../lead-capture-hook/i18n';
import { shouldTriggerHandoff, updateHandoffStateIfTriggered } from '../handoff-trigger';
import { containsHandoffKeyword } from '../../config/handoff';
import { scheduleHandoffNotify, scheduleHandoffTelegramNotify } from '../handoff-trigger/notify-outbound';
import { loadTelegramConfigForTenant } from '../../saas/tenant-channel-config';
import { resolveConversationPhase } from '../conversation-runtime/phase';
import { planTurn } from '../conversation-runtime/policy';
import { emitLeadCaptured, emitQualificationTagsUpdated } from '../conversation-runtime/events';
import { determineOwnerAssignment } from '../handoff-trigger/assign';
import { appendHandoffAssignmentRecord } from '../handoff-trigger/assignment-persistence';
import type { TenantRuntimeSettings } from '../../saas/tenant-runtime-settings';
import { getTenantIdOrNull } from '../../saas/tenant-context';
import { getSaaSDbDriver } from '../../saas/db-adapter';
import {
  getTenantProcessingState,
  upsertTenantProcessingStateWithCas,
} from '../../saas/processing-state-repository';
import { upsertLeaveMessageLead } from '../../saas/repository';
import { buildHandoffPendingNotifyIdempotencyKey } from '../../shared/outbound-idempotency';
import { maybeGenerateOpenAiReply } from './openai-reply';
import { observabilityFingerprint, writeStructuredLog } from '../../observability/structured-log';

export interface PipelineOptions {
  traceContext?: {
    request_id?: string;
    message_trace_id?: string;
  };
  /** Multi-tenant: FAQ from DB only (empty array = no built-in seed). Omit = legacy seed file. */
  faqEntries?: UnifiedFaqSeedEntry[];
  /** Phase 22B: tenant_settings applied per request (tenant webhooks only). */
  tenantRuntimeSettings?: TenantRuntimeSettings;
  /** Phase 22D: merged into saas_control when tenant path passed POST signature verification. */
  tenantPostSignatureSaasControl?: {
    tenant_post_secret_present: boolean;
    tenant_post_env_fallback_blocked: boolean;
  };
}

function buildFaqResolverOptions(options?: PipelineOptions): UnifiedFaqResolverOptions | undefined {
  if (options?.faqEntries === undefined) return undefined;
  const out: UnifiedFaqResolverOptions = { entries: options.faqEntries };
  if (options.tenantRuntimeSettings !== undefined) {
    out.fallbackEnabled = options.tenantRuntimeSettings.faq.fallback_enabled !== false;
  }
  return out;
}

export async function runUnifiedInboundPipeline(
  message: UnifiedInboundMessage,
  session?: UnifiedSessionContext,
  options?: PipelineOptions,
): Promise<{ session: UnifiedSessionContext; response: UnifiedResponse }> {
  const PROCESSING_STATE_VERSION_META_KEY = '__processing_state_version';
  const faqResolverOpts = buildFaqResolverOptions(options);

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

  let processingStateExpectedVersion: number | null = null;
  const tenantId = getTenantIdOrNull();
  const dbDriver = getSaaSDbDriver();
  if (tenantId && dbDriver === 'postgres') {
    const row = await getTenantProcessingState(tenantId, nextSession.session_id);
    processingStateExpectedVersion = row?.version ?? null;
    if (row?.version !== undefined) {
      nextSession.metadata = {
        ...(nextSession.metadata ?? {}),
        [PROCESSING_STATE_VERSION_META_KEY]: row.version,
      };
    }
  }

  // ── Step 0: Language Chooser ─────────────────────────────────────────────
  // Runs before any FAQ/lead/handoff logic. Returns early with chooser UI
  // or resolves session language so all downstream i18n uses the right lang.
  const chooser = options?.tenantRuntimeSettings?.language_chooser;
  const isNewSession = typeof session?.metadata?.bot_exchange_count !== 'number'
    || session.metadata.bot_exchange_count === 0;
  if (chooser && isNewSession) {
    // Brand-new session: determine language
    const platformLang = message.language ?? null;
    const shouldAutoSkip = chooser.auto_skip_if_platform_lang && platformLang !== null;

    if (chooser.enabled && !shouldAutoSkip) {
      // Send language chooser UI — user must pick before anything else
      nextSession.metadata = { ...(nextSession.metadata ?? {}), awaiting_language_choice: true };
      const supported = chooser.supported.length > 0 ? chooser.supported : ['zh', 'en', 'vi', 'ms-MY'];
      const LANG_LABELS: Record<string, string> = {
        zh: '中文', en: 'English', vi: 'Tiếng Việt', 'ms-MY': 'Bahasa Melayu',
      };
      const chooserButtons = supported.map((l) => LANG_LABELS[l] ?? l);
      const chooserText = '请选择语言 / Please choose your language / Sila pilih bahasa / Vui lòng chọn ngôn ngữ';

      const chooserResponse = applyUnifiedDispatchPlaceholder({
        channel: message.channel,
        session_id: nextSession.session_id,
        kind: 'text',
        reply_text: chooserText,
        should_send: true,
        handoff_required: false,
        lead_capture_prompt: null,
        quick_reply_buttons: chooserButtons,
        debug_steps: ['language_chooser_sent'],
        debug_metadata: { language_chooser: true, supported },
      });
      return { session: nextSession, response: chooserResponse };
    }

    // Auto-skip or chooser disabled: write resolved language into session
    const resolvedLang = platformLang ?? chooser.default_language;
    nextSession = { ...nextSession, current_language: resolvedLang };
  } else if (session?.metadata?.awaiting_language_choice === true && message.text) {
    // Returning user is answering the language chooser
    const LABEL_TO_LANG: Record<string, TenantRuntimeSettings['language_chooser']['default_language']> = {
      '中文': 'zh', 'english': 'en', 'tiếng việt': 'vi', 'bahasa melayu': 'ms-MY',
      'zh': 'zh', 'en': 'en', 'vi': 'vi', 'ms-my': 'ms-MY',
    };
    const pick = LABEL_TO_LANG[message.text.trim().toLowerCase()];
    if (pick) {
      nextSession = {
        ...nextSession,
        current_language: pick,
        metadata: { ...(nextSession.metadata ?? {}), awaiting_language_choice: false, language_chosen: true },
      };
      // Now send the welcome message in the chosen language
      const botSettings = options?.tenantRuntimeSettings?.bot;
      const byLang = botSettings?.welcome_by_language?.[pick];
      const welcomeMsg = byLang?.message?.trim() || botSettings?.welcome_message?.trim() || '';
      const welcomeBtns = byLang?.buttons?.length ? byLang.buttons.slice(0, 5) : (botSettings?.welcome_buttons ?? []);
      if (welcomeMsg) {
        const welcomeResponse = applyUnifiedDispatchPlaceholder({
          channel: message.channel,
          session_id: nextSession.session_id,
          kind: 'text',
          reply_text: welcomeMsg,
          should_send: true,
          handoff_required: false,
          lead_capture_prompt: null,
          quick_reply_buttons: welcomeBtns.length > 0 ? welcomeBtns : undefined,
          debug_steps: ['language_chosen', `welcome_by_lang:${pick}`],
          debug_metadata: { language_chosen: pick },
        });
        return { session: nextSession, response: welcomeResponse };
      }
    }
  }
  // ── End Step 0 ───────────────────────────────────────────────────────────

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

  writeStructuredLog({
    type: 'pipeline_milestone',
    phase: 'pipeline',
    outcome: 'dispatch_resolved',
    code: String(dispatchResult.nextStage),
    tenant_id: tenantId,
    channel: message.channel,
    message_trace_id: options?.traceContext?.message_trace_id ?? null,
    request_id: options?.traceContext?.request_id ?? null,
    session_fp: observabilityFingerprint(nextSession.session_id),
  });

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
    
    // 记录分配历史（如果发生了新分配）；返回值与 JSONL 行 assignment_log_id 对齐供 notify
    let assignmentLogIdFromJsonl: string | undefined;
    if (assignment.assign_reason !== 'none' && assignment.assigned_owner_id) {
      const tagHits = sessionAfterHandoffCheck.metadata?.qualification_tags as string[] || [];
      assignmentLogIdFromJsonl = appendHandoffAssignmentRecord(
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

    const notifyPayload = {
      event: 'handoff_pending' as const,
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
      assignment_log_id:
        assignmentLogIdFromJsonl ??
        (assignment.assign_reason !== 'none'
          ? `${Date.now().toString(36).slice(-6)}-${simpleStringHash(sessionAfterHandoffCheck.session_id).toString(36).slice(-6)}`
          : undefined),
      idempotency_key: buildHandoffPendingNotifyIdempotencyKey({
        sessionId: sessionAfterHandoffCheck.session_id,
        requestId: options?.traceContext?.request_id,
      }),
    };
    scheduleHandoffNotify(notifyPayload);

    // Telegram operator notification (fire-and-forget)
    const opNotify = options?.tenantRuntimeSettings?.operator_notify?.telegram;
    if (opNotify?.enabled && opNotify.chat_id && tenantId) {
      // Load bot token from tenant_credentials (per-tenant, not global env)
      loadTelegramConfigForTenant(tenantId).then((tgConfig) => {
        // eslint-disable-next-line no-console
        console.log('[pipeline] operator notify token present:', !!tgConfig?.botToken);
        if (tgConfig?.botToken) {
          scheduleHandoffTelegramNotify({ botToken: tgConfig.botToken, operatorChatId: opNotify.chat_id, payload: notifyPayload });
        }
      }).catch((e) => {
        // eslint-disable-next-line no-console
        console.warn('[pipeline] failed to load telegram config for operator notify:', e instanceof Error ? e.message : String(e));
      });
    }
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
      ? {
          suppress_reply_tenant_enabled: options.tenantRuntimeSettings.suppress_reply.enabled,
          faq_fallback_enabled: options.tenantRuntimeSettings.faq.fallback_enabled,
        }
      : {}),
  };
  
  const turnPlan = planTurn(policyContext);
  let finalReplyText = turnPlan.reply_text;
  let finalShouldSend = turnPlan.should_send;

  // --- Welcome message: fire on first contact (no prior messages in session) ---
  let welcomeQuickButtons: string[] = [];
  const botSettings = options?.tenantRuntimeSettings?.bot;
  const hasAnyWelcomeContent =
    botSettings &&
    (botSettings.welcome_message.trim().length > 0 ||
      (botSettings.welcome_by_language
        ? Object.values(botSettings.welcome_by_language).some((e) => e?.message?.trim().length > 0)
        : false));
  // "First contact" = welcome content exists AND user has no prior exchanges.
  // We cannot rely on !session because createOrUpdateSessionContext always
  // returns a session object (even for brand-new users). Instead we check
  // bot_exchange_count: it is written to metadata AFTER this block, so on
  // the very first message it is always 0 / undefined.
  const priorExchangeCount = typeof session?.metadata?.bot_exchange_count === 'number'
    ? session.metadata.bot_exchange_count
    : 0;
  const isFirstContact =
    hasAnyWelcomeContent &&
    priorExchangeCount === 0;

  if (isFirstContact) {
    // Prefer per-language welcome when language is known (e.g. auto-skip resolved it from platform).
    const detectedLang = nextSession.current_language as import('../../saas/tenant-runtime-settings').SupportedLang | null;
    const byLang = detectedLang ? botSettings!.welcome_by_language?.[detectedLang] : undefined;
    finalReplyText = (byLang?.message?.trim() || botSettings!.welcome_message.trim());
    finalShouldSend = true;
    const langButtons = byLang?.buttons?.length ? byLang.buttons.slice(0, 5) : botSettings!.welcome_buttons;
    if (langButtons.length > 0) {
      welcomeQuickButtons = langButtons;
    }
    debug_steps.push(byLang ? `welcome_sent_by_lang:${detectedLang}` : 'welcome_sent');
  }

  // --- Track exchange count in session metadata (used by lead_trigger_after_n) ---
  const prevExchangeCount = typeof sessionAfterHandoffCheck.metadata?.bot_exchange_count === 'number'
    ? sessionAfterHandoffCheck.metadata.bot_exchange_count
    : 0;
  const currentExchangeCount = prevExchangeCount + 1;
  sessionAfterHandoffCheck.metadata = {
    ...(sessionAfterHandoffCheck.metadata ?? {}),
    bot_exchange_count: currentExchangeCount,
  };

  // --- Leave-a-message mode ---
  // Triggered when: user hit a handoff keyword AND handoff.enabled = false (no real agent)
  // OR user is in leave_message_collecting mode from prior turn.
  let isLeaveMessageTurn = false;
  const leaveMessageMode = botSettings?.leave_message_mode === true;
  const handoffDisabled = options?.tenantRuntimeSettings?.handoff?.enabled === false;
  const userWantsHuman = message.text ? containsHandoffKeyword(message.text) : false;
  const collectingLeaveMessage = sessionAfterHandoffCheck.metadata?.leave_message_collecting === true;

  if (leaveMessageMode && !isFirstContact) {
    const DEFAULT_LEAVE_PROMPT = '目前客服暂时不在线，请留下你的姓名、联系方式和需求，我们会尽快联系你。';
    const DEFAULT_LEAVE_CONFIRM = '好的，我们已记录你的留言，客服人员会尽快联系你。谢谢！';

    if (collectingLeaveMessage) {
      // User's current message IS the leave-note. Store it via lead capture collected_fields.
      const leaveText = message.text ?? '';
      sessionAfterHandoffCheck.lead_capture_state = {
        ...sessionAfterHandoffCheck.lead_capture_state,
        collected_fields: {
          ...(sessionAfterHandoffCheck.lead_capture_state.collected_fields ?? {}),
          leave_message: leaveText,
          leave_message_at: new Date().toISOString(),
        },
        status: sessionAfterHandoffCheck.lead_capture_state.status === 'none'
          ? 'partial'
          : sessionAfterHandoffCheck.lead_capture_state.status,
      };
      // Also write to conversation_summary so operator can see it if lead is created
      sessionAfterHandoffCheck.conversation_summary = `[留言] ${leaveText}`;
      sessionAfterHandoffCheck.metadata = {
        ...sessionAfterHandoffCheck.metadata,
        leave_message_collecting: false,
        leave_message_recorded: true,
      };
      finalReplyText = botSettings!.leave_message_confirmation_text?.trim() || DEFAULT_LEAVE_CONFIRM;
      finalShouldSend = true;
      isLeaveMessageTurn = true;
      debug_steps.push('leave_message_recorded');

      // Auto-create Lead — fire-and-forget, never breaks bot reply
      if (tenantId) {
        const capturedFields = sessionAfterHandoffCheck.lead_capture_state.collected_fields ?? {};
        upsertLeaveMessageLead({
          tenant_id: tenantId,
          session_id: sessionAfterHandoffCheck.session_id,
          channel: message.channel,
          leave_message_text: leaveText,
          name: capturedFields.name != null ? String(capturedFields.name) : null,
          phone: capturedFields.phone != null ? String(capturedFields.phone) : null,
          email: capturedFields.email != null ? String(capturedFields.email) : null,
        }).then((r: { lead: unknown; created: boolean }) => {
          debug_steps.push(r.created ? 'leave_lead_created' : 'leave_lead_exists');
        }).catch((err: unknown) => {
          // eslint-disable-next-line no-console
          console.warn('[pipeline] leave_message auto-lead failed:', err instanceof Error ? err.message : String(err));
        });
      }
    } else if (userWantsHuman && handoffDisabled) {
      // User wants human but handoff is off — enter leave-message mode
      sessionAfterHandoffCheck.metadata = {
        ...sessionAfterHandoffCheck.metadata,
        leave_message_collecting: true,
      };
      finalReplyText = botSettings!.leave_message_prompt_text?.trim() || DEFAULT_LEAVE_PROMPT;
      finalShouldSend = true;
      isLeaveMessageTurn = true;
      debug_steps.push('leave_message_prompt_sent');
    }
  }

  let llmResult:
    | {
        used: boolean;
        reason: string;
        provider: 'openai';
        model: string;
        error_message?: string;
      }
    | undefined;
  if (
    !isFirstContact &&
    !isLeaveMessageTurn &&
    options?.tenantRuntimeSettings?.llm?.enabled === true &&
    turnPlan.policy_path === 'default' &&
    !faqResult.matched &&
    message.text
  ) {
    const r = await maybeGenerateOpenAiReply({
      userText: message.text,
      language: message.language ?? sessionAfterHandoffCheck.current_language,
      config: {
        enabled: options.tenantRuntimeSettings.llm.enabled,
        model: options.tenantRuntimeSettings.llm.model,
      },
      persona: options.tenantRuntimeSettings.bot?.persona || undefined,
      followupPrompt: options.tenantRuntimeSettings.bot?.followup_prompt || undefined,
      faqContext: buildFaqContextString(options.faqEntries),
    });
    llmResult = {
      used: r.used,
      reason: r.reason,
      provider: r.provider,
      model: r.model,
      error_message: r.error_message,
    };
    if (r.used && r.reply_text) {
      finalReplyText = r.reply_text;
      finalShouldSend = true;
      debug_steps.push('llm_openai_used');
    } else {
      debug_steps.push(`llm_openai_skipped:${r.reason}`);
    }
  }

  // --- lead_trigger_after_n: soft nudge after N exchanges if no contact info yet ---
  const leadTriggerN = botSettings?.lead_trigger_after_n ?? 0;
  const leadAlreadyNudgedThisSession = sessionAfterHandoffCheck.metadata?.lead_nudge_sent === true;
  const leadStatus = sessionAfterHandoffCheck.lead_capture_state.status;
  const inHandoff = sessionAfterHandoffCheck.handoff_state.status !== 'none';
  const shouldNudgeLead =
    leadTriggerN > 0 &&
    currentExchangeCount >= leadTriggerN &&
    leadStatus === 'none' &&
    !leadAlreadyNudgedThisSession &&
    !isFirstContact &&
    !isLeaveMessageTurn &&
    !inHandoff &&
    finalShouldSend; // only append if we're already sending a reply

  if (shouldNudgeLead) {
    const DEFAULT_NUDGE = '如果你愿意，也可以留下联系方式，我们方便进一步协助你。';
    const nudge = botSettings?.lead_nudge_text?.trim() || DEFAULT_NUDGE;
    finalReplyText = finalReplyText ? `${finalReplyText}\n\n${nudge}` : nudge;
    sessionAfterHandoffCheck.metadata = {
      ...sessionAfterHandoffCheck.metadata,
      lead_nudge_sent: true,
    };
    debug_steps.push('lead_nudge_appended');
  }

  const botReplyAllowed =
    options?.tenantRuntimeSettings === undefined ||
    options.tenantRuntimeSettings.bot.enabled !== false;
  const effectiveShouldSend = botReplyAllowed && finalShouldSend;

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
    reply_text: finalReplyText,
    should_send: effectiveShouldSend,
    handoff_required: handoffRequired,
    lead_capture_prompt: turnPlan.lead_capture_prompt,
    quick_reply_buttons: welcomeQuickButtons.length > 0 ? welcomeQuickButtons : undefined,
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
              faq_fallback_enabled: options.tenantRuntimeSettings.faq.fallback_enabled !== false,
              faq_fallback_suppressed: options.tenantRuntimeSettings.faq.fallback_enabled === false,
              llm_enabled: options.tenantRuntimeSettings.llm.enabled === true,
              llm_provider: options.tenantRuntimeSettings.llm.provider,
              llm_model: options.tenantRuntimeSettings.llm.model,
              leave_message_mode: options.tenantRuntimeSettings.bot?.leave_message_mode ?? false,
              lead_trigger_after_n: options.tenantRuntimeSettings.bot?.lead_trigger_after_n ?? 0,
              bot_exchange_count: currentExchangeCount,
              leave_message_turn: isLeaveMessageTurn,
              lead_nudge_sent: shouldNudgeLead,
              ...(options.tenantPostSignatureSaasControl !== undefined
                ? {
                    tenant_post_secret_present: options.tenantPostSignatureSaasControl.tenant_post_secret_present,
                    tenant_post_env_fallback_blocked:
                      options.tenantPostSignatureSaasControl.tenant_post_env_fallback_blocked,
                  }
                : {}),
            },
          }
        : {}),
      ...(llmResult
        ? {
            llm: llmResult,
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

  if (tenantId && dbDriver === 'postgres') {
    const processingPayload = {
      phase: phaseContext.phase,
      dispatch_stage: dispatchResult.nextStage,
      policy_path: turnPlan.policy_path,
      faq_matched: Boolean(faqResult.matched),
      handoff_required: handoffRequired,
      request_id: options?.traceContext?.request_id,
      message_trace_id: options?.traceContext?.message_trace_id,
    };
    const saved = await upsertTenantProcessingStateWithCas({
      tenant_id: tenantId,
      session_id: sessionAfterHandoffCheck.session_id,
      processing_stage: phaseContext.phase,
      state: processingPayload,
      expected_version: processingStateExpectedVersion,
    });
    if (!saved.ok) {
      throw new Error('processing_state_cas_conflict');
    }
    sessionAfterHandoffCheck.metadata = {
      ...(sessionAfterHandoffCheck.metadata ?? {}),
      [PROCESSING_STATE_VERSION_META_KEY]: saved.version,
    };
  }

  writeStructuredLog({
    type: 'pipeline_milestone',
    phase: 'pipeline',
    outcome: 'pipeline_complete',
    code: String(phaseContext.phase),
    tenant_id: tenantId,
    channel: message.channel,
    message_trace_id: options?.traceContext?.message_trace_id ?? null,
    request_id: options?.traceContext?.request_id ?? null,
    session_fp: observabilityFingerprint(sessionAfterHandoffCheck.session_id),
  });

  return {
    session: sessionAfterHandoffCheck,
    response,
  };

// 辅助函数：构建FAQ上下文字符串（跨语言LLM注入）
function buildFaqContextString(entries: UnifiedFaqSeedEntry[] | undefined): string | undefined {
  if (!entries || entries.length === 0) return undefined;
  return entries
    .slice(0, 30)
    .map((e, i) => {
      const q = e.question.trim();
      const a = e.answer.length > 300 ? e.answer.slice(0, 297) + '...' : e.answer.trim();
      return `Q${i + 1}: ${q}\nA${i + 1}: ${a}`;
    })
    .join('\n\n');
}

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