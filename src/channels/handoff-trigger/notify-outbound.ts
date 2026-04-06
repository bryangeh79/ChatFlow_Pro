import { fetch } from 'undici';
import { loadHandoffNotifySecret, loadHandoffNotifyUrl } from '../../config/handoff-notify';

export interface HandoffNotifyPayload {
  event: 'handoff_pending';
  session_id: string;
  channel: string;
  external_user_id: string;
  external_session_id: string;
  reason: string | null;
  triggered_at: string | null;
  request_id?: string;
  message_trace_id?: string;
  assigned_owner_id?: string;
  assign_reason?: string;
  online_agents_count?: number;
  assignment_log_id?: string;
}

/**
 * Fire-and-forget POST when session first enters handoff pending.
 * Does nothing when CHATFLOW_HANDOFF_NOTIFY_URL is unset. Never throws; logs failures only.
 */
export function scheduleHandoffNotify(payload: HandoffNotifyPayload): void {
  const url = loadHandoffNotifyUrl();
  if (!url) return;

  const secret = loadHandoffNotifySecret();
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'user-agent': 'ChatFlow-Pro/handoff-notify',
  };
  if (secret) {
    headers['x-chatflow-handoff-notify-secret'] = secret;
  }

  void (async () => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        // eslint-disable-next-line no-console
        console.error(`[HandoffNotify] HTTP ${res.status} from notify endpoint`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // eslint-disable-next-line no-console
      console.error(`[HandoffNotify] request failed: ${msg}`);
    }
  })();
}
