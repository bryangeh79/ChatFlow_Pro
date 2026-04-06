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
  };
}

const DEFAULT_RUNTIME: TenantRuntimeSettings = {
  handoff: { enabled: true },
  notify: { enabled: true },
  lead_capture: { enabled: true },
  bot: { enabled: true },
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
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const b = raw as Record<string, unknown>;
    if (typeof b.enabled === 'boolean') {
      return { enabled: b.enabled };
    }
  }
  return { ...DEFAULT_RUNTIME.bot };
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
