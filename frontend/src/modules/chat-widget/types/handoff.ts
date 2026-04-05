export interface ChatWidgetHandoffState {
  conversationId: string;
  status: 'none' | 'pending' | 'active' | 'completed';
}
