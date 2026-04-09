import { countConnectedTenantChannels } from './tenant-channels-inspect';
import {
  countActiveFaqEntries,
  getLatestTenantTestResult,
  getTenantCredentialsForOutbound,
  getTenantSettingsJson,
  getTenantById,
  insertTenantGoLiveCheck,
  listTenantWebsiteDomains,
  insertPlatformLog,
} from './repository';
import { parseTenantRuntimeSettings } from './tenant-runtime-settings';

export type GoLiveCheckKey =
  | 'has_channel_connected'
  | 'has_valid_openai_key'
  | 'ai_enabled'
  | 'knowledge_exists'
  | 'welcome_message_exists'
  | 'latest_test_passed';

export interface GoLiveCheckItem {
  check_key: GoLiveCheckKey;
  status: 'passed' | 'failed';
  message: string;
  blocking: boolean;
  checked_at: string;
}

export interface GoLiveCheckRunResult {
  status: 'not_ready' | 'partially_ready' | 'ready_to_go_live';
  items: GoLiveCheckItem[];
}

export async function runTenantGoLiveCheck(tenantId: string, actor: string): Promise<GoLiveCheckRunResult> {
  const tenant = await getTenantById(tenantId);
  if (!tenant) throw new Error('tenant_not_found');
  if (tenant.status === 'suspended') {
    const checked_at = new Date().toISOString();
    const out: GoLiveCheckRunResult = {
      status: 'not_ready',
      items: [
        {
          check_key: 'has_channel_connected',
          status: 'failed',
          message: 'Tenant is suspended',
          blocking: true,
          checked_at,
        },
      ],
    };
    await insertTenantGoLiveCheck({
      tenant_id: tenantId,
      status: 'not_ready',
      results_json: JSON.stringify(out),
      checked_by: actor,
    });
    await insertPlatformLog({
      tenant_id: tenantId,
      severity: 'warning',
      source: 'lifecycle',
      message: 'Go-live check blocked by suspended status',
    });
    return out;
  }
  const checked_at = new Date().toISOString();
  const settings = await getTenantSettingsJson(tenantId);
  const runtime = parseTenantRuntimeSettings(settings);
  const creds = await getTenantCredentialsForOutbound(tenantId);
  const channelsConnected = countConnectedTenantChannels(creds) > 0;
  const openaiSaved = Boolean(creds.get('OPENAI_API_KEY')?.trim());
  const openaiTest = await getLatestTenantTestResult(tenantId, 'ai', 'openai_connection');
  const openaiValid = openaiSaved && openaiTest?.status === 'passed';
  const knowledgeExists = (await countActiveFaqEntries(tenantId)) > 0;
  const websiteWelcome =
    settings.website &&
    typeof settings.website === 'object' &&
    typeof (settings.website as Record<string, unknown>).welcome_message === 'string' &&
    String((settings.website as Record<string, unknown>).welcome_message).trim().length > 0;
  const latestAnyTest = await getLatestTenantTestResult(tenantId, 'channel', 'any');
  const latestWebsiteWidget = await getLatestTenantTestResult(tenantId, 'website', 'widget');
  const latestAiTest = await getLatestTenantTestResult(tenantId, 'ai', 'openai_connection');
  const latestCandidates = [latestAnyTest, latestWebsiteWidget, latestAiTest].filter(
    (x): x is NonNullable<typeof x> => Boolean(x),
  );
  latestCandidates.sort((a, b) => b.tested_at.localeCompare(a.tested_at));
  const latestUnified = latestCandidates[0] ?? null;
  const latestTestPassed = latestUnified?.status === 'passed';
  const websiteDomains = await listTenantWebsiteDomains(tenantId);
  const websiteReady =
    websiteDomains.some((d) => d.is_verified) &&
    latestWebsiteWidget?.status === 'passed';
  const items: GoLiveCheckItem[] = [
    {
      check_key: 'has_channel_connected',
      status: channelsConnected ? 'passed' : 'failed',
      message: channelsConnected ? 'At least one channel connected' : 'No connected channels',
      blocking: true,
      checked_at,
    },
    {
      check_key: 'has_valid_openai_key',
      status: openaiValid ? 'passed' : 'failed',
      message: openaiValid ? 'OpenAI key tested successfully' : 'OpenAI key missing or test failed',
      blocking: true,
      checked_at,
    },
    {
      check_key: 'ai_enabled',
      status: runtime.llm.enabled ? 'passed' : 'failed',
      message: runtime.llm.enabled ? 'AI enabled' : 'AI disabled',
      blocking: true,
      checked_at,
    },
    {
      check_key: 'knowledge_exists',
      status: knowledgeExists ? 'passed' : 'failed',
      message: knowledgeExists ? 'Knowledge entries exist' : 'No active knowledge entries',
      blocking: true,
      checked_at,
    },
    {
      check_key: 'welcome_message_exists',
      status: websiteWelcome ? 'passed' : 'failed',
      message: websiteWelcome ? 'Website welcome message configured' : 'Website welcome message missing',
      blocking: true,
      checked_at,
    },
    {
      check_key: 'latest_test_passed',
      status: latestTestPassed ? 'passed' : 'failed',
      message: latestUnified
        ? latestTestPassed
          ? `Latest test passed (${latestUnified.scope_type}/${latestUnified.scope_key})`
          : `Latest test failed (${latestUnified.scope_type}/${latestUnified.scope_key})`
        : 'No test found',
      blocking: true,
      checked_at,
    },
  ];
  const failedCritical = items.some((i) => i.blocking && i.status === 'failed');
  let status: GoLiveCheckRunResult['status'] = 'not_ready';
  if (!failedCritical) {
    status = websiteReady ? 'ready_to_go_live' : 'partially_ready';
  }
  const out = { status, items };
  await insertTenantGoLiveCheck({
    tenant_id: tenantId,
    status,
    results_json: JSON.stringify(out),
    checked_by: actor,
  });
  if (status !== 'ready_to_go_live') {
    await insertPlatformLog({
      tenant_id: tenantId,
      severity: status === 'not_ready' ? 'error' : 'warning',
      source: 'go_live',
      message: `Go-live check ${status}`,
      metadata_json: JSON.stringify(out.items.filter((i) => i.status === 'failed')),
    });
  }
  return out;
}
