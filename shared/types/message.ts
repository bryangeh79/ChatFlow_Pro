export type MessageSenderType = 'visitor' | 'system' | 'staff';

export interface Message {
  id: string;
  conversationId: string;
  senderType: MessageSenderType;
  content: string;
  languageCode: 'zh' | 'en' | 'vi' | 'ms-MY';
  channel: 'website' | 'telegram' | 'whatsapp' | 'facebook-messenger';
  createdAt?: string;
}
