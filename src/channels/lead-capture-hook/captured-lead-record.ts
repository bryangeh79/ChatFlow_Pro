export interface CapturedLeadRecord extends Record<string, unknown> {
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
}
