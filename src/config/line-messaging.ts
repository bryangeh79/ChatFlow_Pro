export interface LineMessagingConfig {
  channelAccessToken: string;
  apiBaseUrl: string; // default "https://api.line.me"
}

/**
 * Check if Line real send should be disabled (sandbox mode or explicit flag).
 */
export function isLineSandboxOrDisabled(): boolean {
  const sandbox = process.env.LINE_SANDBOX;
  const disabled = process.env.LINE_MESSAGING_DISABLED;
  
  // Treat truthy strings as true
  const isSandbox = sandbox === 'true' || sandbox === '1';
  const isDisabled = disabled === 'true' || disabled === '1';
  
  return isSandbox || isDisabled;
}

/**
 * Load Line Messaging API configuration for real send.
 * Returns null if real send should be skipped (sandbox or missing token).
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
export function redactLineTokenInMessage(message: string, token: string): string {
  if (!token || typeof token !== 'string') {
    return message;
  }
  
  // Use split/join instead of RegExp to avoid special character issues
  return message.split(token).join('[LINE_CHANNEL_ACCESS_TOKEN]');
}