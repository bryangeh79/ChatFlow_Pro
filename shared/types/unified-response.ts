export type UnifiedResponseKind = 'text' | 'attachment' | 'system' | 'handoff' | 'lead_capture' | 'debug';

export interface UnifiedResponseAttachment {
  type: string;
  url?: string;
  name?: string;
  mime_type?: string;
  size?: number;
}

export interface UnifiedResponse {
  channel: 'website' | 'telegram' | 'whatsapp' | 'messenger' | 'line' | 'zalo';
  session_id: string;
  kind: UnifiedResponseKind;
  reply_text?: string | null;
  attachments?: UnifiedResponseAttachment[];
  system_message?: string | null;
  handoff_required?: boolean;
  lead_capture_prompt?: string | null;
  should_send: boolean;
  debug_steps?: string[];
  debug_metadata?: Record<string, unknown>;
  raw_metadata?: Record<string, unknown>;
  /** Quick-reply button labels to display alongside the reply (platform-specific rendering). */
  quick_reply_buttons?: string[];
}
