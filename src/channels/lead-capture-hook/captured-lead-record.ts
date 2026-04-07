export interface CapturedLeadRecord extends Record<string, unknown> {
  /** Phase 24 / 3C — fixed event label for JSONL + notify body alignment. */
  event_type: 'lead_captured';
  session_id: string;
  channel: 'website' | 'telegram' | 'whatsapp' | 'messenger' | 'line' | 'zalo';
  collected_fields: {
    name?: string;
    phone?: string;
    email?: string;
  };
  completed_at: string;
  message_id?: string;
  captured_at: string;
  request_id?: string;
  message_trace_id?: string;
  /** Phase 24 / 3C — deterministic key for downstream at-least-once consumers. */
  idempotency_key: string;
}
