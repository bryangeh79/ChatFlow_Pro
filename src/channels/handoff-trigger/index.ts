import type { UnifiedInboundMessage } from '../../../shared/types/unified-inbound-message';
import type { UnifiedSessionContext } from '../../../shared/types/unified-session-context';

export function shouldTriggerHandoff(
  message: UnifiedInboundMessage,
  session: UnifiedSessionContext,
): boolean {
  // TODO: add real trigger rules later
  return Boolean(message.handoff_flag || session.handoff_state.status === 'pending');
}
