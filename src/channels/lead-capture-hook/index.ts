import type { UnifiedInboundMessage } from '../../../shared/types/unified-inbound-message';
import type { UnifiedSessionContext } from '../../../shared/types/unified-session-context';
import type { TenantRuntimeSettings } from '../../saas/tenant-runtime-settings';
import { detectContactIntent, type ContactIntentDetection } from './contact-intent-detector';
import { appendCapturedLeadRecord } from './persistence';

export function runLeadCaptureHook(
  message: UnifiedInboundMessage,
  session: UnifiedSessionContext,
  traceContext?: { request_id?: string; message_trace_id?: string },
  pipelineOpts?: { tenantRuntimeSettings?: TenantRuntimeSettings },
): UnifiedSessionContext {
  if (
    pipelineOpts?.tenantRuntimeSettings !== undefined &&
    pipelineOpts.tenantRuntimeSettings.lead_capture.enabled === false
  ) {
    return session;
  }

  const detection = detectContactIntent(message);
  
  // 如果没有检测到联系意图且没有新字段，保持原状态
  const hasNewFields = detection.detectedFields.name || detection.detectedFields.phone || detection.detectedFields.email;
  if (!detection.hasExplicitContactIntent && !hasNewFields) {
    return session;
  }

  // 合并已有字段和新检测字段
  const existingFields = session.lead_capture_state.collected_fields || {};
  const newFields = detection.detectedFields;
  
  const mergedFields: Record<string, unknown> = {
    ...existingFields,
    ...(newFields.name && { name: newFields.name }),
    ...(newFields.phone && { phone: newFields.phone }),
    ...(newFields.email && { email: newFields.email }),
  };

  // 计算缺失字段
  const missingFields: string[] = [];
  if (!mergedFields.name) missingFields.push('name');
  if (!mergedFields.phone) missingFields.push('phone');
  if (!mergedFields.email) missingFields.push('email');

  // 确定状态
  let status: 'none' | 'partial' | 'captured' = 'none';
  const isNowCaptured = mergedFields.name && mergedFields.phone && mergedFields.email;
  const wasCaptured = session.lead_capture_state.status === 'captured';
  
  if (isNowCaptured) {
    status = 'captured';
  } else if (Object.keys(mergedFields).length > 0) {
    status = 'partial';
  }

  // 更新 session 状态
  const updatedSession: UnifiedSessionContext = {
    ...session,
    lead_capture_state: {
      status,
      collected_fields: mergedFields,
      missing_fields: missingFields.length > 0 ? missingFields : undefined,
      completed_at: status === 'captured' ? new Date().toISOString() : session.lead_capture_state.completed_at,
    },
  };

  // 仅在状态变为 captured 时持久化（避免重复记录）
  const shouldPersist = isNowCaptured && !wasCaptured;
  if (shouldPersist) {
    const tenantNotifyEnabled =
      pipelineOpts?.tenantRuntimeSettings === undefined ||
      pipelineOpts.tenantRuntimeSettings.notify.enabled !== false;
    appendCapturedLeadRecord(updatedSession, message, traceContext, {
      httpNotifyEnabled: tenantNotifyEnabled,
    });
  }

  // 记录调试信息
  if (!updatedSession.metadata) {
    updatedSession.metadata = {};
  }
  updatedSession.metadata.lead_capture_debug = {
    detection,
    mergedFields,
    missingFields,
    status,
    timestamp: new Date().toISOString(),
    persisted: shouldPersist,
  };

  return updatedSession;
}
