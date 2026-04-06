import type { IncomingMessage, ServerResponse } from 'node:http';
import { verifyMetaSignature } from '../config/meta-webhook';
import { verifyLineSignature } from '../config/line-webhook';
import { verifyWebsiteSignature } from '../config/website-webhook';
import {
  informationalWebhookGetPing,
  sendWebhookGetVerifyResponse,
  verifyMetaStyleWebhookGet,
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

async function getTenantWebhookVerifyTokenOnly(
  tenantId: string,
  credentialKey: string,
): Promise<string | undefined> {
  const creds = await getTenantCredentials(tenantId);
  return creds.get(credentialKey)?.trim() || undefined;
}

function saasControlTenantGetVerify(tokenPresent: boolean): {
  tenant_get_verify_token_present: boolean;
  tenant_get_env_fallback_blocked: boolean;
} {
  return {
    tenant_get_verify_token_present: tokenPresent,
    tenant_get_env_fallback_blocked: true,
  };
}

function denyTenantGetVerifyTokenMissing(args: {
  res: ServerResponse;
  tenantId: string;
  tenantSlug: string;
  channel: string;
}): void {
  // eslint-disable-next-line no-console
  console.warn(
    '[tenant-webhook]',
    JSON.stringify({
      event: 'tenant_verify_token_missing',
      channel: args.channel,
      tenant_id: args.tenantId,
      tenant_slug: args.tenantSlug,
    }),
  );
  args.res.writeHead(403, { 'content-type': 'application/json' });
  args.res.end(
    JSON.stringify({
      ok: false,
      error: 'tenant_verify_token_missing',
      debug_metadata: {
        saas_control: saasControlTenantGetVerify(false),
      },
    }),
  );
}

function tenantGetVerifyCredentialKey(channel: string): string {
  switch (channel) {
    case 'whatsapp':
      return 'WHATSAPP_WEBHOOK_VERIFY_TOKEN';
    case 'messenger':
      return 'MESSENGER_WEBHOOK_VERIFY_TOKEN';
    case 'website':
      return 'WEBSITE_WEBHOOK_VERIFY_TOKEN';
    case 'line':
      return 'LINE_WEBHOOK_VERIFY_TOKEN';
    case 'zalo':
      return 'ZALO_WEBHOOK_VERIFY_TOKEN';
    default:
      return 'WHATSAPP_WEBHOOK_VERIFY_TOKEN';
  }
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
    const tenantVtok = await getTenantWebhookVerifyTokenOnly(
      tenant.id,
      tenantGetVerifyCredentialKey(m.channel),
    );
    const v = verifyMetaStyleWebhookGet(args.url.searchParams, tenantVtok);
    if (
      v &&
      v.kind === 'json' &&
      v.status === 403 &&
      v.body &&
      typeof v.body === 'object' &&
      'error' in v.body &&
      v.body.error === 'webhook_verify_not_configured'
    ) {
      denyTenantGetVerifyTokenMissing({
        res: args.res,
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        channel: m.channel,
      });
      return true;
    }
    if (v) {
      sendWebhookGetVerifyResponse(args.res, v);
      return true;
    }
    sendWebhookGetVerifyResponse(
      args.res,
      informationalWebhookGetPing(m.channel, 'tenant_meta_style_hub'),
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
