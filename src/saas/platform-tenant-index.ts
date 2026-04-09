import { countConnectedTenantChannels } from './tenant-channels-inspect';
import { computeTenantSetupProgress } from './setup-progress';
import { parseTenantRuntimeSettings } from './tenant-runtime-settings';
import {
  getLatestTenantGoLiveCheck,
  getTenantLastActiveIso,
  getTenantRuntimeHealth,
  getTenantSettingsJson,
  listTenants,
  getTenantCredentialsForOutbound,
  countActiveFaqEntries,
} from './repository';

export type PlatformTenantIndexStatus = 'setup' | 'live' | 'paused';
export type PlatformGoLiveStatus = 'not_ready' | 'partially_ready' | 'ready_to_go_live';

export interface PlatformTenantIndexRow {
  id: string;
  slug: string;
  name: string;
  created_at: string;
  status: PlatformTenantIndexStatus;
  lifecycle_status: 'active' | 'suspended';
  setup_percentage: number;
  go_live_status: PlatformGoLiveStatus;
  channels_ready: boolean;
  ai_enabled: boolean;
  knowledge_ready: boolean;
  channels_count: number;
  last_active: string | null;
  last_error: string | null;
}

export async function listPlatformTenantIndexRows(): Promise<PlatformTenantIndexRow[]> {
  const tenants = await listTenants();
  const out: PlatformTenantIndexRow[] = [];
  for (const t of tenants) {
    const raw = await getTenantSettingsJson(t.id);
    const parsed = parseTenantRuntimeSettings(raw);
    const creds = await getTenantCredentialsForOutbound(t.id);
    const channels_count = countConnectedTenantChannels(creds);
    const openai = Boolean(creds.get('OPENAI_API_KEY')?.trim());
    const ai_enabled = parsed.llm.enabled === true && openai;
    const setup = await computeTenantSetupProgress(t);
    const goLive = await getLatestTenantGoLiveCheck(t.id);
    const faqCount = await countActiveFaqEntries(t.id);
    const runtimeHealth = await getTenantRuntimeHealth(t.id);
    let status: PlatformTenantIndexStatus = 'setup';
    if (t.status === 'suspended' || parsed.bot.enabled === false) {
      status = 'paused';
    } else if (channels_count > 0) {
      status = 'live';
    }
    const last_active = await getTenantLastActiveIso(t.id);
    out.push({
      id: t.id,
      slug: t.slug,
      name: t.name,
      created_at: t.created_at,
      status,
      lifecycle_status: t.status,
      setup_percentage: setup.setup_percentage,
      go_live_status: t.status === 'suspended' ? 'not_ready' : goLive?.status ?? 'not_ready',
      channels_ready: channels_count > 0,
      ai_enabled,
      knowledge_ready: faqCount > 0,
      channels_count,
      last_active,
      last_error: runtimeHealth?.last_error_message ?? null,
    });
  }
  return out;
}
