/**
 * Webhook URL verification (GET) — tokens from env only; never log token values.
 */

import type { ServerResponse } from 'node:http';

export type WebhookGetVerifyResponse =
  | { kind: 'plaintext'; status: number; body: string }
  | { kind: 'json'; status: number; body: Record<string, unknown> };

function trimEnv(key: string): string | undefined {
  const v = process.env[key]?.trim();
  return v || undefined;
}

/** Shared Meta (Facebook/WhatsApp) style token when per-channel unset */
export function getSharedMetaWebhookVerifyToken(): string | undefined {
  return trimEnv('META_WEBHOOK_VERIFY_TOKEN') ?? trimEnv('WEBHOOK_VERIFY_TOKEN_META');
}

export function getWhatsAppWebhookVerifyToken(): string | undefined {
  return trimEnv('WHATSAPP_WEBHOOK_VERIFY_TOKEN') ?? getSharedMetaWebhookVerifyToken();
}

export function getMessengerWebhookVerifyToken(): string | undefined {
  return trimEnv('MESSENGER_WEBHOOK_VERIFY_TOKEN') ?? getSharedMetaWebhookVerifyToken();
}

export function getWebsiteWebhookVerifyToken(): string | undefined {
  return trimEnv('WEBSITE_WEBHOOK_VERIFY_TOKEN');
}

export function getZaloWebhookVerifyToken(): string | undefined {
  return trimEnv('ZALO_WEBHOOK_VERIFY_TOKEN');
}

export function getLineWebhookVerifyToken(): string | undefined {
  return trimEnv('LINE_WEBHOOK_VERIFY_TOKEN');
}

/**
 * Meta subscription verification: hub.mode=subscribe, hub.verify_token, hub.challenge.
 * On success returns challenge as plain text (required by Meta).
 */
export function verifyMetaStyleWebhookGet(
  searchParams: URLSearchParams,
  expectedToken: string | undefined,
): WebhookGetVerifyResponse | null {
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === null && token === null && challenge === null) {
    return null;
  }

  if (mode !== 'subscribe') {
    return {
      kind: 'json',
      status: 400,
      body: { ok: false, error: 'invalid_hub_mode' },
    };
  }

  if (!challenge) {
    return {
      kind: 'json',
      status: 400,
      body: { ok: false, error: 'missing_hub_challenge' },
    };
  }

  if (!expectedToken) {
    return {
      kind: 'json',
      status: 403,
      body: { ok: false, error: 'webhook_verify_not_configured' },
    };
  }

  if (token !== expectedToken) {
    return {
      kind: 'json',
      status: 403,
      body: { ok: false, error: 'verify_token_mismatch' },
    };
  }

  return { kind: 'plaintext', status: 200, body: challenge };
}

export function informationalWebhookGetPing(channel: string, note: string): WebhookGetVerifyResponse {
  return {
    kind: 'json',
    status: 200,
    body: { ok: true, channel, verification: note },
  };
}

export function sendWebhookGetVerifyResponse(res: ServerResponse, r: WebhookGetVerifyResponse): void {
  if (r.kind === 'plaintext') {
    res.writeHead(r.status, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(r.body);
    return;
  }
  res.writeHead(r.status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(r.body));
}

/**
 * If query has Meta-style hub.* fields, run verification; else return informational JSON ping.
 */
export function handleWebhookGetWithOptionalMetaVerify(
  res: ServerResponse,
  channel: string,
  searchParams: URLSearchParams,
  expectedToken: string | undefined,
  idleNote: string,
): void {
  const v = verifyMetaStyleWebhookGet(searchParams, expectedToken);
  if (v) {
    sendWebhookGetVerifyResponse(res, v);
    return;
  }
  sendWebhookGetVerifyResponse(res, informationalWebhookGetPing(channel, idleNote));
}
