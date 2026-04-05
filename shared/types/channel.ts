export type ChannelCode = 'website' | 'telegram' | 'whatsapp' | 'facebook-messenger' | 'line' | 'zalo';
export type UnifiedChannelCode = 'website' | 'telegram' | 'whatsapp' | 'messenger' | 'line' | 'zalo';

export interface ChannelInfo {
  code: ChannelCode;
  name: string;
  defaultLanguage?: 'zh' | 'en' | 'vi' | 'ms-MY';
}
