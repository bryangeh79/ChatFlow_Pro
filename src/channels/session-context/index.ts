import type { UnifiedInboundMessage } from '../../../shared/types/unified-inbound-message';
import type { UnifiedSessionContext } from '../../../shared/types/unified-session-context';
import { sessionStore } from './in-memory-store';

export function createOrUpdateSessionContext(
  message: UnifiedInboundMessage,
): UnifiedSessionContext {
  const sessionId = `${message.channel}:${message.external_user_id}:${message.external_session_id}`;
  
  // 尝试从存储中获取现有 session
  const existing = sessionStore.get(sessionId);
  
  if (existing) {
    // 更新现有 session
    const updated: UnifiedSessionContext = {
      ...existing,
      last_seen_at: message.timestamp,
      ...(message.language && { current_language: message.language }),
    };
    return updated;
  }
  
  // 创建新 session
  const newSession: UnifiedSessionContext = {
    session_id: sessionId,
    channel: message.channel,
    external_user_id: message.external_user_id,
    external_session_id: message.external_session_id,
    current_language: message.language ?? null,
    first_seen_at: message.timestamp,
    last_seen_at: message.timestamp,
    lead_capture_state: { status: 'none' },
    handoff_state: { enabled: true, status: 'none' },
  };
  
  return newSession;
}

/**
 * 提交 session 到存储（必须在 pipeline 后调用）
 */
export function commitSessionContext(session: UnifiedSessionContext): void {
  sessionStore.set(session);
}
