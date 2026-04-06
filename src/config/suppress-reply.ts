/**
 * Configuration for suppressing bot replies on handoff.
 */

/**
 * Check if bot replies should be suppressed when handoff is required.
 * Returns true when CHATFLOW_SUPPRESS_REPLY_ON_HANDOFF is enabled.
 */
export function shouldSuppressReplyOnHandoff(): boolean {
  const v = process.env.CHATFLOW_SUPPRESS_REPLY_ON_HANDOFF?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}