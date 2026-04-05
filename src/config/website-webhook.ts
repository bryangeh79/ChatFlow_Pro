/**
 * Website webhook signature verification.
 * Reuses Meta's signature format (sha256=<hex>) for consistency.
 * Never log signing secret values.
 */

import { verifyMetaSignature } from './meta-webhook';

/**
 * Reads website webhook signing secret from environment.
 * Returns undefined if not configured.
 */
export function getWebsiteSigningSecret(): string | undefined {
  return process.env.WEBSITE_WEBHOOK_SIGNING_SECRET?.trim() || undefined;
}

/**
 * Verifies Website X-Webhook-Signature header.
 * Uses same format and algorithm as Meta (sha256=<hex> HMAC-SHA256).
 * @param rawBody - Raw request body as Buffer or string (must be original, not parsed JSON)
 * @param signatureHeader - Value of X-Webhook-Signature header (format: "sha256=<hex>")
 * @param signingSecret - Website signing secret for HMAC
 * @returns true if signature is valid, false otherwise
 */
export function verifyWebsiteSignature(
  rawBody: Buffer | string,
  signatureHeader: string | undefined,
  signingSecret: string | undefined,
): boolean {
  // Reuse Meta's verification logic (same format: sha256=<hex>)
  return verifyMetaSignature(rawBody, signatureHeader, signingSecret);
}

/**
 * Logs a warning about missing website signing secret (once).
 */
export function warnIfNoWebsiteSigningSecret(hasSecret: boolean): void {
  if (!hasSecret) {
    // eslint-disable-next-line no-console
    console.warn('[WebsiteWebhook] No WEBSITE_WEBHOOK_SIGNING_SECRET configured; signature verification disabled');
  }
}
