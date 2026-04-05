import { fetch } from 'undici';
import { isInProcessTokenRefreshEnabled } from './in-process-flag';
import {
  applyZaloTokenRefreshResult,
  getZaloRefreshTokenResolved,
} from './zalo-token-cache';

/** Official Zalo OA OAuth endpoint — verify against current Zalo developer docs before production. */
const ZALO_OA_ACCESS_TOKEN_URL = 'https://oauth.zaloapp.com/v4/oa/access_token';

let inFlight: Promise<boolean> | null = null;

interface ZaloOAuthTokenResponse {
  access_token?: string;
  refresh_token?: string;
  error_name?: string;
  error_reason?: string;
}

/**
 * Single-flight refresh: concurrent 401s share one OAuth call.
 * Returns true if a new access token was applied to the in-memory cache.
 */
export function refreshZaloOaAccessTokenSingleFlight(): Promise<boolean> {
  if (!isInProcessTokenRefreshEnabled()) {
    return Promise.resolve(false);
  }
  if (inFlight) {
    return inFlight;
  }
  inFlight = doRefresh().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function doRefresh(): Promise<boolean> {
  const appId = process.env.ZALO_APP_ID?.trim();
  const appSecret = process.env.ZALO_APP_SECRET?.trim();
  const refreshToken = getZaloRefreshTokenResolved();

  if (!appId || !appSecret || !refreshToken) {
    return false;
  }

  const body = new URLSearchParams({
    refresh_token: refreshToken,
    app_id: appId,
    grant_type: 'refresh_token',
  });

  try {
    const res = await fetch(ZALO_OA_ACCESS_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        secret_key: appSecret,
      },
      body: body.toString(),
      signal: AbortSignal.timeout(15_000),
    });

    const data = (await res.json().catch(() => ({}))) as ZaloOAuthTokenResponse;

    if (!res.ok || !data.access_token || typeof data.access_token !== 'string') {
      const reason = data.error_name || data.error_reason || `http_${res.status}`;
      console.error('[ZaloOAuth] refresh failed:', reason);
      return false;
    }

    applyZaloTokenRefreshResult(data.access_token, data.refresh_token ?? null);
    return true;
  } catch (e) {
    console.error('[ZaloOAuth] refresh exception:', String(e));
    return false;
  }
}
