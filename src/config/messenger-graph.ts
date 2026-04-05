import { env } from 'node:process';
import { getMessengerPageAccessTokenResolved } from '../tokens/meta-token-cache';

export interface MessengerGraphConfig {
  pageAccessToken: string;
  pageId: string;
  apiVersion: string;
}

/**
 * Returns true if Messenger Graph API real send should be disabled.
 * Checks MESSENGER_SANDBOX and MESSENGER_GRAPH_DISABLED environment variables.
 */
export function isMessengerSandboxOrDisabled(): boolean {
  const sandbox = env.MESSENGER_SANDBOX;
  const disabled = env.MESSENGER_GRAPH_DISABLED;
  return sandbox === 'true' || sandbox === '1' || disabled === 'true' || disabled === '1';
}

/**
 * Returns the raw Graph API version string from environment.
 * Defaults to 'v19.0' if not specified.
 */
export function getMessengerApiVersionRaw(): string {
  return env.MESSENGER_API_VERSION || 'v19.0';
}

/**
 * Loads Messenger Graph API configuration for real send.
 * Returns null if real send should be disabled or required env vars are missing.
 */
export function loadMessengerGraphConfigForRealSend(): MessengerGraphConfig | null {
  if (isMessengerSandboxOrDisabled()) {
    return null;
  }

  const pageAccessToken = getMessengerPageAccessTokenResolved();
  const pageId = env.MESSENGER_PAGE_ID;

  if (!pageAccessToken || !pageId?.trim()) {
    return null;
  }

  return {
    pageAccessToken,
    pageId: pageId.trim(),
    apiVersion: getMessengerApiVersionRaw(),
  };
}

/**
 * Redacts Messenger Page Access Token from error messages.
 * Replaces the token with `[REDACTED]` to prevent logging.
 */
export function redactMessengerTokenInMessage(message: string, token: string): string {
  if (!token || token.length < 8) {
    return message.replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]');
  }
  const safeToken = `${token.slice(0, 4)}…${token.slice(-4)}`;
  return message
    .replace(new RegExp(token, 'g'), '[REDACTED]')
    .replace(new RegExp(safeToken, 'g'), '[REDACTED]')
    .replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]');
}
