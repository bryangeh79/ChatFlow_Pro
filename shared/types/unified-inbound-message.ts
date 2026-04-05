export type UnifiedChannelCode = 'website' | 'telegram' | 'whatsapp' | 'messenger' | 'line' | 'zalo';
export type UnifiedMessageType = 'text' | 'image' | 'file' | 'audio' | 'video' | 'event';

export interface UnifiedAttachment {
  type: string;
  url?: string;
  name?: string;
  mime_type?: string;
  size?: number;
}

export interface UnifiedInboundMessage {
  channel: UnifiedChannelCode;
  external_user_id: string;
  external_session_id: string;
  message_id: string;
  message_type: UnifiedMessageType;
  timestamp: string;
  text?: string | null;
  attachments?: UnifiedAttachment[];
  language?: 'zh' | 'en' | 'vi' | 'ms-MY' | null;
  user_profile_snapshot?: {
    display_name?: string;
    avatar_url?: string;
    phone?: string;
    username?: string;
    locale?: string;
    extra?: Record<string, unknown>;
  };
  lead_capture_state?: {
    status: 'none' | 'active' | 'collected' | 'blocked';
    data?: Record<string, unknown>;
  };
  handoff_flag?: boolean;
  raw_payload: Record<string, unknown>;
}
