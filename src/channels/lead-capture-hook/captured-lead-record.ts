export interface CapturedLeadRecord {
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
}
