import type { UnifiedInboundMessage } from '../../../shared/types/unified-inbound-message';

export interface ContactIntentDetection {
  hasExplicitContactIntent: boolean;
  detectedFields: {
    name?: string;
    phone?: string;
    email?: string;
  };
}

/**
 * 最小邮箱验证
 * 要求：包含 @ 符号，@ 后有域名且包含点号
 */
function isValidEmail(email: string): boolean {
  if (!email.includes('@')) return false;
  
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  
  const domain = parts[1];
  if (!domain.includes('.')) return false;
  
  // 基本格式检查：域名部分至少有一个点，点前后都有字符
  const domainParts = domain.split('.');
  if (domainParts.length < 2) return false;
  
  for (const part of domainParts) {
    if (part.length === 0) return false;
  }
  
  return true;
}

/**
 * 最小电话验证
 * 要求：仅包含数字和常见分隔符（空格、-、+、()），去除分隔符后长度至少8位
 */
function isValidPhone(phone: string): boolean {
  // 允许的字符：数字、空格、横线、加号、括号
  const allowedChars = /^[\d\s\-+()]+$/;
  if (!allowedChars.test(phone)) return false;
  
  // 移除所有非数字字符
  const digitsOnly = phone.replace(/[^\d]/g, '');
  
  // 长度检查：至少8位（考虑国际号码和固定电话）
  if (digitsOnly.length < 8) return false;
  
  // 中国手机号检查：以1开头，第二位3-9，总共11位
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1') && /^[3-9]$/.test(digitsOnly[1])) {
    return true;
  }
  
  // 固定电话：区号+号码，总长度8-12位
  if (digitsOnly.length >= 8 && digitsOnly.length <= 12) {
    return true;
  }
  
  // 国际号码：以+或00开头，长度10-15位
  if ((phone.startsWith('+') || phone.startsWith('00')) && digitsOnly.length >= 10 && digitsOnly.length <= 15) {
    return true;
  }
  
  return false;
}

/**
 * 检测消息中是否包含显式联系意图
 */
export function detectContactIntent(message: UnifiedInboundMessage): ContactIntentDetection {
  const text = message.text?.toLowerCase() || '';
  
  // 显式联系意图关键词
  const contactIntentKeywords = [
    // 中文
    '联系', '联系销售', '联系客服', '联系你们', '想联系', '要联系',
    '打电话', '给我打电话', '电话联系', '来电',
    '发邮件', '发电子邮件', '邮件联系', '邮箱联系',
    '销售', '销售代表', '销售顾问',
    '客服', '客户服务', '客户支持',
    '咨询', '咨询一下', '想咨询',
    '报价', '获取报价', '询价',
    '合作', '想合作', '洽谈',
    '购买', '想购买', '要购买',
    // 英文
    'contact', 'contact sales', 'contact us', 'get in touch',
    'call', 'call me', 'phone', 'phone call',
    'email', 'send email', 'email me',
    'sales', 'sales rep', 'sales representative',
    'support', 'customer support', 'customer service',
    'consult', 'consultation', 'inquiry',
    'quote', 'get a quote', 'pricing',
    'cooperate', 'collaborate', 'partnership',
    'buy', 'purchase', 'order'
  ];

  const hasExplicitContactIntent = contactIntentKeywords.some(keyword => 
    text.includes(keyword.toLowerCase())
  );

  // 简单字段检测（最小实现）
  const detectedFields = {
    name: extractName(text),
    phone: extractPhone(text),
    email: extractEmail(text),
  };

  return {
    hasExplicitContactIntent,
    detectedFields,
  };
}

/**
 * 简单姓名提取（最小实现）
 */
function extractName(text: string): string | undefined {
  // 简单模式：包含"我叫"、"姓名"、"名字"等
  const namePatterns = [
    /我叫\s*([^,.!?，。！？]+?)(?=[,.!?，。！？]|\s*(电话|邮箱|email|phone)|$)/i,
    /姓名[：:]\s*([^,.!?，。！？]+?)(?=[,.!?，。！？]|\s*(电话|邮箱|email|phone)|$)/i,
    /名字[：:]\s*([^,.!?，。！？]+?)(?=[,.!?，。！？]|\s*(电话|邮箱|email|phone)|$)/i,
    /name[：:]\s*([^,.!?，。！？]+?)(?=[,.!?，。！？]|\s*(电话|邮箱|email|phone)|$)/i,
    /my name is\s*([^,.!?，。！？]+?)(?=[,.!?，。！？]|\s*(电话|邮箱|email|phone)|$)/i,
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return undefined;
}

/**
 * 简单电话提取（最小实现）
 */
function extractPhone(text: string): string | undefined {
  // 匹配常见的电话号码格式
  const phonePatterns = [
    /电话[：:]\s*([^,.!?，。！？]+?)(?=[,.!?，。！？]|\s*(邮箱|email|名字|name)|$)/i,
    /phone[：:]\s*([^,.!?，。！？]+?)(?=[,.!?，。！？]|\s*(邮箱|email|名字|name)|$)/i,
    /tel[：:]\s*([^,.!?，。！？]+?)(?=[,.!?，。！？]|\s*(邮箱|email|名字|name)|$)/i,
    // 直接匹配电话号码（中国手机号）
    /1[3-9]\d{9}/,
    // 匹配带区号的固定电话
    /0\d{2,3}[- ]?\d{7,8}/,
  ];

  for (const pattern of phonePatterns) {
    const match = text.match(pattern);
    if (match) {
      const rawPhone = match[1] ? match[1].trim() : match[0].trim();
      if (rawPhone && isValidPhone(rawPhone)) {
        // 返回清理后的版本（保留格式供显示，但存储时可能进一步处理）
        return rawPhone;
      }
    }
  }
  return undefined;
}

/**
 * 简单邮箱提取（最小实现）
 */
function extractEmail(text: string): string | undefined {
  // 简单的邮箱正则
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const match = text.match(emailPattern);
  if (match) {
    const email = match[0].trim();
    if (isValidEmail(email)) {
      return email;
    }
  }
  return undefined;
}