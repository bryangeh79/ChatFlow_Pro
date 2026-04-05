export interface ZaloOpenApiConfig {
  accessToken: string;
  oaId: string;
  apiBaseUrl: string; // default "https://openapi.zalo.me"
}

/**
 * Check if Zalo real send should be disabled (sandbox mode or explicit flag).
 */
export function isZaloSandboxOrDisabled(): boolean {
  const sandbox = process.env.ZALO_SANDBOX;
  const disabled = process.env.ZALO_MESSAGING_DISABLED;
  
  // Treat truthy strings as true
  const isSandbox = sandbox === 'true' || sandbox === '1';
  const isDisabled = disabled === 'true' || disabled === '1';
  
  return isSandbox || isDisabled;
}

/**
 * Load Zalo Open API configuration for real send.
 * Returns null if real send should be skipped (sandbox, disabled, or missing token/OA ID).
 */
export function loadZaloOpenApiConfigForRealSend(): ZaloOpenApiConfig | null {
  if (isZaloSandboxOrDisabled()) {
    return null;
  }
  
  const accessToken = process.env.ZALO_ACCESS_TOKEN;
  const oaId = process.env.ZALO_OA_ID;
  
  if (!accessToken || typeof accessToken !== 'string' || accessToken.trim() === '') {
    return null;
  }
  
  if (!oaId || typeof oaId !== 'string' || oaId.trim() === '') {
    return null;
  }
  
  const apiBaseUrl = process.env.ZALO_API_BASE_URL || 'https://openapi.zalo.me';
  
  return {
    accessToken: accessToken.trim(),
    oaId: oaId.trim(),
    apiBaseUrl: apiBaseUrl.trim(),
  };
}

/**
 * Redact Zalo access token from error messages or logs.
 */
export function redactZaloTokenInMessage(message: string, token: string): string {
  if (!token || typeof token !== 'string') {
    return message;
  }
  
  // Use split/join instead of RegExp to avoid special character issues
  return message.split(token).join('[ZALO_ACCESS_TOKEN]');
}