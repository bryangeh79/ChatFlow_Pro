/**
 * Meta (WhatsApp + Messenger) webhook signature verification.
 * Never log app secret values.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

export interface MetaWebhookConfig {
  whatsappAppSecret?: string;
  messengerAppSecret?: string;
}

/**
 * Reads Meta app secrets from environment.
 * Returns undefined for each channel if not configured.
 */
export function loadMetaWebhookConfig(): MetaWebhookConfig {
  const whatsapp = process.env.WHATSAPP_APP_SECRET?.trim() || process.env.META_APP_SECRET?.trim();
  const messenger = process.env.MESSENGER_APP_SECRET?.trim() || process.env.META_APP_SECRET?.trim();

  return {
    ...(whatsapp ? { whatsappAppSecret: whatsapp } : {}),
    ...(messenger ? { messengerAppSecret: messenger } : {}),
  };
}

/**
 * Verifies Meta X-Hub-Signature-256 header.
 * @param rawBody - Raw request body as Buffer or string (must be original, not parsed JSON)
 * @param signatureHeader - Value of X-Hub-Signature-256 header (format: "sha256=<hex>")
 * @param appSecret - App secret for HMAC
 * @returns true if signature is valid, false otherwise
 */
export function verifyMetaSignature(
  rawBody: Buffer | string,
  signatureHeader: string | undefined,
  appSecret: string | undefined,
): boolean {
  // No app secret → skip verification (compatibility with existing dev setups)
  if (!appSecret) {
    return true;
  }

  // App secret configured but signature header missing/empty → reject
  if (!signatureHeader || signatureHeader.trim() === '') {
    return false;
  }

  const match = signatureHeader.match(/^sha256=([0-9a-f]{64})$/i);
  if (!match) {
    // Invalid format (not sha256=<64hex>) → reject
    return false;
  }

  const expectedHex = match[1].toLowerCase();
  const hmac = createHmac('sha256', appSecret);
  hmac.update(rawBody);
  const actualHex = hmac.digest('hex');

  // Constant-time comparison to prevent timing attacks
  try {
    return timingSafeEqual(
      Buffer.from(actualHex, 'hex'),
      Buffer.from(expectedHex, 'hex'),
    );
  } catch {
    // Length mismatch or other error
    return false;
  }
}

/**
 * Logs a warning about missing app secret (once per channel).
 */
export function warnIfNoAppSecret(channel: 'whatsapp' | 'messenger', hasSecret: boolean): void {
  if (!hasSecret) {
    // eslint-disable-next-line no-console
    console.warn(`[MetaWebhook] No app secret configured for ${channel}; signature verification disabled`);
  }
}
