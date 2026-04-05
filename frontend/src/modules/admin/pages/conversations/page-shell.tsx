import { mockConversations } from '../../mock/conversations';

export function ConversationsPageShell() {
  return {
    title: 'Conversations',
    rows: mockConversations,
  };
}
