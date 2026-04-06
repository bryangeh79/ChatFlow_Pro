import type { IncomingMessage, ServerResponse } from 'node:http';
import { loadMetaWebhookConfig, verifyMetaSignature } from '../config/meta-webhook';
import { getLineChannelSecret, verifyLineSignature } from '../config/line-webhook';
import { getWebsiteSigningSecret, verifyWebsiteSignature } from '../config/website-webhook';
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
  const metaConfig = loadMetaWebhookConfig();

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
      const tenantSecret =
        (await getWebsiteSigningSecretForTenant(tenant.id)) ?? getWebsiteSigningSecret();
      const signatureHeader = args.req.headers['x-webhook-signature'] as string | undefined;
      const isValid = verifyWebsiteSignature(raw, signatureHeader, tenantSecret);
      if (!isValid) {
        args.res.writeHead(403, { 'content-type': 'application/json' });
        args.res.end(JSON.stringify({ ok: false, error: 'signature_invalid' }));
        return;
      }
      const result = await handleWebsiteWebhook(parsed, opts);
      args.setWebhookPhases(webhookPhasesFromHandlerResult(result));
      args.res.writeHead(result.ok ? 200 : 400, { 'content-type': 'application/json' });
      args.res.end(JSON.stringify(result, null, 2));
      return;
    }

    if (m.channel === 'whatsapp') {
      const { raw, parsed } = await args.readRequestBody(args.req);
      const secret =
        (await getWhatsAppAppSecretForTenant(tenant.id)) || metaConfig.whatsappAppSecret;
      const signatureHeader = args.req.headers['x-hub-signature-256'] as string | undefined;
      const isValid = verifyMetaSignature(raw, signatureHeader, secret);
      if (!isValid) {
        args.res.writeHead(403, { 'content-type': 'application/json' });
        args.res.end(JSON.stringify({ ok: false, error: 'signature_invalid' }));
        return;
      }
      const result = await handleWhatsAppWebhook(parsed, opts);
      args.setWebhookPhases(webhookPhasesFromHandlerResult(result));
      args.res.writeHead(result.ok ? 200 : 400, { 'content-type': 'application/json' });
      args.res.end(JSON.stringify(result, null, 2));
      return;
    }

    if (m.channel === 'messenger') {
      const { raw, parsed } = await args.readRequestBody(args.req);
      const secret =
        (await getMessengerAppSecretForTenant(tenant.id)) || metaConfig.messengerAppSecret;
      const signatureHeader = args.req.headers['x-hub-signature-256'] as string | undefined;
      const isValid = verifyMetaSignature(raw, signatureHeader, secret);
      if (!isValid) {
        args.res.writeHead(403, { 'content-type': 'application/json' });
        args.res.end(JSON.stringify({ ok: false, error: 'signature_invalid' }));
        return;
      }
      const result = await handleMessengerWebhook(parsed, opts);
      args.setWebhookPhases(webhookPhasesFromHandlerResult(result));
      args.res.writeHead(result.ok ? 200 : 400, { 'content-type': 'application/json' });
      args.res.end(JSON.stringify(result, null, 2));
      return;
    }

    if (m.channel === 'line') {
      const { raw, parsed } = await args.readRequestBody(args.req);
      const secret = (await getLineChannelSecretForTenant(tenant.id)) || getLineChannelSecret();
      const signatureHeader = args.req.headers['x-line-signature'] as string | undefined;
      const isValid = verifyLineSignature(raw, signatureHeader, secret);
      if (!isValid) {
        args.res.writeHead(403, { 'content-type': 'application/json' });
        args.res.end(JSON.stringify({ ok: false, error: 'signature_invalid' }));
        return;
      }
      const result = await handleLineWebhook(parsed, opts);
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
