export interface HandoffAssignmentRecord extends Record<string, unknown> {
  ts_iso: string;
  session_id: string;
  channel: string;
  assigned_owner_id: string;
  assign_mode: string;
  assign_reason: string;
  request_id?: string;
  tag_hits?: string[];
  online_agents_count?: number;
  assignment_log_id?: string;
  // Optional SLA timestamps (Phase 19 / 包 2)
  first_pending_at?: string;
  assigned_at?: string;
}