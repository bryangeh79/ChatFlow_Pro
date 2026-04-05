import type { FallbackResponsePolicy } from '../../../shared/types/fallback-response-policy';

export const defaultFallbackResponsePolicy: FallbackResponsePolicy = {
  unsupported_channel: 'This channel is not supported yet.',
  unsupported_message_type: 'This message type is not supported yet.',
  missing_required_field: 'Required information is missing.',
  outbound_mapping_failure: 'Unable to prepare the message right now.',
  sender_failure: 'Unable to send the message right now.',
  internal_error_visibility: 'user_visible_safe',
  safe_fallback_error: {
    code: 'pipeline_error',
    message: 'A safe fallback was used.',
    retryable: true,
  },
};
