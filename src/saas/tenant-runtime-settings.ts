/**
 * Phase 22B — tenant_settings JSON shape consumed at runtime (minimal).
 * Stored in DB as tenant_settings.settings_json; merged via Admin PUT .../settings.
 */

import { getTenantSettingsJson } from './repository';

export interface TenantRuntimeSettings {
  handoff: {
    /** Default true when omitted. false = no keyword/API path may set pending / notify. */
    enabled: boolean;
  };
}

const DEFAULT_RUNTIME: TenantRuntimeSettings = {
  handoff: { enabled: true },
};

/**
 * Parse DB JSON into runtime settings. Unknown keys ignored; invalid shapes fall back to defaults.
 */
export function parseTenantRuntimeSettings(raw: Record<string, unknown>): TenantRuntimeSettings {
  const handoffRaw = raw.handoff;
  if (handoffRaw && typeof handoffRaw === 'object' && !Array.isArray(handoffRaw)) {
    const h = handoffRaw as Record<string, unknown>;
    if (typeof h.enabled === 'boolean') {
      return { handoff: { enabled: h.enabled } };
    }
  }
  return { ...DEFAULT_RUNTIME };
}

export function logSaasControlPipelineDebug(args: {
  tenantId: string;
  settingsKeyCount: number;
  parsed: TenantRuntimeSettings;
}): void {
  const handoffOff = args.parsed.handoff.enabled === false;
  console.debug(
    '[saas-control]',
    JSON.stringify({
      phase: '22b',
      tenant_id: args.tenantId,
      tenant_settings_resolved: true,
      settings_key_count: args.settingsKeyCount,
      handoff_enabled: args.parsed.handoff.enabled,
      handoff_trigger_blocked: handoffOff,
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
