# 2026-04-03 - FAQ Minimal Observability Evidence Note

- Minimal FAQ observability evidence points are now explicitly named.
- Matched evidence: debug_steps includes faq_hit, debug_metadata.faqResult shows matched=true plus answer/topic/confidence, session.recent_faq_hit.matched=true.
- No-match evidence: debug_steps includes faq_no_match, debug_metadata.faqResult shows matched=false plus null/0 values, session.recent_faq_hit.matched=false.
- Telegram and Website share the same evidence points.
- Webhook stability remains protected.