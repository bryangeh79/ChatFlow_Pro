/**
 * tenant_settings JSON consumed at runtime (Phase 22B/22C).
 * Stored in tenant_settings.settings_json; merged via Admin PUT .../settings.
 */

import { getTenantSettingsJson } from './repository';

export interface TenantRuntimeSettings {
  handoff: {
    /** Default true when omitted. false = no keyword/API path may set pending / notify. */
    enabled: boolean;
  };
  /** Default true when omitted. false = no lead/handoff HTTP notify POST. */
  notify: {
    enabled: boolean;
  };
  /** Default true when omitted. false = no lead state merge, persistence, or capture-phase follow-on. */
  lead_capture: {
    enabled: boolean;
  };
  /** Default true when omitted. false = no auto outbound reply (tenant path only). */
  bot: {
    enabled: boolean;
    /** System prompt / bot persona. Empty string = use built-in default. */
    persona: string;
    /** First-contact welcome message. Empty string = no proactive greeting. */
    welcome_message: string;
    /** Quick-reply button labels shown with welcome message (max 5). */
    welcome_buttons: string[];
    /** Appended to every LLM system prompt to guide follow-up. Empty string = disabled. */
    followup_prompt: string;
    /** When true, bot collects a leave-a-message when no agent is available. */
    leave_message_mode: boolean;
    /** Bot reply prompting user to leave their message. Empty = use built-in default. */
    leave_message_prompt_text: string;
    /** Bot confirmation after user leaves a message. Empty = use built-in default. */
    leave_message_confirmation_text: string;
    /** Trigger lead collection prompt after this many exchanges (0 = disabled). */
    lead_trigger_after_n: number;
    /** Soft nudge text appended to replies to invite contact info. Empty = use built-in default. */
    lead_nudge_text: string;
  };
  /**
   * Default true when omitted. false = handoff reply suppression (env-driven) cannot apply for this tenant.
   * Independent of bot.enabled (send master switch).
   */
  suppress_reply: {
    enabled: boolean;
  };
  /**
   * Default true when omitted. false = no FAQ language/cross-language fallback tiers or default-phase text echo when FAQ misses (tenant path only).
   * Does not disable FAQ hits in the tenant’s primary language tier.
   */
  faq: {
    fallback_enabled: boolean;
  };
  /**
   * Tenant-level AI reply switch (default off): enable per tenant only when key is configured.
   */
  llm: {
    enabled: boolean;
    provider: 'openai';
    model: string;
  };
}

const DEFAULT_RUNTIME: TenantRuntimeSettings = {
  handoff: { enabled: true },
  notify: { enabled: true },
  lead_capture: { enabled: true },
  bot: {
    enabled: true,
    persona: '',
    welcome_message: '',
    welcome_buttons: [],
    followup_prompt: '',
    leave_message_mode: false,
    leave_message_prompt_text: '',
    leave_message_confirmation_text: '',
    lead_trigger_after_n: 0,
    lead_nudge_text: '',
  },
  suppress_reply: { enabled: true },
  faq: { fallback_enabled: true },
  llm: { enabled: false, provider: 'openai', model: 'gpt-4o-mini' },
};

function parseHandoffBlock(raw: unknown): TenantRuntimeSettings['handoff'] {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const h = raw as Record<string, unknown>;
    if (typeof h.enabled === 'boolean') {
      return { enabled: h.enabled };
    }
  }
  return { ...DEFAULT_RUNTIME.handoff };
}

function parseNotifyBlock(raw: unknown): TenantRuntimeSettings['notify'] {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const n = raw as Record<string, unknown>;
    if (typeof n.enabled === 'boolean') {
      return { enabled: n.enabled };
    }
  }
  return { ...DEFAULT_RUNTIME.notify };
}

function parseLeadCaptureBlock(raw: unknown): TenantRuntimeSettings['lead_capture'] {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const l = raw as Record<string, unknown>;
    if (typeof l.enabled === 'boolean') {
      return { enabled: l.enabled };
    }
  }
  return { ...DEFAULT_RUNTIME.lead_capture };
}

function parseBotBlock(raw: unknown): TenantRuntimeSettings['bot'] {
  const defaults = DEFAULT_RUNTIME.bot;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const b = raw as Record<string, unknown>;
    const enabled = typeof b.enabled === 'boolean' ? b.enabled : defaults.enabled;
    const persona = typeof b.persona === 'string' ? b.persona : defaults.persona;
    const welcome_message = typeof b.welcome_message === 'string' ? b.welcome_message : defaults.welcome_message;
    const welcome_buttons =
      Array.isArray(b.welcome_buttons) &&
      b.welcome_buttons.every((x) => typeof x === 'string')
        ? (b.welcome_buttons as string[]).slice(0, 5)
        : defaults.welcome_buttons;
    const followup_prompt = typeof b.followup_prompt === 'string' ? b.followup_prompt : defaults.followup_prompt;
    const leave_message_mode = typeof b.leave_message_mode === 'boolean' ? b.leave_message_mode : defaults.leave_message_mode;
    const leave_message_prompt_text = typeof b.leave_message_prompt_text === 'string' ? b.leave_message_prompt_text : defaults.leave_message_prompt_text;
    const leave_message_confirmation_text = typeof b.leave_message_confirmation_text === 'string' ? b.leave_message_confirmation_text : defaults.leave_message_confirmation_text;
    const lead_trigger_after_n =
      typeof b.lead_trigger_after_n === 'number' && b.lead_trigger_after_n >= 0
        ? Math.floor(b.lead_trigger_after_n)
        : defaults.lead_trigger_after_n;
    const lead_nudge_text = typeof b.lead_nudge_text === 'string' ? b.lead_nudge_text : defaults.lead_nudge_text;
    return { enabled, persona, welcome_message, welcome_buttons, followup_prompt, leave_message_mode, leave_message_prompt_text, leave_message_confirmation_text, lead_trigger_after_n, lead_nudge_text };
  }
  return { ...defaults };
}

