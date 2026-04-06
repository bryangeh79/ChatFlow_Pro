/**
 * Telegram bot configuration (env only — never log token values).
 */

export interface TelegramConfig {
  botToken: string;
  botUsername?: string;
  /**
   * Full proxy URI for undici ProxyAgent (may include userinfo). Never log.
   */
  proxyConnectUri?: string;
}

const TOKEN_PATTERN = /^\d+:[A-Za-z0-9_-]+$/;

/**
 * Builds a proxy URI for undici (merges TELEGRAM_PROXY_* env). Returns undefined if unset or invalid.
 */
function buildTelegramProxyConnectUriFromEnv(): string | undefined {
  const raw = process.env.TELEGRAM_PROXY_URL?.trim();
  if (!raw) {
    return undefined;
  }
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      // eslint-disable-next-line no-console
      console.error('[Telegram] TELEGRAM_PROXY_URL must be http or https');
      return undefined;
    }
    const user = process.env.TELEGRAM_PROXY_USERNAME?.trim();
    if (user) {
      u.username = user;
      u.password = process.env.TELEGRAM_PROXY_PASSWORD ?? '';
    }
    return u.href;
  } catch {
    // eslint-disable-next-line no-console
    console.error('[Telegram] TELEGRAM_PROXY_URL is not a valid URL');
    return undefined;
  }
}

export function isTelegramSandboxMode(): boolean {
  const v = process.env.TELEGRAM_SANDBOX;
  return v === 'true' || v === '1';
}

export function getTelegramBotTokenRaw(): string | undefined {
  const t = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return t || undefined;
}

/**
 * Returns config for real send, or null to use synthetic sender.
 * Null when: sandbox mode, missing token, or invalid token shape.
 */
/**
 * Build send config from a bot token (e.g. loaded from tenant DB). Does not read process.env for the token.
 */
export function buildTelegramConfigFromToken(botToken: string): TelegramConfig | null {
  if (isTelegramSandboxMode()) {
    return null;
  }
  const t = botToken.trim();
  if (!t) {
    return null;
  }
  if (!TOKEN_PATTERN.test(t)) {
    // eslint-disable-next-line no-console
    console.error('[Telegram] bot token format invalid (expected digit:string)');
    return null;
  }
  const username = process.env.TELEGRAM_BOT_USERNAME?.trim();
  const proxyConnectUri = buildTelegramProxyConnectUriFromEnv();
  return {
    botToken: t,
    botUsername: username || undefined,
    ...(proxyConnectUri ? { proxyConnectUri } : {}),
  };
}

export function loadTelegramConfigForRealSend(): TelegramConfig | null {
  const botToken = getTelegramBotTokenRaw();
  if (!botToken) {
    return null;
  }
  return buildTelegramConfigFromToken(botToken);
}

export function redactTelegramTokenInMessage(message: string, token: string): string {
  if (!token || !message) return message;
  return message.split(token).join('[REDACTED]');
}
