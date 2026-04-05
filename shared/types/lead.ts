export interface Lead {
  id: string;
  conversationId?: string;
  visitorId?: string;
  name?: string;
  phone?: string;
  email?: string;
  companyName?: string;
  region?: string;
  needSummary?: string;
  languageCode?: 'zh' | 'en' | 'vi' | 'ms-MY';
}
