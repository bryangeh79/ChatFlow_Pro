import * as fs from 'node:fs';
import * as path from 'node:path';
import { URL } from 'node:url';
import {
  createTenant,
  getTenantBySlug,
  getTenantById,
  listTenants,
  listTenantAdminPrincipals,
  listTenantPrincipalAuditLogs,
  listRecentPrincipalAuditLogsGlobal,
  loadTenantFaqEntries,
  mergeTenantCredentials,
  mergeTenantSettings,
  getTenantSettingsJson,
  getTenantCredentialsForOutbound,
  replaceTenantAdminPrincipals,
  replaceTenantFaqEntries,
  deleteTenantCredentialKeys,
  countActiveFaqEntries,
  getLatestTenantGoLiveCheck,
  getLatestTenantTestResult,
  getTenantLastConfigSavedAtIso,
  getTenantRuntimeHealth,
  getConversationById,
  getLeadByConversationId,
  getLeadById,
  getTenantReportSummary,
  getPlatformSettings,
  insertTenantActivityEvent,
  insertLeadEvent,
  insertPlatformLog,
  insertTenantTestResult,
  listConversationMessages,
  listTenantConversations,
  listTenantLeads,
  listLeadEvents,
  listPlatformLogs,
  listTenantActivityEvents,
  listTenantKnowledgeEntries,
  listFaqTranslations,
  upsertFaqTranslation,
  listTenantWebsiteDomains,
  setTenantKnowledgeActiveState,
  setTenantLifecycleStatus,
  updateConversationStatus,
  updateLeadOwner,
  updateLeadStatus,
  upsertConversationOwner,
  upsertPlatformSettings,
  upsertTenantKnowledgeEntries,
  canTransitLeadStatus,
  createLeadFromConversation,
  upsertTenantWebsiteDomain,
  listTenantProducts,
  createTenantProduct,
  deleteTenantProduct,
} from './repository';
import type { TenantPrincipalRole, TenantRow } from './repository';
import { getSaaSDbPathForDisplay } from './db';
import { breakGlassAdminToken, getSaasAdminAuthSummaryPayload, requireSaasAdmin } from './admin-auth';
import type { SaasAdminAuthContext } from './admin-auth';
import {
  authorizeAdminRouteAfterAuth,
  resolveAdminRouteTargetTenantId,
  ADMIN_TENANT_ID_SEGMENT,
} from './admin-authorization';
import type { PrincipalReplaceActorFields } from './principal-audit';
import { listPlatformTenantIndexRows } from './platform-tenant-index';
import {
  isTenantChannelConnected,
  listTenantChannelInspectRows,
  TENANT_CHANNEL_CREDENTIAL_KEYS,
  type TenantChannelInspectId,
} from './tenant-channels-inspect';
import { parseTenantRuntimeSettings } from './tenant-runtime-settings';
import { computeTenantSetupProgress } from './setup-progress';
import { runTenantGoLiveCheck } from './go-live-check';
import { refreshTenantRuntimeHealth } from './runtime-health';
import { evaluateHostedReadiness } from './hosted-readiness';
import { auditAdminSensitiveRead } from '../observability/admin-sensitive-audit';

function unauthorized(): { status: number; body: unknown } {
  return { status: 401, body: { ok: false, error: 'unauthorized' } };
}

function forbidden(): { status: number; body: unknown } {
  return { status: 403, body: { ok: false, error: 'forbidden' } };
}

