import type { UnifiedSessionContext } from '../../../shared/types/unified-session-context';
import type { UnifiedInboundMessage } from '../../../shared/types/unified-inbound-message';
import * as path from 'path';
import { scheduleLeadCaptureNotify } from './notify-outbound';
import type { CapturedLeadRecord } from './captured-lead-record';
import { appendJsonlRecord } from '../../shared/jsonl-persistence';
import {
  buildLeadCapturedIdempotencyKey,
  LEAD_CAPTURED_EVENT_TYPE,
} from '../../shared/outbound-idempotency';

export type { CapturedLeadRecord } from './captured-lead-record';

/**
 * 追加 captured lead 记录到 JSONL 文件
 * 失败时静默处理，不影响主流程
 */
export function appendCapturedLeadRecord(
  session: UnifiedSessionContext,
  message: UnifiedInboundMessage,
  traceContext?: { request_id?: string; message_trace_id?: string },
  opts?: { httpNotifyEnabled?: boolean },
): void {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    const filePath = path.join(dataDir, 'local-captured-leads.jsonl');
    
    const record: CapturedLeadRecord = {
      event_type: LEAD_CAPTURED_EVENT_TYPE,
      session_id: session.session_id,
      channel: session.channel,
      collected_fields: session.lead_capture_state.collected_fields || {},
      completed_at: session.lead_capture_state.completed_at || new Date().toISOString(),
      message_id: message.message_id,
      captured_at: new Date().toISOString(),
      request_id: traceContext?.request_id || undefined,
      message_trace_id: traceContext?.message_trace_id || undefined,
      idempotency_key: buildLeadCapturedIdempotencyKey({
        sessionId: session.session_id,
        requestId: traceContext?.request_id,
        messageId: message.message_id,
      }),
    };

    // 使用共享的 JSONL 持久化工具
    appendJsonlRecord(filePath, record);

    const allowHttpNotify = opts?.httpNotifyEnabled !== false;
    if (allowHttpNotify) {
      scheduleLeadCaptureNotify(record);
    } else {
      console.debug(
        '[saas-control]',
        JSON.stringify({ phase: '22b', lead_notify_http_skipped: true, reason: 'tenant_settings.notify.enabled_false' }),
      );
    }

    // 可选：记录成功（仅开发调试）
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[LeadCapture] Record appended: ${session.session_id}`);
    }
  } catch (error) {
    // 静默失败，不影响 webhook 响应
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[LeadCapture] Failed to append record: ${errorMessage}`);
  }
}