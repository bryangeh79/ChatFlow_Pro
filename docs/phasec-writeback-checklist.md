# Phase C 数据回写核对清单

| action | DB tables / fields | API/page read points |
|---|---|---|
| conversation assign | `conversation_assignments(action_type='assign', state)`, `conversations.current_owner_principal_id`, `tenant_activity_events(event_type='conversation_assigned')` | `GET /conversations/:id`, `GET /activity`, Inbox owner列 |
| conversation handoff | `conversation_assignments(action_type='handoff', state)`, `conversations.current_owner_principal_id`, `tenant_activity_events(event_type='conversation_handoff', from_owner_id,to_owner_id)` | `GET /conversations/:id`, `GET /activity`, Inbox owner列 |
| conversation resolve | `conversations.status='resolved'`, `conversations.resolved_at`, `tenant_activity_events(event_type='conversation_resolved')` | `GET /conversations/:id`, Inbox状态 |
| conversation reopen | `conversations.status='open'`, `conversations.resolved_at=NULL`, `tenant_activity_events(event_type='conversation_reopened')` | `GET /conversations/:id`, Inbox状态 |
| convert to lead | `leads(conversation_id,owner_principal_id,status='new',converted_at)`, `lead_events(event_type='lead_converted')`, `tenant_activity_events(event_type='lead_converted')` | `POST /convert-to-lead` 返回 lead, `GET /leads`, `GET /leads/:id` |
| lead owner change | `leads.owner_principal_id`, `lead_events(event_type='lead_owner_changed')`, `tenant_activity_events(event_type='lead_owner_changed')` | `GET /leads/:id` (lead + events), Leads owner列 |
| lead status change | `leads.status`, `lead_events(event_type='lead_status_changed', from_status,to_status)`, `tenant_activity_events(event_type='lead_status_changed')` | `GET /leads/:id`, Leads status列 |
| reports summary source | `conversations(created_at,updated_at,resolved_at,status,channel,current_owner_principal_id)`, `leads(created_at,status)`, `conversation_assignments(assigned_at,action_type)` | `GET /reports/summary?range=today|last7d|all_time`, Reports cards + breakdown |
