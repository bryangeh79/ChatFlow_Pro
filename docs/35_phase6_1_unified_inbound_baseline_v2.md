# Phase 6.1 Unified Inbound Baseline v2

## Scope
- Website
- Telegram
- WhatsApp
- Facebook Messenger
- Line
- Zalo
- WeChat reserved as a future extension slot only

## Unified Inbound Message Standard
- channel
- external_user_id
- external_session_id
- message_id
- message_type
- timestamp
- text
- attachments
- language
- user_profile_snapshot
- lead_capture_state
- handoff_flag
- raw_payload

## Unified Session Context Standard
- session_id
- channel
- external_user_id
- external_session_id
- current_language
- language_history
- first_seen_at
- last_seen_at
- user_profile_snapshot
- lead_capture_state
- handoff_state
- current_owner_id
- current_assignee_id
- conversation_summary
- recent_faq_hit
- state_flags
- metadata

## Field Responsibility Boundary
- Adapter: raw event intake, identity extraction, raw payload retention, unified message creation
- Normalization: field mapping, type shaping, attachment shaping, message type shaping
- Core pipeline: welcome, reply logic, FAQ/KB, lead capture, handoff decision, response output
- Session context: language, user identity, capture state, handoff state, ownership, summary
- Handoff: trigger and state transition only
- Lead capture: capture state progression only

## Prohibited Items
- No business logic inside adapters
- No channel-private fields in core models
- No separate message models per channel
- No session context pollution from display-layer structures
- No lead capture and handoff state mixing
- No real SDK integration in Phase 6.1/6.2 skeleton work
- No webhook deployment in Phase 6.1/6.2 skeleton work
- No database migration in Phase 6.1/6.2 skeleton work

## Minimal Adapter Principle
- One adapter shape per channel
- Normalize before core processing
- Preserve raw payload
- Keep business decisions out of adapters
- Keep channel-specific differences at the edge
