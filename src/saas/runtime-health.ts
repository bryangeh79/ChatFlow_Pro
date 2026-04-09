import { countConnectedTenantChannels } from './tenant-channels-inspect';
import {
  getTenantCredentialsForOutbound,
  getTenantSettingsJson,
  insertPlatformLog,
  upsertTenantRuntimeHealth,
} from './repository';
import { parseTenantRuntimeSettings } from './tenant-runtime-settings';

export async function refreshTenantRuntimeHealth(tenantId: string, args?: {
  last_inbound_at?: string | null;
  last_webhook_success_at?: string | null;
  last_error_message?: string | null;
  last_error_at?: string | null;
}): Promise<void> {
  const settings = await getTenantSettingsJson(tenantId);
  const runtime = parseTenantRuntimeSettings(settings);
  const creds = await getTenantCredentialsForOutbound(tenantId);
  const channels = countConnectedTenantChannels(creds);
  let live_status: 'inactive' | 'degraded' | 'live' | 'paused' = 'inactive';
  if (runtime.bot.enabled === false) {
    live_status = 'paused';
  } else if (channels > 0) {
    live_status = args?.last_error_message ? 'degraded' : 'live';
  }
  await upsertTenantRuntimeHealth({
    tenant_id: tenantId,
    ai_enabled: runtime.llm.enabled === true,
    live_status,
    last_inbound_at: args?.last_inbound_at ?? null,
    last_webhook_success_at: args?.last_webhook_success_at ?? null,
    last_error_message: args?.last_error_message ?? null,
    last_error_at: args?.last_error_at ?? null,
  });
  if (args?.last_error_message) {
    await insertPlatformLog({
      tenant_id: tenantId,
      severity: 'error',
      source: 'runtime_health',
      message: args.last_error_message,
    });
  }
}
