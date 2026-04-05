export interface FaqItem {
  id: string;
  languageCode: 'zh' | 'en' | 'vi' | 'ms-MY';
  question: string;
  answer: string;
  keywords: string[];
  tags: string[];
  isActive: boolean;
}
