import { countConnectedTenantChannels } from './tenant-channels-inspect';
import {
  countActiveFaqEntries,
  getLatestTenantTestResult,
  getTenantCredentialsForOutbound,
  getTenantSettingsJson,
  type TenantRow,
} from './repository';
import { parseTenantRuntimeSettings } from './tenant-runtime-settings';

export interface TenantSetupProgress {
  setup_percentage: number;
  checks: {
    company_info_complete: boolean;
    first_channel_connected: boolean;
    openai_key_saved: boolean;
    faq_added: boolean;
    ai_enabled: boolean;
    test_passed: boolean;
  };
}

const WEIGHTS = {
  company_info_complete: 10,
  first_channel_connected: 20,
  openai_key_saved: 20,
  faq_added: 15,
  ai_enabled: 15,
  test_passed: 20,
} as const;

export async function computeTenantSetupProgress(tenant: TenantRow): Promise<TenantSetupProgress> {
  const settingsRaw = await getTenantSettingsJson(tenant.id);
  const runtime = parseTenantRuntimeSettings(settingsRaw);
  const creds = await getTenantCredentialsForOutbound(tenant.id);
  const channels = countConnectedTenantChannels(creds);
  const openai = Boolean(creds.get('OPENAI_API_KEY')?.trim());
  const faqCount = await countActiveFaqEntries(tenant.id);
  const latestChannelTest = await getLatestTenantTestResult(tenant.id, 'channel', 'any');
  const latestAiTest = await getLatestTenantTestResult(tenant.id, 'ai', 'openai_connection');
  const latestWebsiteTest = await getLatestTenantTestResult(tenant.id, 'website', 'widget');
  const checks = {
    company_info_complete: tenant.name.trim().length > 0,
    first_channel_connected: channels > 0,
    openai_key_saved: openai,
    faq_added: faqCount > 0,
    ai_enabled: runtime.llm.enabled === true,
    test_passed:
      latestChannelTest?.status === 'passed' ||
      latestAiTest?.status === 'passed' ||
      latestWebsiteTest?.status === 'passed',
  };
  const setup_percentage =
    (checks.company_info_complete ? WEIGHTS.company_info_complete : 0) +
    (checks.first_channel_connected ? WEIGHTS.first_channel_connected : 0) +
    (checks.openai_key_saved ? WEIGHTS.openai_key_saved : 0) +
    (checks.faq_added ? WEIGHTS.faq_added : 0) +
    (checks.ai_enabled ? WEIGHTS.ai_enabled : 0) +
    (checks.test_passed ? WEIGHTS.test_passed : 0);
  return { setup_percentage, checks };
}
