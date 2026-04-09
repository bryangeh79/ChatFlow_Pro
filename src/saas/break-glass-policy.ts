/**
 * Phase D-C2B2 — break-glass TTL gate (env-driven). Does not replace CHATFLOW_SAAS_ADMIN_TOKEN;
 * when TTL mode is active, the same token is only accepted before expires_at.
 */

function envTrim(name: string): string {
  return process.env[name]?.trim() ?? '';
}

/** When `1`/`true`, break-glass bearer path requires a valid future `CHATFLOW_BREAK_GLASS_EXPIRES_AT`. */
export function isBreakGlassTtlModeActive(): boolean {
  const v = envTrim('CHATFLOW_BREAK_GLASS_ACTIVE').toLowerCase();
  return v === '1' || v === 'true';
}

/** ISO 8601 instant; invalid/missing → null. */
export function parseBreakGlassExpiresAtIso(): string | null {
  const raw = envTrim('CHATFLOW_BREAK_GLASS_EXPIRES_AT');
  if (!raw) return null;
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

export function getBreakGlassExpiresAtMs(): number | null {
  const iso = parseBreakGlassExpiresAtIso();
  if (!iso) return null;
  return Date.parse(iso);
}

export function isBreakGlassTtlExpired(nowMs: number = Date.now()): boolean {
  const exp = getBreakGlassExpiresAtMs();
  if (exp === null) return true;
  return nowMs > exp;
}

export function breakGlassTtlConfigSummary(): {
  ttl_mode_active: boolean;
  expires_at_iso: string | null;
  misconfigured: boolean;
  expired: boolean;
} {
  const ttl_mode_active = isBreakGlassTtlModeActive();
  const expires_at_iso = parseBreakGlassExpiresAtIso();
  const misconfigured = ttl_mode_active && expires_at_iso === null;
  const expired = ttl_mode_active && expires_at_iso !== null && isBreakGlassTtlExpired();
  return { ttl_mode_active, expires_at_iso, misconfigured, expired };
}
