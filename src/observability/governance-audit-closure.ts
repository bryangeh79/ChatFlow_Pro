/**
 * Phase D-C2B3 — mirror governance DB audit rows to D-C1 structured runtime log (opt-in, fingerprint-only detail).
 * DB remains source of truth; structured log is cross-check / SIEM-friendly stream.
 */

import { writeStructuredLog } from './structured-log';

export const GOVERNANCE_AUDIT_CLOSURE_SCHEMA_VERSION = 'd-c2b3-v1';

/** DB `tenant_credential_rotation_events` + optional structured log line. */
export function logGovernanceCredentialRotationClosed(input: {
  rotation_event_id: string;
  tenant_id: string;
  credential_key: string;
  actor_source: string;
  rotation_reason: string;
  outcome: string;
  prev_plaintext_fp: string;
  new_plaintext_fp: string;
  prev_blob_fp: string;
  new_blob_fp: string;
}): void {
  writeStructuredLog({
    type: 'governance_audit',
    phase: 'security',
    outcome: input.outcome === 'success' ? 'ok' : input.outcome,
    code: 'credential_rotation',
    governance_closure_version: GOVERNANCE_AUDIT_CLOSURE_SCHEMA_VERSION,
    governance_category: 'credential_rotation',
    governance_action: 'rotation_success',
    tenant_id: input.tenant_id,
    rotation_event_id: input.rotation_event_id,
    /** Logical key id (e.g. OPENAI_API_KEY); name avoids `credential_*` keys that D-C1 redaction would blank. */
    rotation_key_name: input.credential_key,
    actor_source: input.actor_source,
    rotation_reason: input.rotation_reason,
    detail: {
      prev_plaintext_fp: input.prev_plaintext_fp,
      new_plaintext_fp: input.new_plaintext_fp,
      prev_blob_fp: input.prev_blob_fp,
      new_blob_fp: input.new_blob_fp,
    },
  });
}

/** DB `break_glass_audit_events` + optional structured log line. */
export function logGovernanceBreakGlassClosed(input: {
  break_glass_audit_id: string;
  action: string;
  expires_at_iso?: string | null;
  request_id?: string | null;
}): void {
  const denied =
    input.action === 'break_glass_ttl_denied_expired' ||
    input.action === 'break_glass_ttl_denied_misconfigured';
  writeStructuredLog({
    type: 'governance_audit',
    phase: 'security',
    outcome: denied ? 'denied' : 'ok',
    code: input.action,
    governance_closure_version: GOVERNANCE_AUDIT_CLOSURE_SCHEMA_VERSION,
    governance_category: 'break_glass_ttl',
    governance_action: input.action,
    break_glass_audit_id: input.break_glass_audit_id,
    request_id: input.request_id ?? null,
    detail: {
      expires_at_iso: input.expires_at_iso ?? null,
    },
  });
}
