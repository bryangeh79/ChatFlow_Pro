/**
 * Line webhook signature verification.
 * Never log channel secret values.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Reads Line channel secret from environment.
 * Returns undefined if not configured.
 */
export function getLineChannelSecret(): string | undefined {
  return process.env.LINE_CHANNEL_SECRET?.trim() || undefined;
}

/**
 * Verifies Line X-Line-Signature header.
 * @param rawBody - Raw request body as Buffer or string (must be original, not parsed JSON)
 * @param signatureHeader - Value of X-Line-Signature header (base64 HMAC-SHA256)
 * @param channelSecret - Line channel secret
 * @returns true if signature is valid, false otherwise
 */
export function verifyLineSignature(
  rawBody: Buffer | string,
  signatureHeader: string | undefined,
  channelSecret: string | undefined,
): boolean {
  // No channel secret → skip verification (compatibility with existing dev setups)
  if (!channelSecret) {
    return true;
  }

  // Channel secret configured but signature header missing/empty → reject
  if (!signatureHeader || signatureHeader.trim() === '') {
    return false;
  }

  // Line signature is base64-encoded HMAC-SHA256
  const hmac = createHmac('sha256', channelSecret);
  hmac.update(rawBody);
  const expectedSignature = hmac.digest('base64');

  // Constant-time comparison to prevent timing attacks
  try {
    return timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signatureHeader),
    );
  } catch {
    // Length mismatch or other error
    return false;
  }
}

/**
 * Logs a warning about missing Line channel secret (once).
 */
export function warnIfNoLineChannelSecret(hasSecret: boolean): void {
  if (!hasSecret) {
    // eslint-disable-next-line no-console
    console.warn('[LineWebhook] No LINE_CHANNEL_SECRET configured; signature verification disabled');
  }
}
