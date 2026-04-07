import { createHash } from 'node:crypto';

/**
 * Phase 24 / 1H — SHA-256 hex (lowercase) for SaaS admin bridge token at-rest lookup.
 * No salt/pepper; not a substitute for product-grade credential storage or rotation.
 */
export function hashBridgeToken(token: string): string {
  const t = token.trim();
  if (!t) return '';
  return createHash('sha256').update(t, 'utf8').digest('hex');
}
