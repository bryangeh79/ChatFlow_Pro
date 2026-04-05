export interface MinimalTraceContext {
  trace_id: string;
  request_id: string;
  message_trace_id: string;
  channel: 'website' | 'telegram' | 'whatsapp' | 'messenger' | 'line' | 'zalo';
  session_id: string;
}

export type CreateMinimalTraceContextParams = Pick<MinimalTraceContext, 'channel' | 'session_id'> & {
  /** When set, equals HTTP `X-Request-Id` for access-log / outbound debug correlation */
  httpRequestId?: string;
};

export function createMinimalTraceContext(params: CreateMinimalTraceContextParams): MinimalTraceContext {
  const stamp = Date.now().toString(36);
  const { httpRequestId, channel, session_id } = params;
  return {
    channel,
    session_id,
    trace_id: `trace-${stamp}`,
    request_id: httpRequestId ?? `req-${stamp}`,
    message_trace_id: `msg-${stamp}`,
  };
}
