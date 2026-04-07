import { URL } from 'node:url';
import { buildTelegramConfigFromToken, loadTelegramConfigForRealSend, type TelegramConfig } from '../config/telegram';
import type { WhatsAppCloudConfig } from '../config/whatsapp-cloud';
import {
  isWhatsAppSandboxOrDisabled,
  loadWhatsAppCloudConfigForRealSend,
} from '../config/whatsapp-cloud';
import type { MessengerGraphConfig } from '../config/messenger-graph';
import {
  isMessengerSandboxOrDisabled,
  loadMessengerGraphConfigForRealSend,
} from '../config/messenger-graph';
import type { LineMessagingConfig } from '../config/line-messaging';
import {
  isLineSandboxOrDisabled,
  loadLineMessagingConfigForRealSend,
} from '../config/line-messaging';
import type { ZaloOpenApiConfig } from '../config/zalo-openapi';
import {
  isZaloSandboxOrDisabled,
  loadZaloOpenApiConfigForRealSend,
} from '../config/zalo-openapi';
import type { WebsiteOutboundConfig } from '../config/website-outbound';
import { loadWebsiteOutboundConfig } from '../config/website-outbound';
import {
  getTenantCredentialsForOutbound,
  getTenantCredentialsForWebhook,
} from './repository';
import { getTenantRequestContext } from './tenant-context';

export async function loadTelegramConfigForTenant(tenantId: string): Promise<TelegramConfig | null> {
  const creds = await getTenantCredentialsForOutbound(tenantId);
  const token = creds.get('TELEGRAM_BOT_TOKEN');
  if (!token) return null;
  return buildTelegramConfigFromToken(token);
}

export async function loadWhatsAppCloudConfigForTenant(
  tenantId: string,
): Promise<WhatsAppCloudConfig | null> {
  if (isWhatsAppSandboxOrDisabled()) {
    return null;
  }
  const creds = await getTenantCredentialsForOutbound(tenantId);
  const accessToken = creds.get('WHATSAPP_ACCESS_TOKEN')?.trim();
  const phoneNumberId = creds.get('WHATSAPP_PHONE_NUMBER_ID')?.trim();
  if (!accessToken || !phoneNumberId) {
    return null;
  }
  const apiVersion = creds.get('WHATSAPP_API_VERSION')?.trim() || 'v19.0';
  return { accessToken, phoneNumberId, apiVersion };
}

/** Meta / WhatsApp webhook signature: tenant may set WHATSAPP_APP_SECRET or META_APP_SECRET. */
export async function getWhatsAppAppSecretForTenant(tenantId: string): Promise<string | undefined> {
  const creds = await getTenantCredentialsForWebhook(tenantId);
  return (
    creds.get('WHATSAPP_APP_SECRET')?.trim() ||
    creds.get('META_APP_SECRET')?.trim() ||
    undefined
  );
}

export async function getMessengerAppSecretForTenant(tenantId: string): Promise<string | undefined> {
  const creds = await getTenantCredentialsForWebhook(tenantId);
  return (
    creds.get('MESSENGER_APP_SECRET')?.trim() ||
    creds.get('META_APP_SECRET')?.trim() ||
    undefined
  );
}

export async function getLineChannelSecretForTenant(tenantId: string): Promise<string | undefined> {
  const creds = await getTenantCredentialsForWebhook(tenantId);
  return creds.get('LINE_CHANNEL_SECRET')?.trim() || undefined;
}

export async function getWebsiteSigningSecretForTenant(tenantId: string): Promise<string | undefined> {
  const creds = await getTenantCredentialsForWebhook(tenantId);
  return creds.get('WEBSITE_WEBHOOK_SIGNING_SECRET')?.trim() || undefined;
}

export async function loadMessengerGraphConfigForTenant(
  tenantId: string,
): Promise<MessengerGraphConfig | null> {
  if (isMessengerSandboxOrDisabled()) return null;
  const creds = await getTenantCredentialsForOutbound(tenantId);
  const pageAccessToken = creds.get('MESSENGER_PAGE_ACCESS_TOKEN')?.trim();
  const pageId = creds.get('MESSENGER_PAGE_ID')?.trim();
  if (!pageAccessToken || !pageId) return null;
  const apiVersion = creds.get('MESSENGER_API_VERSION')?.trim() || 'v19.0';
  return { pageAccessToken, pageId, apiVersion };
}

