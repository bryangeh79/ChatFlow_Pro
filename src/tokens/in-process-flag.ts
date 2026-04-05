/**
 * Gates Phase 17 in-process token refresh (docs/154). Default off.
 */
export function isInProcessTokenRefreshEnabled(): boolean {
  const v = process.env.CHATFLOW_INPROCESS_TOKEN_REFRESH?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}
