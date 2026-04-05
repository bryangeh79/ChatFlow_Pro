export type ConversationSession = {
  id: string;
  channel: 'website';
  language: 'zh' | 'en' | 'vi' | 'ms-MY';
  status: 'open' | 'pending' | 'closed';
  ownerMemberId?: string;
  handoffStatus?: 'none' | 'pending' | 'active' | 'completed';
  assignmentStatus?: 'unassigned' | 'assigned' | 'reassigned';
  createdAt: string;
  updatedAt: string;
};

export function initSession(existingConversationId?: string): ConversationSession {
  const now = new Date().toISOString();
  return {
    id: existingConversationId ?? `conv_${Date.now()}`,
    channel: 'website',
    language: 'en',
    status: 'open',
    ownerMemberId: undefined,
    handoffStatus: 'none',
    assignmentStatus: 'unassigned',
    createdAt: now,
    updatedAt: now,
  };
}