export async function loadLineMessagingConfigForTenant(
  tenantId: string,
): Promise<LineMessagingConfig | null> {
  if (isLineSandboxOrDisabled()) return null;
  const creds = await getTenantCredentialsForOutbound(tenantId);
  const channelAccessToken = creds.get('LINE_CHANNEL_ACCESS_TOKEN')?.trim();
  if (!channelAccessToken) return null;
  const apiBaseUrl = creds.get('LINE_API_BASE_URL')?.trim() || 'https://api.line.me';
  return { channelAccessToken, apiBaseUrl };
}

export async function loadZaloOpenApiConfigForTenant(tenantId: string): Promise<ZaloOpenApiConfig | null> {
  if (isZaloSandboxOrDisabled()) return null;
  const creds = await getTenantCredentialsForOutbound(tenantId);
  const accessToken = creds.get('ZALO_ACCESS_TOKEN')?.trim();
  const oaId = creds.get('ZALO_OA_ID')?.trim();
  if (!accessToken || !oaId) return null;
  const apiBaseUrl = creds.get('ZALO_API_BASE_URL')?.trim() || 'https://openapi.zalo.me';
  return { accessToken, oaId, apiBaseUrl };
}

export async function loadWebsiteOutboundConfigForTenant(
  tenantId: string,
): Promise<WebsiteOutboundConfig | null> {
  const creds = await getTenantCredentialsForOutbound(tenantId);
  const url = creds.get('WEBSITE_OUTBOUND_URL')?.trim();
  if (!url) return null;
  try {
    new URL(url);
  } catch {
    return null;
  }
  const signingSecret = creds.get('WEBSITE_OUTBOUND_SIGNING_SECRET')?.trim() || null;
  const disabled = creds.get('WEBSITE_OUTBOUND_DISABLED') === '1';
  const sandbox = creds.get('WEBSITE_OUTBOUND_SANDBOX') === '1';
  const timeoutRaw = creds.get('WEBSITE_OUTBOUND_TIMEOUT_MS');
  const timeoutMs = timeoutRaw ? parseInt(timeoutRaw, 10) : 10000;
  return {
    url,
    signingSecret,
    disabled,
    sandbox,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 10000,
  };
}

/** Outbound send: tenant DB credentials if in tenant request, else process env. */
export async function resolveTelegramConfigForOutbound(): Promise<TelegramConfig | null> {
  const ctx = getTenantRequestContext();
  if (ctx?.tenantId) return loadTelegramConfigForTenant(ctx.tenantId);
  return loadTelegramConfigForRealSend();
}

export async function resolveWhatsAppCloudConfigForOutbound(): Promise<WhatsAppCloudConfig | null> {
  const ctx = getTenantRequestContext();
  if (ctx?.tenantId) return loadWhatsAppCloudConfigForTenant(ctx.tenantId);
  return loadWhatsAppCloudConfigForRealSend();
}

export async function resolveMessengerGraphConfigForOutbound(): Promise<MessengerGraphConfig | null> {
  const ctx = getTenantRequestContext();
  if (ctx?.tenantId) return loadMessengerGraphConfigForTenant(ctx.tenantId);
  return loadMessengerGraphConfigForRealSend();
}

export async function resolveLineMessagingConfigForOutbound(): Promise<LineMessagingConfig | null> {
  const ctx = getTenantRequestContext();
  if (ctx?.tenantId) return loadLineMessagingConfigForTenant(ctx.tenantId);
  return loadLineMessagingConfigForRealSend();
}

export async function resolveZaloOpenApiConfigForOutbound(): Promise<ZaloOpenApiConfig | null> {
  const ctx = getTenantRequestContext();
  if (ctx?.tenantId) return loadZaloOpenApiConfigForTenant(ctx.tenantId);
  return loadZaloOpenApiConfigForRealSend();
}

export async function resolveWebsiteOutboundConfigForOutbound(): Promise<WebsiteOutboundConfig | null> {
  const ctx = getTenantRequestContext();
  if (ctx?.tenantId) return loadWebsiteOutboundConfigForTenant(ctx.tenantId);
  return loadWebsiteOutboundConfig();
}
