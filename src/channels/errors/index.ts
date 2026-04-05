export type ChannelErrorCode =
  | 'normalize_error'
  | 'pipeline_error'
  | 'outbound_mapping_error'
  | 'unsupported_message_type'
  | 'missing_required_field';

export interface ChannelError {
  code: ChannelErrorCode;
  message: string;
  recoverable: boolean;
  details?: Record<string, unknown>;
}

export function createSafeFallbackResponse(message: string): ChannelError {
  return {
    code: 'pipeline_error',
    message,
    recoverable: true,
  };
}
