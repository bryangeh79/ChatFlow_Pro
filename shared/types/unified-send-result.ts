export type UnifiedSendStatus = 'success' | 'failed' | 'skipped' | 'fallback';

export interface UnifiedErrorInfo {
  code: string;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export interface UnifiedSendResult {
  channel: 'website' | 'telegram' | 'whatsapp' | 'messenger' | 'line' | 'zalo';
  session_id: string;
  message_trace_id: string;
  status: UnifiedSendStatus;
  provider_message_id?: string | null;
  retryable: boolean;
  error?: UnifiedErrorInfo | null;
  sent_at?: string | null;
  failed_at?: string | null;
  completed_at: string;
  debug_steps?: string[];
  trace_id?: string | null;
  request_id?: string | null;
}
