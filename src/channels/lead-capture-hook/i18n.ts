import type { UnifiedSessionContext } from '../../../shared/types/unified-session-context';

export interface LeadCaptureI18nStrings {
  partialPrompt: (missingFields: string[]) => string;
  capturedConfirmation: string;
}

const i18nMap: Record<string, LeadCaptureI18nStrings> = {
  // 中文
  'zh': {
    partialPrompt: (missingFields: string[]) => {
      const fieldsMap: Record<string, string> = {
        'name': '姓名',
        'phone': '电话',
        'email': '邮箱',
      };
      const translated = missingFields.map(f => fieldsMap[f] || f);
      return `请提供您的${translated.join('和')}以完成联系信息。`;
    },
    capturedConfirmation: '谢谢！您的联系信息已收到。',
  },
  
  // 英文
  'en': {
    partialPrompt: (missingFields: string[]) => {
      return `Please provide your ${missingFields.join(' and ')} to complete contact information.`;
    },
    capturedConfirmation: 'Thank you! Your contact information has been received.',
  },
  
  // 越南语
  'vi': {
    partialPrompt: (missingFields: string[]) => {
      const fieldsMap: Record<string, string> = {
        'name': 'tên',
        'phone': 'số điện thoại',
        'email': 'email',
      };
      const translated = missingFields.map(f => fieldsMap[f] || f);
      return `Vui lòng cung cấp ${translated.join(' và ')} của bạn để hoàn tất thông tin liên hệ.`;
    },
    capturedConfirmation: 'Cảm ơn! Thông tin liên hệ của bạn đã được nhận.',
  },
  
  // 马来语
  'ms-MY': {
    partialPrompt: (missingFields: string[]) => {
      const fieldsMap: Record<string, string> = {
        'name': 'nama',
        'phone': 'telefon',
        'email': 'emel',
      };
      const translated = missingFields.map(f => fieldsMap[f] || f);
      return `Sila berikan ${translated.join(' dan ')} anda untuk melengkapkan maklumat hubungan.`;
    },
    capturedConfirmation: 'Terima kasih! Maklumat hubungan anda telah diterima.',
  },
};

/**
 * 获取 lead capture 的 i18n 字符串
 * 未知语言回落英文
 */
export function getLeadCaptureI18n(session: UnifiedSessionContext): LeadCaptureI18nStrings {
  const lang = session.current_language || 'en';
  return i18nMap[lang] || i18nMap.en;
}

/**
 * 获取特定语言的 i18n 字符串（用于测试）
 */
export function getLeadCaptureI18nByLang(language: string): LeadCaptureI18nStrings {
  return i18nMap[language] || i18nMap.en;
}