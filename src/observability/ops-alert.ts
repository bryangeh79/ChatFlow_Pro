/**
 * Phase D-C1 — ops alert severity skeleton (P1 / P2 / P3).
 * Output: single JSON line per event; no external webhook required in this slice.
 * Opt-in: CHATFLOW_OPS_ALERT_LOG=true|1|json
 */

import { redactForLog, type StructuredLogPhase } from './structured-log';

export type OpsAlertSeverity = 'P1' | 'P2' | 'P3';

export function isOpsAlertLogEnabled(): boolean {
  const v = process.env.CHATFLOW_OPS_ALERT_LOG?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'json';
}

export interface EmitOpsAlertInput {
  severity: OpsAlertSeverity;
  code: string;
  message: string;
  request_id?: string | null;
  tenant_id?: string | null;
  channel?: string | null;
  phase?: StructuredLogPhase | null;
  message_trace_id?: string | null;
  context?: Record<string, unknown> | null;
}

/** Emits one structured line: type=ops_alert, severity=P1|P2|P3. */
export function emitOpsAlert(input: EmitOpsAlertInput): void {
  if (!isOpsAlertLogEnabled()) return;
  const row = {
    ts: new Date().toISOString(),
    type: 'ops_alert',
    service: 'chatflow-pro',
    severity: input.severity,
    code: input.code,
    message: input.message,
    request_id: input.request_id ?? null,
    tenant_id: input.tenant_id ?? null,
    channel: input.channel ?? null,
    phase: input.phase ?? null,
    message_trace_id: input.message_trace_id ?? null,
    context: input.context ? (redactForLog(input.context) as Record<string, unknown>) : null,
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(row));
}
