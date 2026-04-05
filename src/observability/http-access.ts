/**
 * Structured HTTP access logging (Phase 16).
 * Opt-in via CHATFLOW_HTTP_ACCESS_LOG=true|1|json — avoids noisy local dev logs by default.
 */

import { randomUUID } from 'node:crypto';

export function createRequestId(): string {
  return randomUUID();
}

export function isHttpAccessLogEnabled(): boolean {
  const v = process.env.CHATFLOW_HTTP_ACCESS_LOG?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'json';
}

/** Derive channel code from pathname for /webhooks/* routes. */
export function channelFromPathname(pathname: string): string | undefined {
  if (!pathname.startsWith('/webhooks/')) {
    return undefined;
  }
  const rest = pathname.slice('/webhooks/'.length);
  const seg = rest.split('/')[0];
  return seg && seg.length > 0 ? seg : undefined;
}

/** When present, merged into http_access JSON from webhook handler results (prepare = before outbound send). */
export interface WebhookPhaseMs {
  prepare_ms: number;
  outbound_send_ms?: number;
}

export function webhookPhasesFromHandlerResult(result: unknown): WebhookPhaseMs | undefined {
  if (result === null || typeof result !== 'object') return undefined;
  const r = result as {
    observability?: { phases_ms?: { prepare_ms?: unknown; outbound_send_ms?: unknown } };
  };
  const p = r.observability?.phases_ms;
  if (!p || typeof p.prepare_ms !== 'number') return undefined;
  const out: WebhookPhaseMs = { prepare_ms: p.prepare_ms };
  if (typeof p.outbound_send_ms === 'number') {
    out.outbound_send_ms = p.outbound_send_ms;
  }
  return out;
}

export interface HttpAccessLogFields {
  ts: string;
  type: 'http_access';
  request_id: string;
  method: string;
  path: string;
  status: number;
  duration_ms: number;
  channel?: string;
  phases_ms?: WebhookPhaseMs;
}

export function writeHttpAccessLog(fields: HttpAccessLogFields): void {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(fields));
}
