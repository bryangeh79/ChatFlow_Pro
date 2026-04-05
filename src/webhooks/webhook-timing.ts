/** Optional slice timings attached to webhook JSON responses and HTTP access logs (Phase 16). */

export interface WebhookHandlerObservability {
  observability: {
    phases_ms: {
      prepare_ms: number;
      outbound_send_ms?: number;
    };
  };
}

export function webhookObservabilityPhases(prepare_ms: number, outbound_send_ms?: number): WebhookHandlerObservability {
  const phases_ms: { prepare_ms: number; outbound_send_ms?: number } = { prepare_ms };
  if (outbound_send_ms !== undefined) {
    phases_ms.outbound_send_ms = outbound_send_ms;
  }
  return { observability: { phases_ms } };
}
