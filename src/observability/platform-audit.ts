/**
 * Phase D-C1 — append-only platform audit JSONL (under data/, gitignored).
 * Opt-in: CHATFLOW_PLATFORM_AUDIT_LOG=true|1
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { redactForLog } from './structured-log';

export function isPlatformAuditLogEnabled(): boolean {
  const v = process.env.CHATFLOW_PLATFORM_AUDIT_LOG?.trim().toLowerCase();
  return v === '1' || v === 'true';
}

export interface PlatformAuditEventInput {
  action: string;
  actor_type: 'system' | 'operator' | 'unknown';
  resource?: string | null;
  tenant_id?: string | null;
  request_id?: string | null;
  detail?: Record<string, unknown> | null;
}

function auditFilePath(): string {
  return path.join(process.cwd(), 'data', 'platform-audit-events.jsonl');
}

export function appendPlatformAuditEvent(input: PlatformAuditEventInput): void {
  if (!isPlatformAuditLogEnabled()) return;
  const row = {
    ts: new Date().toISOString(),
    type: 'platform_audit',
    service: 'chatflow-pro',
    action: input.action,
    actor_type: input.actor_type,
    resource: input.resource ?? null,
    tenant_id: input.tenant_id ?? null,
    request_id: input.request_id ?? null,
    detail: input.detail ? (redactForLog(input.detail) as Record<string, unknown>) : null,
  };
  const line = `${JSON.stringify(row)}\n`;
  const dir = path.dirname(auditFilePath());
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(auditFilePath(), line, 'utf8');
  } catch {
    // eslint-disable-next-line no-console
    console.error('[platform-audit] append failed (disk?)');
  }
}
