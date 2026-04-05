import type { Assignment } from '../../../../../shared/types/assignment';
import type { Conversation } from '../../../../../shared/types/conversation';

export function assignConversation(conversation: Conversation, ownerMemberId: string, assignedBy?: string): {
  conversation: Conversation;
  assignment: Assignment;
} {
  const assignment: Assignment = {
    conversationId: conversation.id,
    ownerMemberId,
    assignedBy,
    assignedAt: new Date().toISOString(),
  };

  return {
    conversation: {
      ...conversation,
      ownerMemberId,
      assignedMemberId: ownerMemberId,
      assignmentStatus: conversation.assignmentStatus === 'assigned' ? 'reassigned' : 'assigned',
      handoffStatus: conversation.handoffStatus ?? 'none',
    },
    assignment,
  };
}
