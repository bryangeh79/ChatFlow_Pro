export interface MinimalTraceContext {
  trace_id: string;
  request_id: string;
  message_trace_id: string;
  channel: 'website' | 'telegram' | 'whatsapp' | 'messenger' | 'line' | 'zalo';
  session_id: string;
}

export function createMinimalTraceContext(params: Omit<MinimalTraceContext, 'trace_id' | 'request_id' | 'message_trace_id'>): MinimalTraceContext {
  const stamp = Date.now().toString(36);
  return {
    ...params,
    trace_id: `trace-${stamp}`,
    request_id: `req-${stamp}`,
    message_trace_id: `msg-${stamp}`,
  };
}
