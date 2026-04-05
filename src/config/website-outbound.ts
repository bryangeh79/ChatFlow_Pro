import { URL } from 'node:url';

export interface WebsiteOutboundConfig {
  url: string;
  signingSecret: string | null;
  disabled: boolean;
  sandbox: boolean;
  timeoutMs: number;
}

/**
 * Load Website outbound configuration from environment variables.
 * Returns null if WEBSITE_OUTBOUND_URL is not set or empty.
 */
export function loadWebsiteOutboundConfig(): WebsiteOutboundConfig | null {
  const url = process.env.WEBSITE_OUTBOUND_URL?.trim();
  if (!url) {
    return null;
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    console.warn('[WebsiteOutbound] Invalid WEBSITE_OUTBOUND_URL format, falling back to synthetic');
    return null;
  }

  const signingSecret = process.env.WEBSITE_OUTBOUND_SIGNING_SECRET?.trim() || null;
  const disabled = process.env.WEBSITE_OUTBOUND_DISABLED === '1';
  const sandbox = process.env.WEBSITE_OUTBOUND_SANDBOX === '1';
  const timeoutMs = parseInt(process.env.WEBSITE_OUTBOUND_TIMEOUT_MS || '10000', 10);

  return {
    url,
    signingSecret,
    disabled,
    sandbox,
    timeoutMs,
  };
}

/**
 * Check if Website outbound is sandboxed or disabled.
 * Returns true if real send should be skipped (fallback to synthetic).
 */
export function isWebsiteOutboundSandboxOrDisabled(config: WebsiteOutboundConfig | null): boolean {
  if (!config) {
    return true; // No config → synthetic
  }
  return config.disabled || config.sandbox;
}

/**
 * Redact signing secret from log messages.
 */
export function redactWebsiteSecretInMessage(message: string, secret: string | null): string {
  if (!secret) {
    return message;
  }
  // Simple split/join to avoid regex injection
  return message.split(secret).join('[REDACTED]');
}