import type { UnifiedErrorInfo, UnifiedSendResult } from '../../../shared/types/unified-send-result';

export function createSendSuccessResult(partial: Omit<UnifiedSendResult, 'status' | 'completed_at'>): UnifiedSendResult {
  return { ...partial, status: 'success', completed_at: new Date().toISOString() };
}

export function createSendFallbackResult(partial: Omit<UnifiedSendResult, 'status' | 'completed_at'>): UnifiedSendResult {
  return { ...partial, status: 'fallback', completed_at: new Date().toISOString() };
}

export function createSendFailureResult(
  partial: Omit<UnifiedSendResult, 'status' | 'completed_at'>,
): UnifiedSendResult {
  return { ...partial, status: 'failed', completed_at: new Date().toISOString() };
}

export function toUnifiedErrorInfo(code: string, message: string, retryable: boolean): UnifiedErrorInfo {
  return { code, message, retryable };
}
