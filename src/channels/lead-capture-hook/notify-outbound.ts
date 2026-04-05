import { fetch } from 'undici';
import type { CapturedLeadRecord } from './captured-lead-record';
import { loadLeadNotifySecret, loadLeadNotifyUrl } from '../../config/lead-notify';

/**
 * Fire-and-forget POST of the same JSON shape as one JSONL line in `data/local-captured-leads.jsonl`.
 * Does nothing when CHATFLOW_LEAD_NOTIFY_URL is unset. Never throws; logs failures only.
 */
export function scheduleLeadCaptureNotify(record: CapturedLeadRecord): void {
  const url = loadLeadNotifyUrl();
  if (!url) return;

  const secret = loadLeadNotifySecret();
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'user-agent': 'ChatFlow-Pro/lead-notify',
  };
  if (secret) {
    headers['x-chatflow-lead-notify-secret'] = secret;
  }

  void (async () => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(record),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        // eslint-disable-next-line no-console
        console.error(`[LeadNotify] HTTP ${res.status} from notify endpoint`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // eslint-disable-next-line no-console
      console.error(`[LeadNotify] request failed: ${msg}`);
    }
  })();
}
