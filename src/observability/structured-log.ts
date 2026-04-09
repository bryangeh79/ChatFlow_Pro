/**
 * Phase D-C1 — unified structured runtime log fields (no commercial APM).
 * Opt-in: CHATFLOW_STRUCTURED_RUNTIME_LOG=true|1|json
 */

import { createHash } from 'node:crypto';

const SENSITIVE_KEY = /^(.*[_-])?(secret|token|password|authorization|apikey|api_key|bearer|credential)([_-].*)?$/i;

/** Short stable fingerprint for idempotency keys / session ids in logs (not reversible). */
export function observabilityFingerprint(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 16);
}

export function isStructuredRuntimeLogEnabled(): boolean {
  const v = process.env.CHATFLOW_STRUCTURED_RUNTIME_LOG?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'json';
}

export type StructuredLogPhase =
  | 'inbound'
  | 'pipeline'
  | 'outbound'
  | 'notify'
  | 'admin'
  | 'readiness'
  | 'lifecycle'
  | 'security';

/** Base fields aligned with D-C design (no secret values). */
export interface StructuredLogBase {
  ts: string;
  type: string;
  service: 'chatflow-pro';
  request_id?: string | null;
  tenant_id?: string | null;
  channel?: string | null;
  phase?: StructuredLogPhase | null;
  message_trace_id?: string | null;
  outcome?: string | null;
  code?: string | null;
  duration_ms?: number | null;
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY.test(key);
}

export function redactForLog(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((x) => redactForLog(x));
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
      out[k] = isSensitiveKey(k) ? '[REDACTED]' : redactForLog(v);
    }
    return out;
  }
  return value;
}

export function writeStructuredLog(payload: Record<string, unknown>): void {
  if (!isStructuredRuntimeLogEnabled()) return;
  const base: StructuredLogBase = {
    ts: new Date().toISOString(),
    type: String(payload.type ?? 'runtime'),
    service: 'chatflow-pro',
  };
  const merged = { ...base, ...payload, service: 'chatflow-pro' as const, ts: base.ts };
  const safe = redactForLog(merged) as Record<string, unknown>;
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(safe));
}
