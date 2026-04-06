import type { IncomingMessage, ServerResponse } from 'node:http';
import { verifyMetaSignature } from '../config/meta-webhook';
import { verifyLineSignature } from '../config/line-webhook';
import { verifyWebsiteSignature } from '../config/website-webhook';
import {
  getLineWebhookVerifyToken,
  getMessengerWebhookVerifyToken,
  getWebsiteWebhookVerifyToken,
  getWhatsAppWebhookVerifyToken,
  getZaloWebhookVerifyToken,
  handleWebhookGetWithOptionalMetaVerify,
  informationalWebhookGetPing,
  sendWebhookGetVerifyResponse,
} from '../config/webhook-verify';
import { getTenantBySlug, getTenantCredentials, loadTenantFaqEntries } from './repository';
import { loadTenantRuntimeSettingsForTenantRequest } from './tenant-runtime-settings';
import { matchTenantWebhookPath } from './webhook-path';
import { runWithTenantContext } from './tenant-context';
import {
  getMessengerAppSecretForTenant,
  getWhatsAppAppSecretForTenant,
  getLineChannelSecretForTenant,
  getWebsiteSigningSecretForTenant,
} from './tenant-channel-config';
import { handleTelegramWebhook } from '../webhooks/telegram';
import { handleWebsiteWebhook } from '../webhooks/website';
import { handleWhatsAppWebhook } from '../webhooks/whatsapp';
import { handleMessengerWebhook } from '../webhooks/messenger';
import { handleLineWebhook } from '../webhooks/line';
import { handleZaloWebhook } from '../webhooks/zalo';
import { webhookPhasesFromHandlerResult } from '../observability/http-access';

const TENANT_POST_SIGNATURE_SAAS_OK = {
  tenant_post_secret_present: true,
  tenant_post_env_fallback_blocked: true,
} as const;

function saasControlTenantPostSignature(secretPresent: boolean): {
  tenant_post_secret_present: boolean;
  tenant_post_env_fallback_blocked: boolean;
} {
  return {
    tenant_post_secret_present: secretPresent,
    tenant_post_env_fallback_blocked: true,
  };
}

function denyTenantPostSignature(args: {
  res: ServerResponse;
  tenantId: string;
  tenantSlug: string;
  channel: string;
  error: 'tenant_secret_missing' | 'signature_invalid';
  tenantPostSecretPresent: boolean;
}): void {
  const logEvent =
    args.error === 'tenant_secret_missing'
      ? 'tenant_secret_missing'
      : 'tenant_signature_rejected_no_fallback';
  // eslint-disable-next-line no-console
  console.warn(
    '[tenant-webhook]',
    JSON.stringify({
      event: logEvent,
      channel: args.channel,
      tenant_id: args.tenantId,
      tenant_slug: args.tenantSlug,
      error: args.error,
    }),
  );
  args.res.writeHead(403, { 'content-type': 'application/json' });
  args.res.end(
    JSON.stringify({
      ok: false,
      error: args.error,
      debug_metadata: {
        saas_control: saasControlTenantPostSignature(args.tenantPostSecretPresent),
      },
    }),
  );
}

async function verifyTokenWithTenantFallback(
  tenantId: string,
  key: string,
  fallback: () => string | undefined,
): Promise<string | undefined> {
  const creds = await getTenantCredentials(tenantId);
  return creds.get(key)?.trim() || fallback();
}

