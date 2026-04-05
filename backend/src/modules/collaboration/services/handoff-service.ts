import type { Handoff } from '../../../../../shared/types/handoff';
import type { Conversation } from '../../../../../shared/types/conversation';
import { buildHandoffSummary } from './handoff-summary-service';

export function requestHandoff(conversation: Conversation, requestedBy: 'visitor' | 'system', triggerType: 'user_request' | 'system_rule'):{
  conversation: Conversation;
  handoff: Handoff;
  summary: ReturnType<typeof buildHandoffSummary>;
} {
  const handoff: Handoff = {
    conversationId: conversation.id,
    requestedBy,
    triggerType,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  const summary = buildHandoffSummary({
    conversationId: conversation.id,
    languageCode: conversation.languageCode,
    channel: conversation.channel,
    latestMessages: [],
    currentOwnerMemberId: conversation.ownerMemberId,
    fallbackOccurred: false,
  });

  return {
    conversation: {
      ...conversation,
      handoffStatus: 'pending',
      status: 'pending',
    },
    handoff,
    summary,
  };
}
