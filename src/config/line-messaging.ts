export interface LineMessagingConfig {
  channelAccessToken: string;
  apiBaseUrl: string; // default "https://api.line.me"
}

/**
 * Check if Line real send should be disabled (sandbox mode).
 */
export function isLineSandboxOrDisabled(): boolean {
  const sandbox = process.env.LINE_SANDBOX;
  
  // Treat truthy strings as true
  return sandbox === 'true' || sandbox === '1';
}

/**
 * Load Line Messaging API configuration for real send.
 * Returns null if real send should be skipped (sandbox, disabled, or missing token).
 */
export function loadLineMessagingConfigForRealSend(): LineMessagingConfig | null {
  if (isLineSandboxOrDisabled()) {
    return null;
  }
  
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  
  if (!channelAccessToken || typeof channelAccessToken !== 'string' || channelAccessToken.trim() === '') {
    return null;
  }
  
  const apiBaseUrl = process.env.LINE_API_BASE_URL || 'https://api.line.me';
  
  return {
    channelAccessToken: channelAccessToken.trim(),
    apiBaseUrl: apiBaseUrl.trim(),
  };
}

/**
 * Redact Line channel access token from error messages or logs.
 */
export function redactLineTokenInMessage(message: string): string {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  
  if (!token || typeof token !== 'string') {
    return message;
  }
  
  // Simple replacement - token should not appear in logs anyway
  return message.replace(new RegExp(token, 'g'), '[LINE_CHANNEL_ACCESS_TOKEN]');
}