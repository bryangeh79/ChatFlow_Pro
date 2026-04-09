/**
 * Phase D-C1 — platform audit line for admin sensitive read-only API (no response body).
 * Opt-in: CHATFLOW_PLATFORM_AUDIT_LOG (see platform-audit.ts).
 */

import { appendPlatformAuditEvent } from './platform-audit';

export function auditAdminSensitiveRead(input: {
  route_key: string;
  tenant_id?: string | null;
  request_id?: string | null;
  principal_role?: string | null;
}): void {
  appendPlatformAuditEvent({
    action: 'admin.sensitive_read',
    actor_type: 'operator',
    resource: input.route_key,
    tenant_id: input.tenant_id ?? null,
    request_id: input.request_id ?? null,
    detail: {
      route_key: input.route_key,
      principal_role: input.principal_role ?? null,
    },
  });
}
