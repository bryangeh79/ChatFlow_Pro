export interface Handoff {
  conversationId: string;
  requestedBy: 'visitor' | 'system';
  triggerType: 'user_request' | 'system_rule';
  status: 'pending' | 'active' | 'completed';
  createdAt: string;
}
