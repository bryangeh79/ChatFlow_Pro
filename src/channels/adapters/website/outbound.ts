import type { UnifiedResponse } from '../../../../shared/types/unified-response';

export function mapWebsiteOutboundPayload(response: UnifiedResponse): Record<string, unknown> {
  return {
    kind: response.kind,
    text: response.reply_text ?? null,
    attachments: response.attachments ?? [],
    system_message: response.system_message ?? null,
    handoff_required: response.handoff_required ?? false,
    lead_capture_prompt: response.lead_capture_prompt ?? null,
  };
}
