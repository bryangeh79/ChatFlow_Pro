/**
 * Phase 24 / 3C — single source for outbound JSONL + HTTP notify idempotency keys.
 * Pure string builders only; no I/O.
 */

export const LEAD_CAPTURED_EVENT_TYPE = 'lead_captured' as const;
export const HANDOFF_ASSIGNMENT_LOGGED_EVENT_TYPE = 'handoff_assignment_logged' as const;

/** When HTTP X-Request-Id (and message_id) are both absent — weak idempotency; documented in docs/179. */
export const OUTBOUND_IDEMPOTENCY_NO_REQUEST_ID = 'no_http_request_id' as const;

/**
 * Lead JSONL + lead notify body (same record shape).
 * Formula: lead_captured:<session_id>:(request_id | message_id | no_http_request_id)
 */
export function buildLeadCapturedIdempotencyKey(input: {
  sessionId: string;
  requestId?: string;
  messageId?: string;
}): string {
  const rid = input.requestId ?? input.messageId ?? OUTBOUND_IDEMPOTENCY_NO_REQUEST_ID;
  return `lead_captured:${input.sessionId}:${rid}`;
}

/**
 * Handoff HTTP notify (event remains `handoff_pending` on payload).
 * Formula: handoff_pending:<session_id>:(request_id | no_http_request_id)
 */
export function buildHandoffPendingNotifyIdempotencyKey(input: {
  sessionId: string;
  requestId?: string;
}): string {
  const rid = input.requestId ?? OUTBOUND_IDEMPOTENCY_NO_REQUEST_ID;
  return `handoff_pending:${input.sessionId}:${rid}`;
}

/**
 * Handoff assignment JSONL row only.
 * Formula: handoff_assignment:<assignment_log_id>
 */
export function buildHandoffAssignmentIdempotencyKey(assignmentLogId: string): string {
  return `handoff_assignment:${assignmentLogId}`;
}
