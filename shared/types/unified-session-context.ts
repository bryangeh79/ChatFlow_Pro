export interface UnifiedSessionContext {
  session_id: string;
  channel: 'website' | 'telegram' | 'whatsapp' | 'messenger' | 'line' | 'zalo';
  external_user_id: string;
  external_session_id: string;
  current_language: 'zh' | 'en' | 'vi' | 'ms-MY' | null;
  language_history?: Array<'zh' | 'en' | 'vi' | 'ms-MY'>;
  first_seen_at: string;
  last_seen_at: string;
  user_profile_snapshot?: {
    display_name?: string;
    avatar_url?: string;
    phone?: string;
    username?: string;
    locale?: string;
    extra?: Record<string, unknown>;
  };
  lead_capture_state: {
    status: 'none' | 'partial' | 'captured';
    collected_fields?: Record<string, unknown>;
    missing_fields?: string[];
    completed_at?: string | null;
  };
  handoff_state: {
    enabled: boolean;
    status: 'none' | 'pending' | 'assigned' | 'completed';
    reason?: string | null;
    triggered_at?: string | null;
    assigned_owner_id?: string | null;
  };
  current_owner_id?: string | null;
  current_assignee_id?: string | null;
  conversation_summary?: string | null;
  recent_faq_hit?: {
    faq_id?: string;
    matched?: boolean;
    confidence?: number;
  };
  state_flags?: Record<string, boolean>;
  metadata?: Record<string, unknown>;
}
