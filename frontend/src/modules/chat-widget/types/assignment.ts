export interface ChatWidgetAssignmentState {
  conversationId: string;
  ownerMemberId?: string;
  assignmentStatus: 'unassigned' | 'assigned';
}
