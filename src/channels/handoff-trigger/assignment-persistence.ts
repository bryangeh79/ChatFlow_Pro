/**
 * Handoff assignment persistence (JSONL)
 */

import * as path from 'path';
import type { HandoffAssignmentRecord } from './assignment-record';
import { appendJsonlRecord } from '../../shared/jsonl-persistence';
import {
  buildHandoffAssignmentIdempotencyKey,
  HANDOFF_ASSIGNMENT_LOGGED_EVENT_TYPE,
} from '../../shared/outbound-idempotency';

/**
 * Generate a short assignment log ID
 * Format: ts_hash-session_hash (e.g., "abc123-def456")
 */
function generateAssignmentLogId(sessionId: string): string {
  const timestamp = Date.now().toString(36);
  const sessionHash = simpleStringHash(sessionId).toString(36);
  return `${timestamp.slice(-6)}-${sessionHash.slice(-6)}`;
}

/**
 * Simple string hash function
 */
function simpleStringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Append handoff assignment record to JSONL file
 * Only appends when it's a new assignment (assign_reason !== 'none')
 * Idempotent: won't duplicate records for same session
 * @returns `assignment_log_id` when a row was appended; otherwise `undefined`
 */
export function appendHandoffAssignmentRecord(
  sessionId: string,
  channel: string,
  assignedOwnerId: string | null,
  assignMode: string,
  assignReason: string,
  requestId?: string,
  tagHits?: string[],
  onlineAgentsCount?: number,
): string | undefined {
  try {
    // Only log actual assignments, not "none" reasons
    if (assignReason === 'none' || !assignedOwnerId) {
      return undefined;
    }
    
    const dataDir = path.join(process.cwd(), 'data');
    const filePath = path.join(dataDir, 'handoff-assignments.jsonl');

    const assignmentLogId = generateAssignmentLogId(sessionId);
    const record: HandoffAssignmentRecord = {
      event_type: HANDOFF_ASSIGNMENT_LOGGED_EVENT_TYPE,
      ts_iso: new Date().toISOString(),
      session_id: sessionId,
      channel,
      assigned_owner_id: assignedOwnerId,
      assign_mode: assignMode,
      assign_reason: assignReason,
      request_id: requestId || undefined,
      tag_hits: tagHits?.length ? tagHits : undefined,
      online_agents_count: onlineAgentsCount,
      assignment_log_id: assignmentLogId,
      idempotency_key: buildHandoffAssignmentIdempotencyKey(assignmentLogId),
    };

    // Use shared JSONL persistence utility
    appendJsonlRecord(filePath, record);

    // Optional: log success (development only)
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[HandoffAssignment] Record appended: ${sessionId} -> ${assignedOwnerId}`);
    }
    return assignmentLogId;
  } catch (error) {
    // Silent failure, doesn't affect main flow
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[HandoffAssignment] Failed to append record: ${errorMessage}`);
    return undefined;
  }
}