function knowledgeTransitionForbidden(
  role: string | null | undefined,
  action: 'review' | 'publish' | 'back_review' | 'knowledge_update',
): { status: number; body: unknown } {
  return {
    status: 403,
    body: {
      ok: false,
      error: 'knowledge_transition_forbidden',
      message: `Role "${role ?? 'unknown'}" is not allowed to ${action} knowledge entries.`,
      guidance: {
        required_roles: ['platform_admin', 'tenant_admin'],
        current_role: role ?? 'unknown',
        action,
      },
    },
  };
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function toPrincipalActor(ctx: SaasAdminAuthContext): PrincipalReplaceActorFields {
  return {
    actor_auth_source: ctx.auth_source,
    actor_role: ctx.role,
    actor_scope_type: ctx.scope_type,
    actor_tenant_slug: ctx.tenant_slug ?? null,
  };
}

function parseAuditLogLimit(searchParams: URLSearchParams | undefined): number {
  const raw = searchParams?.get('limit');
  if (raw == null || raw === '') return 50;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return 50;
  return Math.min(n, 200);
}

function parseOffset(searchParams: URLSearchParams | undefined): number {
  const raw = searchParams?.get('offset');
  if (raw == null || raw === '') return 0;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function parseRange(searchParams: URLSearchParams | undefined): 'today' | 'last7d' | 'all_time' {
  const raw = searchParams?.get('range');
  if (raw === 'today' || raw === 'last7d' || raw === 'all_time') return raw;
  return 'last7d';
}

function tenantIdRegexSuffix(suffix: string): RegExp {
  return new RegExp(
    `^/saas/v1/admin/(?:platform/tenants|tenant-ids)/(${ADMIN_TENANT_ID_SEGMENT})${suffix}$`,
    'i',
  );
}

async function loadTenantOr404(id: string): Promise<TenantRow | null> {
  return getTenantById(id);
}

function isTenantSuspended(tenant: TenantRow): boolean {
  return tenant.status === 'suspended';
}

function runChannelSelftest(
  creds: Map<string, string>,
  channelId: string,
): { ok: boolean; checks: Array<{ id: string; ok: boolean; detail?: string }> } {
  const checks: Array<{ id: string; ok: boolean; detail?: string }> = [];
  if (!isTenantChannelConnected(creds, channelId)) {
    return { ok: false, checks: [{ id: 'configured', ok: false, detail: 'not_configured' }] };
  }
  checks.push({ id: 'configured', ok: true });
  if (channelId === 'website') {
    const url = creds.get('WEBSITE_OUTBOUND_URL')?.trim();
    if (url) {
      try {
        new URL(url);
        checks.push({ id: 'outbound_url_parse', ok: true });
      } catch {
        checks.push({ id: 'outbound_url_parse', ok: false, detail: 'invalid_url' });
      }
    }
  }
  return { ok: checks.every((c) => c.ok), checks };
}

async function buildPlatformDashboardBody(): Promise<{
  stats: {
    tenants_total: number;
    tenants_live: number;
    channels_total: number;
    ai_enabled_count: number;
  };
  checklist: Array<{ id: string; label: string; done: boolean; href: string }>;
  recent_activity: Array<{
    id: string;
    tenant_id: string;
    action: string;
    ts_iso: string;
    actor_role: string;
  }>;
}> {
  const index = await listPlatformTenantIndexRows();
  const recent = await listRecentPrincipalAuditLogsGlobal(20);
  const tenants_total = index.length;
  const tenants_live = index.filter((t) => t.status === 'live').length;
  const channels_total = index.reduce((s, t) => s + t.channels_count, 0);
  const ai_enabled_count = index.filter((t) => t.ai_enabled).length;
  const checklist = [
    {
      id: 'first_tenant',
      label: '创建至少一个租户',
      done: tenants_total >= 1,
      href: '/platform/tenants',
    },
    {
      id: 'channel_connected',
      label: '至少一个租户已接通渠道',
      done: channels_total > 0,
      href: '/platform/tenants',
    },
    {
      id: 'ai_ready',
      label: '至少一个租户已启用可用 AI（OpenAI 密钥 + llm.enabled）',
      done: ai_enabled_count > 0,
      href: '/platform/tenants',
    },
  ];
  return {
    stats: { tenants_total, tenants_live, channels_total, ai_enabled_count },
    checklist,
    recent_activity: recent.map((r) => ({
      id: r.id,
      tenant_id: r.tenant_id,
      action: r.action,
      ts_iso: r.ts_iso,
      actor_role: r.actor_role,
    })),
  };
}

async function buildTenantOverview(tenantId: string): Promise<unknown | null> {
  const tenant = await getTenantById(tenantId);
  if (!tenant) return null;
  const raw = await getTenantSettingsJson(tenantId);
  const parsed = parseTenantRuntimeSettings(raw);
  const creds = await getTenantCredentialsForOutbound(tenantId);
  const channels = listTenantChannelInspectRows(creds);
  const faq_active_count = await countActiveFaqEntries(tenantId);
  const principals = await listTenantAdminPrincipals(tenantId);
  const setup = await computeTenantSetupProgress(tenant);
  const runtimeHealth = await getTenantRuntimeHealth(tenantId);
  const goLiveLatest = await getLatestTenantGoLiveCheck(tenantId);
  const websiteDomains = await listTenantWebsiteDomains(tenantId);
  const websiteWidgetTest = await getLatestTenantTestResult(tenantId, 'website', 'widget');
  const websiteReadiness = {
    script_generated: true,
    domain_configured: websiteDomains.length > 0,
    widget_test_passed: websiteWidgetTest?.status === 'passed',
  };
  const lastSavedAt = await getTenantLastConfigSavedAtIso(tenantId);
  return {
    tenant,
    runtime: {
      handoff: parsed.handoff,
      bot: parsed.bot,
      notify: parsed.notify,
      lead_capture: parsed.lead_capture,
      faq: parsed.faq,
      llm: parsed.llm,
      suppress_reply: parsed.suppress_reply,
    },
    channels,
    faq_active_count,
    principals_count: principals.length,
    has_openai_key: Boolean(creds.get('OPENAI_API_KEY')?.trim()),
    setup_percentage: setup.setup_percentage,
    setup_checks: setup.checks,
    go_live_status: goLiveLatest?.status ?? 'not_ready',
    runtime_health: runtimeHealth,
    website_readiness: websiteReadiness,
    validation: {
      last_saved_at: lastSavedAt,
      last_tested_at: websiteWidgetTest?.tested_at ?? null,
      last_success: websiteWidgetTest?.status === 'passed' ? websiteWidgetTest.message : null,
      last_error: runtimeHealth?.last_error_message ?? null,
    },
  };
}

function parsePrincipalsPayload(bodyText: string):
  | {
      ok: true;
      items: Array<{
        role: TenantPrincipalRole;
        bridge_token: string;
        is_enabled: boolean;
        display_name?: string;
      }>;
    }
  | { ok: false; error: string } {
  const parsed = parseJson(bodyText) as { principals?: unknown } | null;
  if (!parsed || !Array.isArray(parsed.principals)) {
    return { ok: false, error: 'principals_array_required' };
  }
  const items: Array<{
    role: TenantPrincipalRole;
    bridge_token: string;
    is_enabled: boolean;
    display_name?: string;
  }> = [];
  const seenTokens = new Set<string>();
  for (const row of parsed.principals) {
    if (typeof row !== 'object' || row === null) {
      return { ok: false, error: 'invalid_principal_row' };
    }
    const o = row as Record<string, unknown>;
    const role = o.role;
    if (role !== 'tenant_admin' && role !== 'tenant_operator_readonly') {
      return { ok: false, error: 'invalid_principal_role' };
    }
    const bridge_token = typeof o.bridge_token === 'string' ? o.bridge_token.trim() : '';
    if (!bridge_token) {
      return { ok: false, error: 'bridge_token_required' };
    }
    if (seenTokens.has(bridge_token)) {
      return { ok: false, error: 'duplicate_bridge_token' };
    }
    seenTokens.add(bridge_token);
    const is_enabled = o.is_enabled === true || o.is_enabled === 1;
    const display_name =
      o.display_name === undefined || o.display_name === null
        ? undefined
        : String(o.display_name).trim() || undefined;
    items.push({ role, bridge_token, is_enabled, display_name });
  }
  return { ok: true, items };
}

export async function handleSaaSAdminRequest(
  method: string,
  pathname: string,
  bodyText: string,
  authHeader: string | undefined,
  searchParams?: URLSearchParams,
  httpRequestId?: string | null,
): Promise<{ status: number; body: unknown; contentType?: string } | null> {
  if (!pathname.startsWith('/saas/')) {
    return null;
  }

  if (pathname === '/saas/admin' || pathname === '/saas/admin/') {
    const htmlPath = path.join(process.cwd(), 'public', 'saas-admin.html');
    if (!fs.existsSync(htmlPath)) {
      return { status: 404, body: { ok: false, error: 'dashboard_missing' } };
    }
    const html = fs.readFileSync(htmlPath, 'utf8');
    return { status: 200, body: html, contentType: 'text/html; charset=utf-8' };
  }

  if (pathname === '/saas/v1/health' && method === 'GET') {
    const readiness = await evaluateHostedReadiness();
    return {
      status: readiness.http_status,
      body: {
        ok: readiness.ready,
        saas: true,
        db_driver: readiness.db_driver,
        db_path: readiness.db_driver === 'sqljs' ? getSaaSDbPathForDisplay() : null,
        readiness_reasons: readiness.reasons,
        migration_in_progress: readiness.migration_in_progress,
        admin_configured: Boolean(breakGlassAdminToken()),
      },
    };
  }

  let saasAdminContext: SaasAdminAuthContext | undefined;
  if (pathname.startsWith('/saas/v1/admin/')) {
    const authResult = await requireSaasAdmin(authHeader, { httpRequestId: httpRequestId ?? null });
    if (!authResult.ok) {
      if ('error' in authResult && authResult.error === 'break_glass_ttl_expired') {
        return { status: 403, body: { ok: false, error: 'break_glass_ttl_expired' } };
      }
      if ('error' in authResult && authResult.error === 'break_glass_ttl_misconfigured') {
        return { status: 503, body: { ok: false, error: 'break_glass_ttl_misconfigured' } };
      }
      return unauthorized();
    }
    const authz = await authorizeAdminRouteAfterAuth(method, pathname, authResult.context, async (id) => {
      const t = await getTenantById(id);
      return t ? { slug: t.slug } : null;
    });
    if (!authz.ok) return forbidden();
    saasAdminContext = authResult.context;
  }

  if (pathname === '/saas/v1/admin/auth/summary' && method === 'GET') {
    auditAdminSensitiveRead({
      route_key: 'admin.auth.summary',
      request_id: httpRequestId ?? null,
      principal_role: saasAdminContext?.role ?? null,
    });
    const summary = await getSaasAdminAuthSummaryPayload();
    return { status: 200, body: { ok: true, ...summary } };
  }

  if (pathname === '/saas/v1/admin/platform/tenants-index' && method === 'GET') {
    const tenants = await listPlatformTenantIndexRows();
    return { status: 200, body: { ok: true, tenants } };
  }

  if (pathname === '/saas/v1/admin/platform/dashboard' && method === 'GET') {
    const dashboard = await buildPlatformDashboardBody();
    return { status: 200, body: { ok: true, ...dashboard } };
  }

  if (pathname === '/saas/v1/admin/platform/settings' && method === 'GET') {
    const settings = await getPlatformSettings();
    return { status: 200, body: { ok: true, settings } };
  }

  if (pathname === '/saas/v1/admin/platform/settings' && method === 'PUT') {
    const parsed = parseJson(bodyText) as { settings?: Record<string, unknown> } | null;
    if (!parsed?.settings || typeof parsed.settings !== 'object') {
      return { status: 400, body: { ok: false, error: 'settings_object_required' } };
    }
    const kv: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed.settings)) {
      if (!k.trim()) continue;
      kv[k.trim()] = String(v ?? '');
    }
    await upsertPlatformSettings(kv, saasAdminContext?.role ?? 'system');
    await insertPlatformLog({
      severity: 'info',
      source: 'settings',
      message: 'Platform settings updated',
      metadata_json: JSON.stringify({ keys: Object.keys(kv) }),
    });
    return { status: 200, body: { ok: true } };
  }

  if (pathname === '/saas/v1/admin/platform/logs' && method === 'GET') {
    const severityRaw = searchParams?.get('severity');
    const tenantIdRaw = searchParams?.get('tenant_id');
    const severity =
      severityRaw === 'info' || severityRaw === 'warning' || severityRaw === 'error'
        ? severityRaw
        : undefined;
    const logs = await listPlatformLogs({
      severity,
      tenant_id: tenantIdRaw && tenantIdRaw.trim() ? tenantIdRaw.trim() : undefined,
      limit: parseAuditLogLimit(searchParams),
      offset: parseOffset(searchParams),
    });
    return { status: 200, body: { ok: true, logs } };
  }

  if (pathname === '/saas/v1/admin/platform/deployment-info' && method === 'GET') {
    const manifestPath = path.join(process.cwd(), 'data', 'delivery-manifest.json');
    const statePath = path.join('C:\\chatflow-pro\\deploy', '.state', 'deployment-state.json');
    let manifest: Record<string, unknown> | null = null;
    let deploymentState: Record<string, unknown> | null = null;
    if (fs.existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
      } catch {
        manifest = null;
      }
    }
    if (fs.existsSync(statePath)) {
      try {
        deploymentState = JSON.parse(fs.readFileSync(statePath, 'utf8')) as Record<string, unknown>;
      } catch {
        deploymentState = null;
      }
    }
    let pkgVersion: string | null = null;
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')) as {
        version?: string;
      };
      pkgVersion = pkg.version ?? null;
    } catch {
      pkgVersion = null;
    }
    return {
      status: 200,
      body: {
        ok: true,
        deployment_info: {
          version: deploymentState?.current_version ?? manifest?.version ?? pkgVersion,
          stable_version: deploymentState?.stable_version ?? null,
          build_time: manifest?.build_time ?? null,
          git_commit: manifest?.git_commit ?? null,
          migration_target: manifest?.migration_target ?? null,
          package_format_version: manifest?.package_format_version ?? null,
        },
      },
    };
  }

  if (pathname === '/saas/v1/admin/tenants' && method === 'GET') {
    const tenants = await listTenants();
    return { status: 200, body: { ok: true, tenants } };
  }

  if (pathname === '/saas/v1/admin/tenants' && method === 'POST') {
    const parsed = parseJson(bodyText) as { slug?: string; name?: string } | null;
    if (!parsed?.slug || !parsed?.name) {
      return { status: 400, body: { ok: false, error: 'slug_and_name_required' } };
    }
    const slug = String(parsed.slug).trim().toLowerCase();
    const name = String(parsed.name).trim();
    if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(slug)) {
      return { status: 400, body: { ok: false, error: 'invalid_slug' } };
    }
    const existing = await getTenantBySlug(slug);
    if (existing) {
      return { status: 409, body: { ok: false, error: 'slug_exists' } };
    }
    const tenant = await createTenant(slug, name);
    return { status: 201, body: { ok: true, tenant } };
  }

  const tenantIdBare = pathname.match(
    new RegExp(
      `^/saas/v1/admin/(?:platform/tenants|tenant-ids)/(${ADMIN_TENANT_ID_SEGMENT})$`,
      'i',
    ),
  );
  if (tenantIdBare && method === 'GET') {
    const tenantId = tenantIdBare[1].toLowerCase();
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    return { status: 200, body: { ok: true, tenant } };
  }

  const tenantIdSuspend = pathname.match(tenantIdRegexSuffix('/suspend'));
  if (tenantIdSuspend && method === 'POST') {
    const tenantId = tenantIdSuspend[1].toLowerCase();
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    await setTenantLifecycleStatus(tenant.id, 'suspended');
    await refreshTenantRuntimeHealth(tenant.id);
    await insertTenantActivityEvent({
      tenant_id: tenant.id,
      event_type: 'suspend',
      entity_type: 'lifecycle',
      actor_id: saasAdminContext?.role ?? 'system',
      message: 'Tenant suspended',
    });
    await insertPlatformLog({
      tenant_id: tenant.id,
      severity: 'warning',
      source: 'lifecycle',
      message: `Tenant suspended: ${tenant.slug}`,
    });
    return { status: 200, body: { ok: true } };
  }

  const tenantIdActivate = pathname.match(tenantIdRegexSuffix('/activate'));
  if (tenantIdActivate && method === 'POST') {
    const tenantId = tenantIdActivate[1].toLowerCase();
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    await setTenantLifecycleStatus(tenant.id, 'active');
    await refreshTenantRuntimeHealth(tenant.id);
    await insertTenantActivityEvent({
      tenant_id: tenant.id,
      event_type: 'activate',
      entity_type: 'lifecycle',
      actor_id: saasAdminContext?.role ?? 'system',
      message: 'Tenant activated',
    });
    await insertPlatformLog({
      tenant_id: tenant.id,
      severity: 'info',
      source: 'lifecycle',
      message: `Tenant activated: ${tenant.slug}`,
    });
    return { status: 200, body: { ok: true } };
  }

  const tenantIdSettings = pathname.match(tenantIdRegexSuffix('/settings'));
  if (tenantIdSettings && method === 'GET') {
    const tenantId = tenantIdSettings[1].toLowerCase();
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const settings = await getTenantSettingsJson(tenant.id);
    return { status: 200, body: { ok: true, settings } };
  }

  if (tenantIdSettings && method === 'PUT') {
    const tenantId = tenantIdSettings[1].toLowerCase();
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const parsed = parseJson(bodyText) as { settings?: Record<string, unknown> } | null;
    if (!parsed?.settings || typeof parsed.settings !== 'object') {
      return { status: 400, body: { ok: false, error: 'settings_object_required' } };
    }
    await mergeTenantSettings(tenant.id, parsed.settings);
    await refreshTenantRuntimeHealth(tenant.id);
    return { status: 200, body: { ok: true } };
  }

  const tenantIdOverview = pathname.match(tenantIdRegexSuffix('/overview'));
  if (tenantIdOverview && method === 'GET') {
    const tenantId = tenantIdOverview[1].toLowerCase();
    const overview = await buildTenantOverview(tenantId);
    if (!overview) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    return { status: 200, body: { ok: true, overview } };
  }

  const tenantIdChannelsInspect =
    pathname.match(tenantIdRegexSuffix('/channels')) ||
    pathname.match(tenantIdRegexSuffix('/channels-inspect'));
  if (tenantIdChannelsInspect && method === 'GET') {
    const tenantId = tenantIdChannelsInspect[1].toLowerCase();
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const creds = await getTenantCredentialsForOutbound(tenant.id);
    const channels = listTenantChannelInspectRows(creds);
    const validations = await Promise.all(
      channels.map(async (c) => ({
        channel: c.id,
        last_test: await getLatestTenantTestResult(tenant.id, 'channel', c.id),
      })),
    );
    auditAdminSensitiveRead({
      route_key: 'admin.tenant.channels_inspect',
      tenant_id: tenant.id,
      request_id: httpRequestId ?? null,
      principal_role: saasAdminContext?.role ?? null,
    });
    return { status: 200, body: { ok: true, channels, validations } };
  }

  const tenantIdAi = pathname.match(tenantIdRegexSuffix('/ai'));
  if (tenantIdAi && method === 'GET') {
    const tenantId = tenantIdAi[1].toLowerCase();
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const settings = await getTenantSettingsJson(tenant.id);
    const runtime = parseTenantRuntimeSettings(settings);
    const creds = await getTenantCredentialsForOutbound(tenant.id);
    const lastTest = await getLatestTenantTestResult(tenant.id, 'ai', 'openai_connection');
    auditAdminSensitiveRead({
      route_key: 'admin.tenant.ai_config_read',
      tenant_id: tenant.id,
      request_id: httpRequestId ?? null,
      principal_role: saasAdminContext?.role ?? null,
    });
    return {
      status: 200,
      body: {
        ok: true,
        current_status: { ai_enabled: runtime.llm.enabled },
        input: {
          provider: runtime.llm.provider,
          model: runtime.llm.model,
          has_openai_key: Boolean(creds.get('OPENAI_API_KEY')?.trim()),
        },
        validation_info: {
          last_tested_at: lastTest?.tested_at ?? null,
          last_success: lastTest?.status === 'passed' ? lastTest.message : null,
          last_error: lastTest?.status === 'failed' ? lastTest.message : null,
        },
      },
    };
  }
  if (tenantIdAi && method === 'PUT') {
    const tenantId = tenantIdAi[1].toLowerCase();
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const parsed = parseJson(bodyText) as {
      settings?: Record<string, unknown>;
      credentials?: Record<string, string>;
    } | null;
    if (!parsed) return { status: 400, body: { ok: false, error: 'invalid_json' } };
    let llmBeforeEnabled: boolean | null = null;
    let llmAfterEnabled: boolean | null = null;
    if (parsed.settings && typeof parsed.settings === 'object') {
      const before = parseTenantRuntimeSettings(await getTenantSettingsJson(tenant.id));
      llmBeforeEnabled = before.llm.enabled;
      await mergeTenantSettings(tenant.id, parsed.settings);
      const after = parseTenantRuntimeSettings(await getTenantSettingsJson(tenant.id));
      llmAfterEnabled = after.llm.enabled;
    }
    if (parsed.credentials && typeof parsed.credentials === 'object') {
      await mergeTenantCredentials(tenant.id, parsed.credentials);
      await insertTenantActivityEvent({
        tenant_id: tenant.id,
        event_type: 'token_updated',
        entity_type: 'credentials',
        actor_id: saasAdminContext?.role ?? 'system',
        message: 'Updated AI credentials',
      });
    }
    if (llmBeforeEnabled !== null && llmAfterEnabled !== null && llmBeforeEnabled !== llmAfterEnabled) {
      await insertTenantActivityEvent({
        tenant_id: tenant.id,
        event_type: 'ai_toggle',
        entity_type: 'ai',
        actor_id: saasAdminContext?.role ?? 'system',
        message: llmAfterEnabled ? 'AI enabled' : 'AI disabled',
      });
    }
    await refreshTenantRuntimeHealth(tenant.id);
    return { status: 200, body: { ok: true } };
  }
  const tenantIdAiTest = pathname.match(tenantIdRegexSuffix('/ai/test-connection'));
  if (tenantIdAiTest && method === 'POST') {
    const tenantId = tenantIdAiTest[1].toLowerCase();
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    if (isTenantSuspended(tenant)) {
      return { status: 409, body: { ok: false, error: 'tenant_suspended' } };
    }
    const creds = await getTenantCredentialsForOutbound(tenant.id);
    const ok = Boolean(creds.get('OPENAI_API_KEY')?.trim());
    const result = await insertTenantTestResult({
      tenant_id: tenant.id,
      scope_type: 'ai',
      scope_key: 'openai_connection',
      status: ok ? 'passed' : 'failed',
      message: ok ? 'OpenAI key exists and connection test simulated pass' : 'Missing OPENAI_API_KEY',
      error_code: ok ? null : 'missing_openai_key',
      tested_by: saasAdminContext?.role ?? 'system',
    });
    await insertTenantActivityEvent({
      tenant_id: tenant.id,
      event_type: 'ai_tested',
      entity_type: 'ai',
      actor_id: saasAdminContext?.role ?? 'system',
      message: ok ? 'AI connection test passed' : 'AI connection test failed',
    });
    if (!ok) {
      await insertPlatformLog({
        tenant_id: tenant.id,
        severity: 'error',
        source: 'test',
        message: `AI test failed: ${result.message}`,
      });
    }
    await refreshTenantRuntimeHealth(tenant.id, {
      last_error_message: ok ? null : result.message,
      last_error_at: ok ? null : result.tested_at,
    });
    return { status: ok ? 200 : 400, body: { ok, result } };
  }

  const tenantIdGoLiveRun = pathname.match(tenantIdRegexSuffix('/go-live-check/run'));
  if (tenantIdGoLiveRun && method === 'POST') {
    const tenantId = tenantIdGoLiveRun[1].toLowerCase();
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    if (isTenantSuspended(tenant)) {
      const now = new Date().toISOString();
      const out = {
        status: 'not_ready' as const,
        items: [
          {
            check_key: 'has_channel_connected',
            status: 'failed',
            message: 'Tenant is suspended',
            blocking: true,
            checked_at: now,
          },
        ],
      };
      await insertPlatformLog({
        tenant_id: tenant.id,
        severity: 'warning',
        source: 'go_live',
        message: `Go-live check blocked: tenant suspended (${tenant.slug})`,
      });
      return { status: 200, body: { ok: true, ...out } };
    }
    const out = await runTenantGoLiveCheck(tenant.id, saasAdminContext?.role ?? 'system');
    return { status: 200, body: { ok: true, ...out } };
  }
  const tenantIdGoLiveLatest = pathname.match(tenantIdRegexSuffix('/go-live-check/latest'));
  if (tenantIdGoLiveLatest && method === 'GET') {
    const tenantId = tenantIdGoLiveLatest[1].toLowerCase();
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const row = await getLatestTenantGoLiveCheck(tenant.id);
    return { status: 200, body: { ok: true, latest: row ? JSON.parse(row.results_json) : null } };
  }

  const tenantIdChannelSelftest = pathname.match(
    new RegExp(
      `^/saas/v1/admin/(?:platform/tenants|tenant-ids)/(${ADMIN_TENANT_ID_SEGMENT})/channels/([^/]+)/(?:selftest|test)$`,
      'i',
    ),
  );
  if (tenantIdChannelSelftest && method === 'POST') {
    const tenantId = tenantIdChannelSelftest[1].toLowerCase();
    const channelRaw = tenantIdChannelSelftest[2].toLowerCase();
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    if (isTenantSuspended(tenant)) {
      return { status: 409, body: { ok: false, error: 'tenant_suspended' } };
    }
    const creds = await getTenantCredentialsForOutbound(tenant.id);
    const result = runChannelSelftest(creds, channelRaw);
    await insertTenantTestResult({
      tenant_id: tenant.id,
      scope_type: 'channel',
      scope_key: channelRaw,
      status: result.ok ? 'passed' : 'failed',
      message: result.ok ? `${channelRaw} test passed` : `${channelRaw} test failed`,
      error_code: result.ok ? null : 'channel_test_failed',
      tested_by: saasAdminContext?.role ?? 'system',
      metadata_json: JSON.stringify(result.checks),
    });
    await insertTenantTestResult({
      tenant_id: tenant.id,
      scope_type: 'channel',
      scope_key: 'any',
      status: result.ok ? 'passed' : 'failed',
      message: result.ok ? `${channelRaw} test passed` : `${channelRaw} test failed`,
      error_code: result.ok ? null : 'channel_test_failed',
      tested_by: saasAdminContext?.role ?? 'system',
    });
    await insertTenantActivityEvent({
      tenant_id: tenant.id,
      event_type: 'channel_tested',
      entity_type: 'channel',
      entity_id: channelRaw,
      actor_id: saasAdminContext?.role ?? 'system',
      message: result.ok ? `${channelRaw} test passed` : `${channelRaw} test failed`,
    });
    if (!result.ok) {
      await insertPlatformLog({
        tenant_id: tenant.id,
        severity: 'error',
        source: 'test',
        message: `Channel test failed (${channelRaw})`,
      });
    }
    await refreshTenantRuntimeHealth(tenant.id, {
      last_webhook_success_at: result.ok ? new Date().toISOString() : null,
      last_error_message: result.ok ? null : `${channelRaw} test failed`,
      last_error_at: result.ok ? null : new Date().toISOString(),
    });
    return {
      status: result.ok ? 200 : 400,
      body: { ok: result.ok, channel_id: channelRaw, checks: result.checks },
    };
  }

  const tenantIdChannelDisconnect = pathname.match(
    new RegExp(
      `^/saas/v1/admin/(?:platform/tenants|tenant-ids)/(${ADMIN_TENANT_ID_SEGMENT})/channels/([^/]+)/disconnect$`,
      'i',
    ),
  );
  if (tenantIdChannelDisconnect && method === 'POST') {
    const tenantId = tenantIdChannelDisconnect[1].toLowerCase();
    const channelRaw = tenantIdChannelDisconnect[2].toLowerCase() as TenantChannelInspectId;
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const keys = TENANT_CHANNEL_CREDENTIAL_KEYS[channelRaw];
    if (!keys) {
      return { status: 400, body: { ok: false, error: 'unknown_channel' } };
    }
    await deleteTenantCredentialKeys(tenant.id, [...keys]);
    await insertTenantActivityEvent({
      tenant_id: tenant.id,
      event_type: 'channel_disconnected',
      entity_type: 'channel',
      entity_id: channelRaw,
      actor_id: saasAdminContext?.role ?? 'system',
      message: `Disconnected channel ${channelRaw}`,
    });
    await refreshTenantRuntimeHealth(tenant.id);
    return { status: 200, body: { ok: true, removed_keys: keys } };
  }

  const tenantIdWebsiteConfig = pathname.match(tenantIdRegexSuffix('/channels/website/config'));
  if (tenantIdWebsiteConfig && method === 'GET') {
    const tenantId = tenantIdWebsiteConfig[1].toLowerCase();
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const settings = await getTenantSettingsJson(tenant.id);
    const domains = await listTenantWebsiteDomains(tenant.id);
    const test = await getLatestTenantTestResult(tenant.id, 'website', 'widget');
    const website = settings.website && typeof settings.website === 'object' ? settings.website : {};
    return {
      status: 200,
      body: {
        ok: true,
        current_status: {
          widget_enable: Boolean((website as Record<string, unknown>).widget_enabled),
          connected_domain_count: domains.length,
        },
        input: {
          welcome_message: String((website as Record<string, unknown>).welcome_message ?? ''),
          install_script: `<script src="/webhooks/t/${tenant.slug}/website/widget.js"></script>`,
          connected_domains: domains,
        },
        validation_info: {
          last_tested_at: test?.tested_at ?? null,
          last_success: test?.status === 'passed' ? test.message : null,
          last_error: test?.status === 'failed' ? test.message : null,
        },
      },
    };
  }

  if (tenantIdWebsiteConfig && method === 'PUT') {
    const tenantId = tenantIdWebsiteConfig[1].toLowerCase();
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const parsed = parseJson(bodyText) as {
      widget_enable?: boolean;
      welcome_message?: string;
      domain?: string;
      domain_verified?: boolean;
    } | null;
    if (!parsed) return { status: 400, body: { ok: false, error: 'invalid_json' } };
    await mergeTenantSettings(tenant.id, {
      website: {
        widget_enabled: parsed.widget_enable === true,
        welcome_message: String(parsed.welcome_message ?? ''),
        script_version: 'v1',
      },
    });
    if (parsed.domain && parsed.domain.trim()) {
      await upsertTenantWebsiteDomain({
        tenant_id: tenant.id,
        domain: parsed.domain.trim().toLowerCase(),
        is_verified: parsed.domain_verified === true,
        last_verified_at: parsed.domain_verified ? new Date().toISOString() : null,
      });
    }
    await refreshTenantRuntimeHealth(tenant.id);
    return { status: 200, body: { ok: true } };
  }

  const tenantIdWebsiteTest = pathname.match(tenantIdRegexSuffix('/channels/website/test-widget'));
  if (tenantIdWebsiteTest && method === 'POST') {
    const tenantId = tenantIdWebsiteTest[1].toLowerCase();
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    if (isTenantSuspended(tenant)) {
      return { status: 409, body: { ok: false, error: 'tenant_suspended' } };
    }
    const domains = await listTenantWebsiteDomains(tenant.id);
    const settings = await getTenantSettingsJson(tenant.id);
    const website = settings.website && typeof settings.website === 'object' ? settings.website : {};
    const welcome = String((website as Record<string, unknown>).welcome_message ?? '').trim();
    const ok = domains.length > 0 && welcome.length > 0;
    const test = await insertTenantTestResult({
      tenant_id: tenant.id,
      scope_type: 'website',
      scope_key: 'widget',
      status: ok ? 'passed' : 'failed',
      message: ok
        ? 'Website widget test passed'
        : 'Website widget test failed: domain or welcome message missing',
      error_code: ok ? null : 'website_widget_not_ready',
      tested_by: saasAdminContext?.role ?? 'system',
    });
    await insertTenantActivityEvent({
      tenant_id: tenant.id,
      event_type: 'website_tested',
      entity_type: 'website',
      actor_id: saasAdminContext?.role ?? 'system',
      message: ok ? 'Website widget test passed' : 'Website widget test failed',
    });
    if (!ok) {
      await insertPlatformLog({
        tenant_id: tenant.id,
        severity: 'error',
        source: 'test',
        message: 'Website widget test failed',
      });
    }
    return { status: ok ? 200 : 400, body: { ok, result: test } };
  }

  const tenantIdCredPut = pathname.match(tenantIdRegexSuffix('/credentials'));
  if (tenantIdCredPut && method === 'PUT') {
    const tenantId = tenantIdCredPut[1].toLowerCase();
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const parsed = parseJson(bodyText) as { credentials?: Record<string, string> } | null;
    if (!parsed?.credentials || typeof parsed.credentials !== 'object') {
      return { status: 400, body: { ok: false, error: 'credentials_object_required' } };
    }
    await mergeTenantCredentials(tenant.id, parsed.credentials);
    await insertTenantActivityEvent({
      tenant_id: tenant.id,
      event_type: 'token_updated',
      entity_type: 'credentials',
      actor_id: saasAdminContext?.role ?? 'system',
      message: 'Updated channel credentials',
    });
    await refreshTenantRuntimeHealth(tenant.id);
    return { status: 200, body: { ok: true } };
  }

  // --- Products ---
  const tenantIdProducts = pathname.match(tenantIdRegexSuffix('/products'));
  if (tenantIdProducts && method === 'GET') {
    const tenantId = tenantIdProducts[1].toLowerCase();
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const products = await listTenantProducts(tenant.id);
    return { status: 200, body: { ok: true, products } };
  }

  if (tenantIdProducts && method === 'POST') {
    const tenantId = tenantIdProducts[1].toLowerCase();
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const parsed = parseJson(bodyText) as { name?: string } | null;
    const name = typeof parsed?.name === 'string' ? parsed.name.trim() : '';
    if (!name) {
      return { status: 400, body: { ok: false, error: 'name_required' } };
    }
    const product = await createTenantProduct(tenant.id, name);
    return { status: 201, body: { ok: true, product } };
  }

  const tenantIdProductDelete = pathname.match(tenantIdRegexSuffix('/products/([^/]+)'));
  if (tenantIdProductDelete && method === 'DELETE') {
    const tenantId = tenantIdProductDelete[1].toLowerCase();
    const productId = tenantIdProductDelete[2];
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    await deleteTenantProduct(tenant.id, productId);
    return { status: 200, body: { ok: true } };
  }

  // --- Bot Settings (GET / PUT) ---
  const tenantIdBotSettings = pathname.match(tenantIdRegexSuffix('/bot-settings'));
  if (tenantIdBotSettings && method === 'GET') {
    const tenantId = tenantIdBotSettings[1].toLowerCase();
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const raw = await getTenantSettingsJson(tenant.id);
    const botRaw = (raw.bot && typeof raw.bot === 'object' && !Array.isArray(raw.bot))
      ? (raw.bot as Record<string, unknown>)
      : {};
    const lcRaw = (raw.language_chooser && typeof raw.language_chooser === 'object' && !Array.isArray(raw.language_chooser))
      ? (raw.language_chooser as Record<string, unknown>)
      : {};
    return {
      status: 200,
      body: {
        ok: true,
        bot: {
          persona: typeof botRaw.persona === 'string' ? botRaw.persona : '',
          welcome_message: typeof botRaw.welcome_message === 'string' ? botRaw.welcome_message : '',
          welcome_buttons: Array.isArray(botRaw.welcome_buttons) ? botRaw.welcome_buttons : [],
          welcome_by_language: botRaw.welcome_by_language ?? {},
          followup_prompt: typeof botRaw.followup_prompt === 'string' ? botRaw.followup_prompt : '',
          leave_message_mode: typeof botRaw.leave_message_mode === 'boolean' ? botRaw.leave_message_mode : false,
          leave_message_prompt_text: typeof botRaw.leave_message_prompt_text === 'string' ? botRaw.leave_message_prompt_text : '',
          leave_message_confirmation_text: typeof botRaw.leave_message_confirmation_text === 'string' ? botRaw.leave_message_confirmation_text : '',
          leave_message_prompt_by_language: botRaw.leave_message_prompt_by_language ?? {},
          leave_message_confirmation_by_language: botRaw.leave_message_confirmation_by_language ?? {},
          lead_trigger_after_n: typeof botRaw.lead_trigger_after_n === 'number' ? botRaw.lead_trigger_after_n : 0,
          lead_nudge_text: typeof botRaw.lead_nudge_text === 'string' ? botRaw.lead_nudge_text : '',
          lead_nudge_by_language: botRaw.lead_nudge_by_language ?? {},
        },
        language_chooser: {
          enabled: typeof lcRaw.enabled === 'boolean' ? lcRaw.enabled : false,
          supported: Array.isArray(lcRaw.supported) ? lcRaw.supported : ['zh', 'en', 'vi', 'ms-MY'],
          default_language: typeof lcRaw.default_language === 'string' ? lcRaw.default_language : 'zh',
          auto_skip_if_platform_lang: typeof lcRaw.auto_skip_if_platform_lang === 'boolean' ? lcRaw.auto_skip_if_platform_lang : true,
        },
      },
    };
  }

  if (tenantIdBotSettings && method === 'PUT') {
    const tenantId = tenantIdBotSettings[1].toLowerCase();
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const parsedBody = parseJson(bodyText) as Record<string, unknown> | null;
    const body = parsedBody ?? {};
    const incoming = (body.bot && typeof body.bot === 'object' && !Array.isArray(body.bot))
      ? (body.bot as Record<string, unknown>)
      : body;

    // Validate and sanitize
    const patch: Record<string, unknown> = {};
    if (typeof incoming.persona === 'string') patch.persona = incoming.persona.trim();
    if (typeof incoming.welcome_message === 'string') patch.welcome_message = incoming.welcome_message.trim();
    if (Array.isArray(incoming.welcome_buttons)) {
      patch.welcome_buttons = (incoming.welcome_buttons as unknown[])
        .filter((x) => typeof x === 'string')
        .slice(0, 5);
    }
    if (incoming.welcome_by_language && typeof incoming.welcome_by_language === 'object' && !Array.isArray(incoming.welcome_by_language)) {
      patch.welcome_by_language = incoming.welcome_by_language;
    }
    if (typeof incoming.followup_prompt === 'string') patch.followup_prompt = incoming.followup_prompt.trim();
    if (typeof incoming.leave_message_mode === 'boolean') patch.leave_message_mode = incoming.leave_message_mode;
    if (typeof incoming.leave_message_prompt_text === 'string') patch.leave_message_prompt_text = incoming.leave_message_prompt_text.trim();
    if (typeof incoming.leave_message_confirmation_text === 'string') patch.leave_message_confirmation_text = incoming.leave_message_confirmation_text.trim();
    if (incoming.leave_message_prompt_by_language && typeof incoming.leave_message_prompt_by_language === 'object') {
      patch.leave_message_prompt_by_language = incoming.leave_message_prompt_by_language;
    }
    if (incoming.leave_message_confirmation_by_language && typeof incoming.leave_message_confirmation_by_language === 'object') {
      patch.leave_message_confirmation_by_language = incoming.leave_message_confirmation_by_language;
    }
    if (typeof incoming.lead_trigger_after_n === 'number') patch.lead_trigger_after_n = Math.max(0, Math.floor(incoming.lead_trigger_after_n));
    if (typeof incoming.lead_nudge_text === 'string') patch.lead_nudge_text = incoming.lead_nudge_text.trim();
    if (incoming.lead_nudge_by_language && typeof incoming.lead_nudge_by_language === 'object') {
      patch.lead_nudge_by_language = incoming.lead_nudge_by_language;
    }

    // Deep merge: preserve existing bot keys not in this patch
    const existingRaw = await getTenantSettingsJson(tenant.id);
    const existingBot = (existingRaw.bot && typeof existingRaw.bot === 'object' && !Array.isArray(existingRaw.bot))
      ? (existingRaw.bot as Record<string, unknown>)
      : {};
    const mergedBot = { ...existingBot, ...patch };

    // Handle language_chooser block in same PUT request
    const settingsPatch: Record<string, unknown> = { bot: mergedBot };
    if (body.language_chooser && typeof body.language_chooser === 'object' && !Array.isArray(body.language_chooser)) {
      const lc = body.language_chooser as Record<string, unknown>;
      const existingLc = (existingRaw.language_chooser && typeof existingRaw.language_chooser === 'object')
        ? (existingRaw.language_chooser as Record<string, unknown>)
        : {};
      const lcPatch: Record<string, unknown> = {};
      if (typeof lc.enabled === 'boolean') lcPatch.enabled = lc.enabled;
      if (Array.isArray(lc.supported)) lcPatch.supported = lc.supported;
      if (typeof lc.default_language === 'string') lcPatch.default_language = lc.default_language;
      if (typeof lc.auto_skip_if_platform_lang === 'boolean') lcPatch.auto_skip_if_platform_lang = lc.auto_skip_if_platform_lang;
      settingsPatch.language_chooser = { ...existingLc, ...lcPatch };
    }

    await mergeTenantSettings(tenant.id, settingsPatch);
    return { status: 200, body: { ok: true, bot: mergedBot } };
  }

  const tenantIdKnowledge = pathname.match(tenantIdRegexSuffix('/knowledge'));
  if (tenantIdKnowledge && method === 'GET') {
    const tenantId = tenantIdKnowledge[1].toLowerCase();
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const entries = await listTenantKnowledgeEntries(tenant.id);
    const active_entries = entries.filter((e) => e.is_active).length;
    const inactive_entries = entries.length - active_entries;
    const categories_count = new Set(entries.map((e) => e.category.trim()).filter(Boolean)).size;
    const last_updated_at =
      entries.length > 0
        ? entries.map((e) => e.updated_at).sort((a, b) => b.localeCompare(a))[0]
        : null;
    return {
      status: 200,
      body: {
        ok: true,
        status_cards: {
          total_entries: entries.length,
          active_entries,
          inactive_entries,
          categories_count,
          last_updated_at,
          knowledge_ready: active_entries >= 1,
        },
        validation_info: {
          last_import_time: null,
          last_update_time: last_updated_at,
          active_ratio: entries.length > 0 ? active_entries / entries.length : 0,
          readiness_rule: 'active_entries >= 1',
        },
        entries,
      },
    };
  }

  if (tenantIdKnowledge && method === 'POST') {
    const tenantId = tenantIdKnowledge[1].toLowerCase();
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const parsed = parseJson(bodyText) as {
      language?: string;
      category?: string;
      question?: string;
      answer?: string;
      source_type?: string;
      is_active?: boolean;
    } | null;
    if (!parsed?.question || !parsed?.answer) {
      return { status: 400, body: { ok: false, error: 'question_and_answer_required' } };
    }
    const out = await upsertTenantKnowledgeEntries(tenant.id, [
      {
        language: String(parsed.language ?? 'en'),
        category: String(parsed.category ?? 'general'),
        question: String(parsed.question),
        answer: String(parsed.answer),
        source_type: String(parsed.source_type ?? 'manual'),
        is_active: parsed.is_active !== false,
      },
    ]);
    await insertTenantActivityEvent({
      tenant_id: tenant.id,
      event_type: 'faq_imported',
      entity_type: 'knowledge',
      actor_id: saasAdminContext?.role ?? 'system',
      message: `Knowledge upsert (inserted=${out.inserted}, updated=${out.updated})`,
    });
    return { status: 201, body: { ok: true, ...out } };
  }

  const tenantIdKnowledgeEntry = pathname.match(tenantIdRegexSuffix('/knowledge/([^/]+)'));
  if (tenantIdKnowledgeEntry && method === 'PUT') {
    const tenantId = tenantIdKnowledgeEntry[1].toLowerCase();
    const entryId = tenantIdKnowledgeEntry[2];
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    if (saasAdminContext?.role === 'tenant_operator_readonly') {
      return knowledgeTransitionForbidden(saasAdminContext.role, 'knowledge_update');
    }
    const parsed = parseJson(bodyText) as {
      language?: string;
      category?: string;
      question?: string;
      answer?: string;
      source_type?: string;
      is_active?: boolean;
    } | null;
    if (!parsed?.question || !parsed?.answer) {
      return { status: 400, body: { ok: false, error: 'question_and_answer_required' } };
    }
    await upsertTenantKnowledgeEntries(tenant.id, [
      {
        id: entryId,
        language: String(parsed.language ?? 'en'),
        category: String(parsed.category ?? 'general'),
        question: String(parsed.question),
        answer: String(parsed.answer),
        source_type: String(parsed.source_type ?? 'manual'),
        is_active: parsed.is_active !== false,
      },
    ]);
    return { status: 200, body: { ok: true } };
  }

  const tenantIdKnowledgeEnable = pathname.match(tenantIdRegexSuffix('/knowledge/([^/]+)/enable'));
  if (tenantIdKnowledgeEnable && method === 'POST') {
    const tenantId = tenantIdKnowledgeEnable[1].toLowerCase();
    const entryId = tenantIdKnowledgeEnable[2];
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    if (saasAdminContext?.role === 'tenant_operator_readonly') {
      return knowledgeTransitionForbidden(saasAdminContext.role, 'publish');
    }
    await setTenantKnowledgeActiveState(tenant.id, entryId, true);
    await insertTenantActivityEvent({
      tenant_id: tenant.id,
      event_type: 'knowledge_enabled',
      entity_type: 'knowledge',
      entity_id: entryId,
      actor_id: saasAdminContext?.role ?? 'system',
      message: `Knowledge entry enabled (${entryId})`,
    });
    return { status: 200, body: { ok: true } };
  }

  const tenantIdKnowledgeDisable = pathname.match(tenantIdRegexSuffix('/knowledge/([^/]+)/disable'));
  if (tenantIdKnowledgeDisable && method === 'POST') {
    const tenantId = tenantIdKnowledgeDisable[1].toLowerCase();
    const entryId = tenantIdKnowledgeDisable[2];
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    if (saasAdminContext?.role === 'tenant_operator_readonly') {
      return knowledgeTransitionForbidden(saasAdminContext.role, 'back_review');
    }
    await setTenantKnowledgeActiveState(tenant.id, entryId, false);
    await insertTenantActivityEvent({
      tenant_id: tenant.id,
      event_type: 'knowledge_disabled',
      entity_type: 'knowledge',
      entity_id: entryId,
      actor_id: saasAdminContext?.role ?? 'system',
      message: `Knowledge entry disabled (${entryId})`,
    });
    return { status: 200, body: { ok: true } };
  }

  // --- FAQ Translations: GET /knowledge/:id/translations ---
  const tenantIdKnowledgeTranslations = pathname.match(tenantIdRegexSuffix('/knowledge/([^/]+)/translations'));
  if (tenantIdKnowledgeTranslations && method === 'GET') {
    const tenantId = tenantIdKnowledgeTranslations[1].toLowerCase();
    const entryId = tenantIdKnowledgeTranslations[2];
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const translations = await listFaqTranslations(tenant.id, entryId);
    return { status: 200, body: { ok: true, translations } };
  }

  // --- FAQ Translation: PUT /knowledge/:id/translations/:lang ---
  const tenantIdTranslationLang = pathname.match(tenantIdRegexSuffix('/knowledge/([^/]+)/translations/([^/]+)'));
  if (tenantIdTranslationLang && method === 'PUT') {
    const tenantId = tenantIdTranslationLang[1].toLowerCase();
    const sourceFaqId = tenantIdTranslationLang[2];
    const lang = tenantIdTranslationLang[3];
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const parsed = parseJson(bodyText) as { question?: string; answer?: string; status?: string } | null;
    if (!parsed?.question || !parsed?.answer) {
      return { status: 400, body: { ok: false, error: 'question_and_answer_required' } };
    }
    const status = parsed.status === 'published' ? 'published' : 'draft';
    const row = await upsertFaqTranslation(tenant.id, sourceFaqId, lang, parsed.question, parsed.answer, status);
    return { status: 200, body: { ok: true, translation: row } };
  }

  // --- FAQ Translation Generate: POST /knowledge/:id/generate-translation ---
  const tenantIdGenTranslation = pathname.match(tenantIdRegexSuffix('/knowledge/([^/]+)/generate-translation'));
  if (tenantIdGenTranslation && method === 'POST') {
    const tenantId = tenantIdGenTranslation[1].toLowerCase();
    const sourceFaqId = tenantIdGenTranslation[2];
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const parsed = parseJson(bodyText) as { lang?: string } | null;
    const targetLang = String(parsed?.lang ?? 'en');
    const SUPPORTED = ['zh', 'en', 'vi', 'ms-MY'];
    if (!SUPPORTED.includes(targetLang)) {
      return { status: 400, body: { ok: false, error: 'unsupported_lang' } };
    }
    // Load source entry
    const entries = await listTenantKnowledgeEntries(tenant.id);
    const source = entries.find((e) => e.id === sourceFaqId && e.source_faq_id === null);
    if (!source) {
      return { status: 404, body: { ok: false, error: 'source_entry_not_found' } };
    }
    // Load tenant OpenAI key
    const { getTenantCredentialsForOutbound } = await import('./repository');
    const creds = await getTenantCredentialsForOutbound(tenant.id);
    const openAiKey = creds.get('OPENAI_API_KEY') ?? '';
    if (!openAiKey.trim()) {
      return { status: 422, body: { ok: false, error: 'openai_key_not_configured' } };
    }
    // Generate translation via OpenAI
    const langNames: Record<string, string> = {
      zh: 'Simplified Chinese', en: 'English', vi: 'Vietnamese', 'ms-MY': 'Malay',
    };
    const langName = langNames[targetLang] ?? targetLang;
    let translatedQ = source.question;
    let translatedA = source.answer;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.2,
          max_tokens: 600,
          messages: [
            {
              role: 'system',
              content: `You are a professional translator. Translate the given FAQ question and answer into ${langName}. Return valid JSON with keys "question" and "answer". Output only the JSON object, nothing else.`,
            },
            {
              role: 'user',
              content: JSON.stringify({ question: source.question, answer: source.answer }),
            },
          ],
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (resp.ok) {
        const raw = await resp.json() as { choices?: Array<{ message?: { content?: string } }> };
        const content = raw?.choices?.[0]?.message?.content ?? '';
        try {
          const parsed2 = JSON.parse(content.trim()) as { question?: string; answer?: string };
          if (parsed2.question) translatedQ = parsed2.question;
          if (parsed2.answer) translatedA = parsed2.answer;
        } catch { /* keep originals */ }
      }
    } catch { /* keep originals */ }
    // Save as draft
    const row = await upsertFaqTranslation(tenant.id, sourceFaqId, targetLang, translatedQ, translatedA, 'draft');
    return { status: 200, body: { ok: true, translation: row } };
  }

  const tenantIdKnowledgeImport = pathname.match(tenantIdRegexSuffix('/knowledge/import'));
  if (tenantIdKnowledgeImport && method === 'POST') {
    const tenantId = tenantIdKnowledgeImport[1].toLowerCase();
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const parsed = parseJson(bodyText) as {
      entries?: Array<{
        id?: string;
        language?: string;
        category?: string;
        question?: string;
        answer?: string;
        source_type?: string;
        is_active?: boolean;
      }>;
    } | null;
    if (!parsed?.entries || !Array.isArray(parsed.entries)) {
      return { status: 400, body: { ok: false, error: 'entries_array_required' } };
    }
    const normalized = parsed.entries
      .filter((e) => e && e.question && e.answer)
      .map((e) => ({
        id: e.id,
        language: String(e.language ?? 'en'),
        category: String(e.category ?? 'general'),
        question: String(e.question),
        answer: String(e.answer),
        source_type: String(e.source_type ?? 'import'),
        is_active: e.is_active !== false,
      }));
    const out = await upsertTenantKnowledgeEntries(tenant.id, normalized);
    await insertTenantActivityEvent({
      tenant_id: tenant.id,
      event_type: 'faq_imported',
      entity_type: 'knowledge',
      actor_id: saasAdminContext?.role ?? 'system',
      message: `Knowledge import upsert (inserted=${out.inserted}, updated=${out.updated})`,
    });
    return { status: 200, body: { ok: true, ...out } };
  }

  const tenantIdActivity = pathname.match(tenantIdRegexSuffix('/activity'));
  if (tenantIdActivity && method === 'GET') {
    const tenantId = tenantIdActivity[1].toLowerCase();
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const entries = await listTenantActivityEvents(
      tenant.id,
      parseAuditLogLimit(searchParams),
      parseOffset(searchParams),
    );
    return { status: 200, body: { ok: true, entries } };
  }

  const tenantIdConversations = pathname.match(tenantIdRegexSuffix('/conversations'));
  if (tenantIdConversations && method === 'GET') {
    const tenantId = tenantIdConversations[1].toLowerCase();
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const statusRaw = searchParams?.get('status');
    const status =
      statusRaw === 'open' || statusRaw === 'pending' || statusRaw === 'resolved' ? statusRaw : undefined;
    const channel = searchParams?.get('channel')?.trim() || undefined;
    const owner = searchParams?.get('owner')?.trim() || undefined;
    const data = await listTenantConversations({
      tenant_id: tenant.id,
      limit: parseAuditLogLimit(searchParams),
      offset: parseOffset(searchParams),
      status,
      channel,
      owner,
    });
    return { status: 200, body: { ok: true, total: data.total, conversations: data.rows } };
  }

  const tenantIdConversationDetail = pathname.match(tenantIdRegexSuffix('/conversations/([^/]+)'));
  if (tenantIdConversationDetail && method === 'GET') {
    const tenantId = tenantIdConversationDetail[1].toLowerCase();
    const conversationId = tenantIdConversationDetail[2];
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const conversation = await getConversationById(tenant.id, conversationId);
    if (!conversation) return { status: 404, body: { ok: false, error: 'conversation_not_found' } };
    const lead = await getLeadByConversationId(tenant.id, conversation.id);
    return {
      status: 200,
      body: { ok: true, conversation, lead_link: lead ? { lead_id: lead.id, status: lead.status } : null },
    };
  }

  const tenantIdConversationMessages = pathname.match(tenantIdRegexSuffix('/conversations/([^/]+)/messages'));
  if (tenantIdConversationMessages && method === 'GET') {
    const tenantId = tenantIdConversationMessages[1].toLowerCase();
    const conversationId = tenantIdConversationMessages[2];
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const conversation = await getConversationById(tenant.id, conversationId);
    if (!conversation) return { status: 404, body: { ok: false, error: 'conversation_not_found' } };
    const before = searchParams?.get('before')?.trim() || undefined;
    const messages = await listConversationMessages({
      tenant_id: tenant.id,
      conversation_id: conversation.id,
      limit: parseAuditLogLimit(searchParams),
      before,
    });
    return { status: 200, body: { ok: true, messages } };
  }

  const tenantIdConversationAssign = pathname.match(tenantIdRegexSuffix('/conversations/([^/]+)/assign'));
  if (tenantIdConversationAssign && method === 'POST') {
    const tenantId = tenantIdConversationAssign[1].toLowerCase();
    const conversationId = tenantIdConversationAssign[2];
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const conversation = await getConversationById(tenant.id, conversationId);
    if (!conversation) return { status: 404, body: { ok: false, error: 'conversation_not_found' } };
    const parsed = parseJson(bodyText) as { owner_principal_id?: string | null; reason?: string; note?: string } | null;
    if (!parsed || !('owner_principal_id' in parsed)) {
      return { status: 400, body: { ok: false, error: 'owner_principal_id_required' } };
    }
    await upsertConversationOwner({
      tenant_id: tenant.id,
      conversation_id: conversation.id,
      owner_principal_id: parsed.owner_principal_id ? String(parsed.owner_principal_id) : null,
      assigned_by_principal_id: saasAdminContext?.role ?? 'system',
      action_type: 'assign',
      reason: parsed.reason,
      note: parsed.note,
    });
    await insertTenantActivityEvent({
      tenant_id: tenant.id,
      event_type: 'conversation_assigned',
      entity_type: 'conversation',
      entity_id: conversation.id,
      actor_id: saasAdminContext?.role ?? 'system',
      from_owner_id: conversation.current_owner_principal_id,
      to_owner_id: parsed.owner_principal_id ? String(parsed.owner_principal_id) : null,
      message: `Conversation assigned: ${conversation.id}`,
    });
    return { status: 200, body: { ok: true } };
  }

  const tenantIdConversationHandoff = pathname.match(tenantIdRegexSuffix('/conversations/([^/]+)/handoff'));
  if (tenantIdConversationHandoff && method === 'POST') {
    const tenantId = tenantIdConversationHandoff[1].toLowerCase();
    const conversationId = tenantIdConversationHandoff[2];
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const conversation = await getConversationById(tenant.id, conversationId);
    if (!conversation) return { status: 404, body: { ok: false, error: 'conversation_not_found' } };
    const parsed = parseJson(bodyText) as { to_owner_principal_id?: string; reason?: string; note?: string } | null;
    if (!parsed?.to_owner_principal_id) {
      return { status: 400, body: { ok: false, error: 'to_owner_principal_id_required' } };
    }
    await upsertConversationOwner({
      tenant_id: tenant.id,
      conversation_id: conversation.id,
      owner_principal_id: String(parsed.to_owner_principal_id),
      assigned_by_principal_id: saasAdminContext?.role ?? 'system',
      action_type: 'handoff',
      reason: parsed.reason,
      note: parsed.note,
    });
    await insertTenantActivityEvent({
      tenant_id: tenant.id,
      event_type: 'conversation_handoff',
      entity_type: 'conversation',
      entity_id: conversation.id,
      actor_id: saasAdminContext?.role ?? 'system',
      from_owner_id: conversation.current_owner_principal_id,
      to_owner_id: String(parsed.to_owner_principal_id),
      message: `Conversation handoff: ${conversation.id}`,
    });
    return { status: 200, body: { ok: true } };
  }

  const tenantIdConversationResolve = pathname.match(tenantIdRegexSuffix('/conversations/([^/]+)/resolve'));
  if (tenantIdConversationResolve && method === 'POST') {
    const tenantId = tenantIdConversationResolve[1].toLowerCase();
    const conversationId = tenantIdConversationResolve[2];
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const conversation = await getConversationById(tenant.id, conversationId);
    if (!conversation) return { status: 404, body: { ok: false, error: 'conversation_not_found' } };
    await updateConversationStatus({ tenant_id: tenant.id, conversation_id: conversation.id, status: 'resolved' });
    await insertTenantActivityEvent({
      tenant_id: tenant.id,
      event_type: 'conversation_resolved',
      entity_type: 'conversation',
      entity_id: conversation.id,
      actor_id: saasAdminContext?.role ?? 'system',
      message: `Conversation resolved: ${conversation.id}`,
    });
    return { status: 200, body: { ok: true } };
  }

  const tenantIdConversationReopen = pathname.match(tenantIdRegexSuffix('/conversations/([^/]+)/reopen'));
  if (tenantIdConversationReopen && method === 'POST') {
    const tenantId = tenantIdConversationReopen[1].toLowerCase();
    const conversationId = tenantIdConversationReopen[2];
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const conversation = await getConversationById(tenant.id, conversationId);
    if (!conversation) return { status: 404, body: { ok: false, error: 'conversation_not_found' } };
    await updateConversationStatus({ tenant_id: tenant.id, conversation_id: conversation.id, status: 'open' });
    await insertTenantActivityEvent({
      tenant_id: tenant.id,
      event_type: 'conversation_reopened',
      entity_type: 'conversation',
      entity_id: conversation.id,
      actor_id: saasAdminContext?.role ?? 'system',
      message: `Conversation reopened: ${conversation.id}`,
    });
    return { status: 200, body: { ok: true } };
  }

  const tenantIdConversationConvert = pathname.match(
    tenantIdRegexSuffix('/conversations/([^/]+)/convert-to-lead'),
  );
  if (tenantIdConversationConvert && method === 'POST') {
    const tenantId = tenantIdConversationConvert[1].toLowerCase();
    const conversationId = tenantIdConversationConvert[2];
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const conversation = await getConversationById(tenant.id, conversationId);
    if (!conversation) return { status: 404, body: { ok: false, error: 'conversation_not_found' } };
    const out = await createLeadFromConversation({ tenant_id: tenant.id, conversation });
    if (out.created) {
      await insertLeadEvent({
        tenant_id: tenant.id,
        lead_id: out.lead.id,
        event_type: 'lead_converted',
        actor_principal_id: saasAdminContext?.role ?? 'system',
        to_status: 'new',
        to_owner_principal_id: out.lead.owner_principal_id,
        message: 'Lead created from conversation',
      });
      await insertTenantActivityEvent({
        tenant_id: tenant.id,
        event_type: 'lead_converted',
        entity_type: 'lead',
        entity_id: out.lead.id,
        actor_id: saasAdminContext?.role ?? 'system',
        from_owner_id: conversation.current_owner_principal_id,
        to_owner_id: out.lead.owner_principal_id,
        message: `Lead converted from conversation ${conversation.id}`,
      });
    }
    return {
      status: 200,
      body: {
        ok: true,
        created: out.created,
        lead: out.lead,
        ui_message: out.lead.owner_principal_id ? null : 'Lead created without owner',
      },
    };
  }

  const tenantIdLeads = pathname.match(tenantIdRegexSuffix('/leads'));
  if (tenantIdLeads && method === 'GET') {
    const tenantId = tenantIdLeads[1].toLowerCase();
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const statusRaw = searchParams?.get('status');
    const status =
      statusRaw === 'new' ||
      statusRaw === 'contacted' ||
      statusRaw === 'qualified' ||
      statusRaw === 'closed' ||
      statusRaw === 'unqualified'
        ? statusRaw
        : undefined;
    const owner = searchParams?.get('owner')?.trim() || undefined;
    const channel = searchParams?.get('channel')?.trim() || undefined;
    const data = await listTenantLeads({
      tenant_id: tenant.id,
      limit: parseAuditLogLimit(searchParams),
      offset: parseOffset(searchParams),
      status,
      owner,
      channel,
    });
    return { status: 200, body: { ok: true, total: data.total, leads: data.rows } };
  }

  const tenantIdLeadDetail = pathname.match(tenantIdRegexSuffix('/leads/([^/]+)'));
  if (tenantIdLeadDetail && method === 'GET') {
    const tenantId = tenantIdLeadDetail[1].toLowerCase();
    const leadId = tenantIdLeadDetail[2];
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const lead = await getLeadById(tenant.id, leadId);
    if (!lead) return { status: 404, body: { ok: false, error: 'lead_not_found' } };
    const events = await listLeadEvents(tenant.id, lead.id, 50);
    return { status: 200, body: { ok: true, lead, events } };
  }

  const tenantIdLeadAssign = pathname.match(tenantIdRegexSuffix('/leads/([^/]+)/assign'));
  if (tenantIdLeadAssign && method === 'POST') {
    const tenantId = tenantIdLeadAssign[1].toLowerCase();
    const leadId = tenantIdLeadAssign[2];
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const lead = await getLeadById(tenant.id, leadId);
    if (!lead) return { status: 404, body: { ok: false, error: 'lead_not_found' } };
    const parsed = parseJson(bodyText) as { owner_principal_id?: string | null } | null;
    if (!parsed || !('owner_principal_id' in parsed)) {
      return { status: 400, body: { ok: false, error: 'owner_principal_id_required' } };
    }
    const nextOwner = parsed.owner_principal_id ? String(parsed.owner_principal_id) : null;
    await updateLeadOwner({ tenant_id: tenant.id, lead_id: lead.id, owner_principal_id: nextOwner });
    await insertLeadEvent({
      tenant_id: tenant.id,
      lead_id: lead.id,
      event_type: 'lead_owner_changed',
      actor_principal_id: saasAdminContext?.role ?? 'system',
      from_owner_principal_id: lead.owner_principal_id,
      to_owner_principal_id: nextOwner,
      message: 'Lead owner changed',
    });
    await insertTenantActivityEvent({
      tenant_id: tenant.id,
      event_type: 'lead_owner_changed',
      entity_type: 'lead',
      entity_id: lead.id,
      actor_id: saasAdminContext?.role ?? 'system',
      from_owner_id: lead.owner_principal_id,
      to_owner_id: nextOwner,
      message: `Lead owner changed: ${lead.id}`,
    });
    return { status: 200, body: { ok: true } };
  }

  const tenantIdLeadStatus = pathname.match(tenantIdRegexSuffix('/leads/([^/]+)/status'));
  if (tenantIdLeadStatus && method === 'POST') {
    const tenantId = tenantIdLeadStatus[1].toLowerCase();
    const leadId = tenantIdLeadStatus[2];
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const lead = await getLeadById(tenant.id, leadId);
    if (!lead) return { status: 404, body: { ok: false, error: 'lead_not_found' } };
    const parsed = parseJson(bodyText) as { to_status?: string } | null;
    if (!parsed?.to_status) return { status: 400, body: { ok: false, error: 'to_status_required' } };
    const toStatus = parsed.to_status;
    if (
      toStatus !== 'new' &&
      toStatus !== 'contacted' &&
      toStatus !== 'qualified' &&
      toStatus !== 'closed' &&
      toStatus !== 'unqualified'
    ) {
      return { status: 400, body: { ok: false, error: 'invalid_lead_status' } };
    }
    if (!canTransitLeadStatus(lead.status, toStatus)) {
      return { status: 409, body: { ok: false, error: 'invalid_status_transition' } };
    }
    await updateLeadStatus({ tenant_id: tenant.id, lead_id: lead.id, status: toStatus });
    await insertLeadEvent({
      tenant_id: tenant.id,
      lead_id: lead.id,
      event_type: 'lead_status_changed',
      actor_principal_id: saasAdminContext?.role ?? 'system',
      from_status: lead.status,
      to_status: toStatus,
      message: `Lead status changed to ${toStatus}`,
    });
    await insertTenantActivityEvent({
      tenant_id: tenant.id,
      event_type: 'lead_status_changed',
      entity_type: 'lead',
      entity_id: lead.id,
      actor_id: saasAdminContext?.role ?? 'system',
      message: `Lead status changed: ${lead.status} -> ${toStatus}`,
    });
    return { status: 200, body: { ok: true } };
  }

  const tenantIdReportSummary = pathname.match(tenantIdRegexSuffix('/reports/summary'));
  if (tenantIdReportSummary && method === 'GET') {
    const tenantId = tenantIdReportSummary[1].toLowerCase();
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const summary = await getTenantReportSummary({ tenant_id: tenant.id, range: parseRange(searchParams) });
    return { status: 200, body: { ok: true, ...summary } };
  }

  const tenantIdFaq = pathname.match(tenantIdRegexSuffix('/faq'));
  if (tenantIdFaq && method === 'GET') {
    const tenantId = tenantIdFaq[1].toLowerCase();
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const entries = await loadTenantFaqEntries(tenant.id);
    return { status: 200, body: { ok: true, entries } };
  }

  if (tenantIdFaq && method === 'PUT') {
    const tenantId = tenantIdFaq[1].toLowerCase();
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const parsed = parseJson(bodyText) as {
      entries?: Array<{
        id: string;
        language: string;
        topic: string;
        question: string;
        answer: string;
        keywords?: string[];
        tags?: string[];
        is_active?: boolean;
      }>;
    } | null;
    if (!parsed?.entries || !Array.isArray(parsed.entries)) {
      return { status: 400, body: { ok: false, error: 'entries_array_required' } };
    }
    await replaceTenantFaqEntries(tenant.id, parsed.entries);
    await insertTenantActivityEvent({
      tenant_id: tenant.id,
      event_type: 'faq_imported',
      entity_type: 'knowledge',
      actor_id: saasAdminContext?.role ?? 'system',
      message: `Imported ${parsed.entries.length} FAQ entries`,
    });
    return { status: 200, body: { ok: true } };
  }

  const tenantIdPrincipalsAudit = pathname.match(tenantIdRegexSuffix('/principals/audit'));
  if (tenantIdPrincipalsAudit && method === 'GET') {
    const tenantId = tenantIdPrincipalsAudit[1].toLowerCase();
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const limit = parseAuditLogLimit(searchParams);
    const entries = await listTenantPrincipalAuditLogs(tenant.id, limit);
    return { status: 200, body: { ok: true, entries } };
  }

  const tenantIdPrincipals = pathname.match(tenantIdRegexSuffix('/principals'));
  if (tenantIdPrincipals && method === 'GET') {
    const tenantId = tenantIdPrincipals[1].toLowerCase();
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const principals = await listTenantAdminPrincipals(tenant.id);
    auditAdminSensitiveRead({
      route_key: 'admin.tenant.principals',
      tenant_id: tenant.id,
      request_id: httpRequestId ?? null,
      principal_role: saasAdminContext?.role ?? null,
    });
    return { status: 200, body: { ok: true, principals } };
  }

  if (tenantIdPrincipals && method === 'PUT') {
    const tenantId = tenantIdPrincipals[1].toLowerCase();
    const tenant = await loadTenantOr404(tenantId);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const parsed = parsePrincipalsPayload(bodyText);
    if (!parsed.ok) {
      return { status: 400, body: { ok: false, error: parsed.error } };
    }
    if (!saasAdminContext) {
      return { status: 401, body: { ok: false, error: 'unauthorized' } };
    }
    try {
      await replaceTenantAdminPrincipals(tenant.id, parsed.items, toPrincipalActor(saasAdminContext));
    } catch {
      return { status: 409, body: { ok: false, error: 'principal_persist_conflict' } };
    }
    return { status: 200, body: { ok: true } };
  }

  const tenantGet = pathname.match(/^\/saas\/v1\/admin\/tenants\/([^/]+)$/);
  if (tenantGet && method === 'GET') {
    const slug = tenantGet[1];
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    return { status: 200, body: { ok: true, tenant } };
  }

  const credPut = pathname.match(/^\/saas\/v1\/admin\/tenants\/([^/]+)\/credentials$/);
  if (credPut && method === 'PUT') {
    const slug = credPut[1];
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const parsed = parseJson(bodyText) as { credentials?: Record<string, string> } | null;
    if (!parsed?.credentials || typeof parsed.credentials !== 'object') {
      return { status: 400, body: { ok: false, error: 'credentials_object_required' } };
    }
    await mergeTenantCredentials(tenant.id, parsed.credentials);
    await insertTenantActivityEvent({
      tenant_id: tenant.id,
      event_type: 'token_updated',
      entity_type: 'credentials',
      actor_id: saasAdminContext?.role ?? 'system',
      message: 'Updated channel credentials',
    });
    await refreshTenantRuntimeHealth(tenant.id);
    return { status: 200, body: { ok: true } };
  }

  const faqGet = pathname.match(/^\/saas\/v1\/admin\/tenants\/([^/]+)\/faq$/);
  if (faqGet && method === 'GET') {
    const slug = faqGet[1];
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const entries = await loadTenantFaqEntries(tenant.id);
    return { status: 200, body: { ok: true, entries } };
  }

  if (faqGet && method === 'PUT') {
    const slug = faqGet[1];
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const parsed = parseJson(bodyText) as {
      entries?: Array<{
        id: string;
        language: string;
        topic: string;
        question: string;
        answer: string;
        keywords?: string[];
        tags?: string[];
        is_active?: boolean;
      }>;
    } | null;
    if (!parsed?.entries || !Array.isArray(parsed.entries)) {
      return { status: 400, body: { ok: false, error: 'entries_array_required' } };
    }
    await replaceTenantFaqEntries(tenant.id, parsed.entries);
    await insertTenantActivityEvent({
      tenant_id: tenant.id,
      event_type: 'faq_imported',
      entity_type: 'knowledge',
      actor_id: saasAdminContext?.role ?? 'system',
      message: `Imported ${parsed.entries.length} FAQ entries`,
    });
    return { status: 200, body: { ok: true } };
  }

  const settingsPut = pathname.match(/^\/saas\/v1\/admin\/tenants\/([^/]+)\/settings$/);
  if (settingsPut && method === 'PUT') {
    const slug = settingsPut[1];
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const parsed = parseJson(bodyText) as { settings?: Record<string, unknown> } | null;
    if (!parsed?.settings || typeof parsed.settings !== 'object') {
      return { status: 400, body: { ok: false, error: 'settings_object_required' } };
    }
    await mergeTenantSettings(tenant.id, parsed.settings);
    await refreshTenantRuntimeHealth(tenant.id);
    return { status: 200, body: { ok: true } };
  }

  const principalsAuditPath = pathname.match(/^\/saas\/v1\/admin\/tenants\/([^/]+)\/principals\/audit$/);
  if (principalsAuditPath && method === 'GET') {
    const slug = principalsAuditPath[1];
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const limit = parseAuditLogLimit(searchParams);
    const entries = await listTenantPrincipalAuditLogs(tenant.id, limit);
    return { status: 200, body: { ok: true, entries } };
  }

  const principalsPath = pathname.match(/^\/saas\/v1\/admin\/tenants\/([^/]+)\/principals$/);
  if (principalsPath && method === 'GET') {
    const slug = principalsPath[1];
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const principals = await listTenantAdminPrincipals(tenant.id);
    auditAdminSensitiveRead({
      route_key: 'admin.tenant.principals',
      tenant_id: tenant.id,
      request_id: httpRequestId ?? null,
      principal_role: saasAdminContext?.role ?? null,
    });
    return { status: 200, body: { ok: true, principals } };
  }

  if (principalsPath && method === 'PUT') {
    const slug = principalsPath[1];
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return { status: 404, body: { ok: false, error: 'tenant_not_found' } };
    const parsed = parsePrincipalsPayload(bodyText);
    if (!parsed.ok) {
      return { status: 400, body: { ok: false, error: parsed.error } };
    }
    if (!saasAdminContext) {
      return { status: 401, body: { ok: false, error: 'unauthorized' } };
    }
    try {
      await replaceTenantAdminPrincipals(tenant.id, parsed.items, toPrincipalActor(saasAdminContext));
    } catch {
      return { status: 409, body: { ok: false, error: 'principal_persist_conflict' } };
    }
    return { status: 200, body: { ok: true } };
  }

  if (resolveAdminRouteTargetTenantId(pathname)) {
    return { status: 404, body: { ok: false, error: 'tenant_route_not_handled' } };
  }

  return { status: 404, body: { ok: false, error: 'saas_route_not_found' } };
}
