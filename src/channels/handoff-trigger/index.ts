import type { UnifiedInboundMessage } from '../../../shared/types/unified-inbound-message';
import type { UnifiedSessionContext } from '../../../shared/types/unified-session-context';
import { containsHandoffKeyword } from '../../config/handoff';
import { determineOwnerAssignment } from './assign';

export function shouldTriggerHandoff(
  message: UnifiedInboundMessage,
  session: UnifiedSessionContext,
): boolean {
  if (!session.handoff_state.enabled) {
    return false;
  }
  // 1. Explicit handoff flag from message
  if (message.handoff_flag) {
    return true;
  }
  
  // 2. Session already in pending handoff state
  if (session.handoff_state.status === 'pending') {
    return true;
  }
  
  // 3. Keyword detection (only if session is in 'none' state)
  if (session.handoff_state.status === 'none' && message.text) {
    return containsHandoffKeyword(message.text);
  }
  
  return false;
}

/**
 * Update session handoff state if triggered by keyword.
 * Returns updated session (immutable update).
 */
export function updateHandoffStateIfTriggered(
  message: UnifiedInboundMessage,
  session: UnifiedSessionContext,
): UnifiedSessionContext {
  if (!session.handoff_state.enabled) {
    return session;
  }
  // Only trigger if session is in 'none' state and message has text
  if (session.handoff_state.status !== 'none' || !message.text) {
    return session;
  }
  
  // Check for keyword trigger
  if (containsHandoffKeyword(message.text)) {
    const assignment = determineOwnerAssignment({
      ...session,
      handoff_state: {
        ...session.handoff_state,
        status: 'pending', // Temporarily set to pending for assignment logic
      },
    });
    
    return {
      ...session,
      handoff_state: {
        ...session.handoff_state,
        status: 'pending',
        reason: 'keyword',
        triggered_at: new Date().toISOString(),
        assigned_owner_id: assignment.assigned_owner_id || session.handoff_state.assigned_owner_id,
      },
      current_owner_id: assignment.assigned_owner_id || session.current_owner_id,
    };
  }
  
  return session;
}
