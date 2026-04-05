/**
 * In-memory Zalo OA tokens after a successful refresh. Env remains source of truth until first refresh.
 * Never log these values.
 */
let memoryAccessToken: string | null = null;
let memoryRefreshToken: string | null = null;

export function getZaloAccessTokenResolved(): string | undefined {
  const m = memoryAccessToken?.trim();
  if (m) return m;
  return process.env.ZALO_ACCESS_TOKEN?.trim() || undefined;
}

export function getZaloRefreshTokenResolved(): string | undefined {
  const m = memoryRefreshToken?.trim();
  if (m) return m;
  return process.env.ZALO_REFRESH_TOKEN?.trim() || undefined;
}

/** Apply OAuth refresh response; optional new refresh_token from vendor. */
export function applyZaloTokenRefreshResult(accessToken: string, refreshToken?: string | null): void {
  memoryAccessToken = accessToken.trim();
  if (refreshToken && typeof refreshToken === 'string' && refreshToken.trim() !== '') {
    memoryRefreshToken = refreshToken.trim();
  }
}
