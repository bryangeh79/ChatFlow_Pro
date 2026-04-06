/**
 * Optional outbound POST when handoff enters pending (env only — never log URL body or secret).
 */

export function loadHandoffNotifyUrl(): string | undefined {
  const raw = process.env.CHATFLOW_HANDOFF_NOTIFY_URL?.trim();
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      // eslint-disable-next-line no-console
      console.error('[HandoffNotify] CHATFLOW_HANDOFF_NOTIFY_URL must be http or https');
      return undefined;
    }
    return u.href;
  } catch {
    // eslint-disable-next-line no-console
    console.error('[HandoffNotify] CHATFLOW_HANDOFF_NOTIFY_URL is not a valid URL');
    return undefined;
  }
}

export function loadHandoffNotifySecret(): string | undefined {
  const s = process.env.CHATFLOW_HANDOFF_NOTIFY_SECRET?.trim();
  return s || undefined;
}
