import type { UnifiedResponse } from '../../../shared/types/unified-response';

export interface ChannelOutboundPayload {
  channel: 'website' | 'telegram' | 'whatsapp' | 'messenger' | 'line' | 'zalo';
  session_id: string;
  payload: Record<string, unknown>;
}

export function mapUnifiedResponseToOutboundPayload(response: UnifiedResponse): ChannelOutboundPayload {
  return {
    channel: response.channel,
    session_id: response.session_id,
    payload: {
      kind: response.kind,
      reply_text: response.reply_text ?? null,
      attachments: response.attachments ?? [],
      system_message: response.system_message ?? null,
      handoff_required: response.handoff_required ?? false,
      lead_capture_prompt: response.lead_capture_prompt ?? null,
    },
  };
}