function parseSuppressReplyBlock(raw: unknown): TenantRuntimeSettings['suppress_reply'] {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const s = raw as Record<string, unknown>;
    if (typeof s.enabled === 'boolean') {
      return { enabled: s.enabled };
    }
  }
  return { ...DEFAULT_RUNTIME.suppress_reply };
}

function parseFaqBlock(raw: unknown): TenantRuntimeSettings['faq'] {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const f = raw as Record<string, unknown>;
    if (typeof f.fallback_enabled === 'boolean') {
      return { fallback_enabled: f.fallback_enabled };
    }
  }
  return { ...DEFAULT_RUNTIME.faq };
}

function parseLlmBlock(raw: unknown): TenantRuntimeSettings['llm'] {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const l = raw as Record<string, unknown>;
    const enabled =
      typeof l.enabled === 'boolean' ? l.enabled : DEFAULT_RUNTIME.llm.enabled;
    const provider = l.provider === 'openai' ? 'openai' : DEFAULT_RUNTIME.llm.provider;
    const model =
      typeof l.model === 'string' && l.model.trim().length > 0
        ? l.model.trim()
        : DEFAULT_RUNTIME.llm.model;
    return { enabled, provider, model };
  }
  return { ...DEFAULT_RUNTIME.llm };
}

/**
 * Parse DB JSON into runtime settings. Unknown keys ignored; invalid shapes fall back to defaults.
 */
export function parseTenantRuntimeSettings(raw: Record<string, unknown>): TenantRuntimeSettings {
  return {
    handoff: parseHandoffBlock(raw.handoff),
    notify: parseNotifyBlock(raw.notify),
    lead_capture: parseLeadCaptureBlock(raw.lead_capture),
    bot: parseBotBlock(raw.bot),
    suppress_reply: parseSuppressReplyBlock(raw.suppress_reply),
    faq: parseFaqBlock(raw.faq),
    llm: parseLlmBlock(raw.llm),
  };
}

export function logSaasControlPipelineDebug(args: {
  tenantId: string;
  settingsKeyCount: number;
  parsed: TenantRuntimeSettings;
}): void {
  const handoffOff = args.parsed.handoff.enabled === false;
  const notifyOff = args.parsed.notify.enabled === false;
  const leadCapOff = args.parsed.lead_capture.enabled === false;
  const botOff = args.parsed.bot.enabled === false;
  const suppressReplyOff = args.parsed.suppress_reply.enabled === false;
  const faqFallbackOff = args.parsed.faq.fallback_enabled === false;
  const llmEnabled = args.parsed.llm.enabled === true;
  console.debug(
    '[saas-control]',
    JSON.stringify({
      phase: '22c',
      tenant_id: args.tenantId,
      tenant_settings_resolved: true,
      settings_key_count: args.settingsKeyCount,
      handoff_enabled: args.parsed.handoff.enabled,
      handoff_trigger_blocked: handoffOff,
      notify_enabled: args.parsed.notify.enabled,
      notify_http_blocked: notifyOff,
      lead_capture_enabled: args.parsed.lead_capture.enabled,
      lead_capture_hook_suppressed: leadCapOff,
      bot_enabled: args.parsed.bot.enabled,
      bot_reply_suppressed: botOff,
      suppress_reply_enabled: args.parsed.suppress_reply.enabled,
      suppress_reply_suppressed: suppressReplyOff,
      faq_fallback_enabled: args.parsed.faq.fallback_enabled,
      faq_fallback_suppressed: faqFallbackOff,
      llm_enabled: llmEnabled,
      llm_provider: args.parsed.llm.provider,
      llm_model: args.parsed.llm.model,
    }),
  );
}

/** Load + parse + debug log for one tenant webhook request. */
export async function loadTenantRuntimeSettingsForTenantRequest(tenantId: string): Promise<TenantRuntimeSettings> {
  const raw = await getTenantSettingsJson(tenantId);
  const parsed = parseTenantRuntimeSettings(raw);
  logSaasControlPipelineDebug({
    tenantId,
    settingsKeyCount: Object.keys(raw).length,
    parsed,
  });
  return parsed;
}
