/**
 * Optional outbound POST when a lead is first persisted (env only — never log URL body or secret).
 */

export function loadLeadNotifyUrl(): string | undefined {
  const raw = process.env.CHATFLOW_LEAD_NOTIFY_URL?.trim();
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      // eslint-disable-next-line no-console
      console.error('[LeadNotify] CHATFLOW_LEAD_NOTIFY_URL must be http or https');
      return undefined;
    }
    return u.href;
  } catch {
    // eslint-disable-next-line no-console
    console.error('[LeadNotify] CHATFLOW_LEAD_NOTIFY_URL is not a valid URL');
    return undefined;
  }
}

export function loadLeadNotifySecret(): string | undefined {
  const s = process.env.CHATFLOW_LEAD_NOTIFY_SECRET?.trim();
  return s || undefined;
}
