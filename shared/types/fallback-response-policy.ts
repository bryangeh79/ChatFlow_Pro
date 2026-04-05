import type { UnifiedErrorInfo } from './unified-send-result';

export interface FallbackResponsePolicy {
  unsupported_channel: string;
  unsupported_message_type: string;
  missing_required_field: string;
  outbound_mapping_failure: string;
  sender_failure: string;
  internal_error_visibility: 'hidden' | 'internal_only' | 'user_visible_safe';
  safe_fallback_error: UnifiedErrorInfo;
}
