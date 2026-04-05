export type ConversationStatus = 'open' | 'pending' | 'closed';

export interface Conversation {
  id: string;
  channel: 'website' | 'telegram' | 'whatsapp' | 'facebook-messenger';
  languageCode: 'zh' | 'en' | 'vi' | 'ms-MY';
  status: ConversationStatus;
  visitorId?: string;
  assignedMemberId?: string;
  ownerMemberId?: string;
  handoffStatus?: 'none' | 'pending' | 'active' | 'completed';
  assignmentStatus?: 'unassigned' | 'assigned';
  createdAt?: string;
  updatedAt?: string;
}