export async function tryHandleTenantWebhook(args: {
  method: string;
  pathname: string;
  url: URL;
  req: IncomingMessage;
  res: ServerResponse;
  requestId: string;
  readRequestBody: (req: IncomingMessage) => Promise<{ raw: Buffer; parsed: unknown }>;
  /** For webhook phase logging callback */
  setWebhookPhases: (p: ReturnType<typeof webhookPhasesFromHandlerResult> | undefined) => void;
}): Promise<boolean> {
  const m = matchTenantWebhookPath(args.pathname);
  if (!m) return false;

  const tenant = await getTenantBySlug(m.slug);
  if (!tenant) {
    args.res.writeHead(404, { 'content-type': 'application/json' });
    args.res.end(JSON.stringify({ ok: false, error: 'tenant_not_found' }));
    return true;
  }

  const faqEntries = await loadTenantFaqEntries(tenant.id);

  if (args.method === 'GET' && m.channel === 'telegram') {
    sendWebhookGetVerifyResponse(
      args.res,
      informationalWebhookGetPing('telegram', 'post_only_set_webhook_to_tenant_url'),
    );
    return true;
  }

  if (args.method === 'GET') {
    const vtok = await (async () => {
      switch (m.channel) {
        case 'whatsapp':
          return verifyTokenWithTenantFallback(
            tenant.id,
            'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
            getWhatsAppWebhookVerifyToken,
          );
        case 'messenger':
          return verifyTokenWithTenantFallback(
            tenant.id,
            'MESSENGER_WEBHOOK_VERIFY_TOKEN',
            getMessengerWebhookVerifyToken,
          );
        case 'website':
          return verifyTokenWithTenantFallback(
            tenant.id,
            'WEBSITE_WEBHOOK_VERIFY_TOKEN',
            getWebsiteWebhookVerifyToken,
          );
        case 'line':
          return verifyTokenWithTenantFallback(tenant.id, 'LINE_WEBHOOK_VERIFY_TOKEN', getLineWebhookVerifyToken);
        case 'zalo':
          return verifyTokenWithTenantFallback(tenant.id, 'ZALO_WEBHOOK_VERIFY_TOKEN', getZaloWebhookVerifyToken);
        default:
          return undefined;
      }
    })();

    handleWebhookGetWithOptionalMetaVerify(
      args.res,
      m.channel as 'whatsapp' | 'messenger' | 'website' | 'line' | 'zalo',
      args.url.searchParams,
      vtok,
      'tenant_meta_style_hub',
    );
    return true;
  }

  if (args.method !== 'POST') {
    args.res.writeHead(405, { 'content-type': 'application/json' });
    args.res.end(JSON.stringify({ ok: false, error: 'method_not_allowed' }));
    return true;
  }

  await runWithTenantContext({ tenantId: tenant.id, tenantSlug: tenant.slug }, async () => {
    const tenantRuntimeSettings = await loadTenantRuntimeSettingsForTenantRequest(tenant.id);
    const opts = { httpRequestId: args.requestId, faqEntries, tenantRuntimeSettings };

    if (m.channel === 'telegram') {
      const { parsed: body } = await args.readRequestBody(args.req);
      const result = await handleTelegramWebhook(body, opts);
      args.setWebhookPhases(webhookPhasesFromHandlerResult(result));
      args.res.writeHead(result.ok ? 200 : 400, { 'content-type': 'application/json' });
      args.res.end(JSON.stringify(result, null, 2));
      return;
    }

    if (m.channel === 'website') {
      const { raw, parsed } = await args.readRequestBody(args.req);
      const tenantSecret = await getWebsiteSigningSecretForTenant(tenant.id);
      if (!tenantSecret) {
        denyTenantPostSignature({
          res: args.res,
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          channel: 'website',
          error: 'tenant_secret_missing',
          tenantPostSecretPresent: false,
        });
        return;
      }
      const signatureHeader = args.req.headers['x-webhook-signature'] as string | undefined;
      const isValid = verifyWebsiteSignature(raw, signatureHeader, tenantSecret);
      if (!isValid) {
        denyTenantPostSignature({
          res: args.res,
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          channel: 'website',
          error: 'signature_invalid',
          tenantPostSecretPresent: true,
        });
        return;
      }
      const result = await handleWebsiteWebhook(parsed, {
        ...opts,
        tenantPostSignatureSaasControl: TENANT_POST_SIGNATURE_SAAS_OK,
      });
      args.setWebhookPhases(webhookPhasesFromHandlerResult(result));
      args.res.writeHead(result.ok ? 200 : 400, { 'content-type': 'application/json' });
      args.res.end(JSON.stringify(result, null, 2));
      return;
    }

    if (m.channel === 'whatsapp') {
      const { raw, parsed } = await args.readRequestBody(args.req);
      const secret = await getWhatsAppAppSecretForTenant(tenant.id);
      if (!secret) {
        denyTenantPostSignature({
          res: args.res,
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          channel: 'whatsapp',
          error: 'tenant_secret_missing',
          tenantPostSecretPresent: false,
        });
        return;
      }
      const signatureHeader = args.req.headers['x-hub-signature-256'] as string | undefined;
      const isValid = verifyMetaSignature(raw, signatureHeader, secret);
      if (!isValid) {
        denyTenantPostSignature({
          res: args.res,
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          channel: 'whatsapp',
          error: 'signature_invalid',
          tenantPostSecretPresent: true,
        });
        return;
      }
      const result = await handleWhatsAppWebhook(parsed, {
        ...opts,
        tenantPostSignatureSaasControl: TENANT_POST_SIGNATURE_SAAS_OK,
      });
      args.setWebhookPhases(webhookPhasesFromHandlerResult(result));
      args.res.writeHead(result.ok ? 200 : 400, { 'content-type': 'application/json' });
      args.res.end(JSON.stringify(result, null, 2));
      return;
    }

    if (m.channel === 'messenger') {
      const { raw, parsed } = await args.readRequestBody(args.req);
      const secret = await getMessengerAppSecretForTenant(tenant.id);
      if (!secret) {
        denyTenantPostSignature({
          res: args.res,
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          channel: 'messenger',
          error: 'tenant_secret_missing',
          tenantPostSecretPresent: false,
        });
        return;
      }
      const signatureHeader = args.req.headers['x-hub-signature-256'] as string | undefined;
      const isValid = verifyMetaSignature(raw, signatureHeader, secret);
      if (!isValid) {
        denyTenantPostSignature({
          res: args.res,
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          channel: 'messenger',
          error: 'signature_invalid',
          tenantPostSecretPresent: true,
        });
        return;
      }
      const result = await handleMessengerWebhook(parsed, {
        ...opts,
        tenantPostSignatureSaasControl: TENANT_POST_SIGNATURE_SAAS_OK,
      });
      args.setWebhookPhases(webhookPhasesFromHandlerResult(result));
      args.res.writeHead(result.ok ? 200 : 400, { 'content-type': 'application/json' });
      args.res.end(JSON.stringify(result, null, 2));
      return;
    }

    if (m.channel === 'line') {
      const { raw, parsed } = await args.readRequestBody(args.req);
      const secret = await getLineChannelSecretForTenant(tenant.id);
      if (!secret) {
        denyTenantPostSignature({
          res: args.res,
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          channel: 'line',
          error: 'tenant_secret_missing',
          tenantPostSecretPresent: false,
        });
        return;
      }
      const signatureHeader = args.req.headers['x-line-signature'] as string | undefined;
      const isValid = verifyLineSignature(raw, signatureHeader, secret);
      if (!isValid) {
        denyTenantPostSignature({
          res: args.res,
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          channel: 'line',
          error: 'signature_invalid',
          tenantPostSecretPresent: true,
        });
        return;
      }
      const result = await handleLineWebhook(parsed, {
        ...opts,
        tenantPostSignatureSaasControl: TENANT_POST_SIGNATURE_SAAS_OK,
      });
      args.setWebhookPhases(webhookPhasesFromHandlerResult(result));
      args.res.writeHead(result.ok ? 200 : 400, { 'content-type': 'application/json' });
      args.res.end(JSON.stringify(result, null, 2));
      return;
    }

    if (m.channel === 'zalo') {
      const { parsed: body } = await args.readRequestBody(args.req);
      const result = await handleZaloWebhook(body, opts);
      args.setWebhookPhases(webhookPhasesFromHandlerResult(result));
      args.res.writeHead(result.ok ? 200 : 400, { 'content-type': 'application/json' });
      args.res.end(JSON.stringify(result, null, 2));
      return;
    }

    args.res.writeHead(404, { 'content-type': 'application/json' });
    args.res.end(JSON.stringify({ ok: false, error: 'channel_not_found' }));
  });

  return true;
}
