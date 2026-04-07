import { randomUUID } from 'node:crypto';
import type { SqlJsDatabase } from './db';

/** Phase 24 / 1I — principal control-plane audit (no token / hash payloads). */
export type PrincipalAuditAction =
  | 'created'
  | 'updated'
  | 'disabled'
  | 'enabled'
  | 'rotated'
  | 'deleted';

export interface PrincipalReplaceActorFields {
  actor_auth_source: string;
  actor_role: string;
  actor_scope_type: string;
  actor_tenant_slug: string | null;
}

export type PrincipalAuditTokenState = 'hash_at_rest' | 'legacy_plaintext_at_rest';

export interface PrincipalAuditLogRow {
  id: string;
  tenant_id: string;
  principal_role: string;
  action: PrincipalAuditAction;
  actor_auth_source: string;
  actor_role: string;
  actor_scope_type: string;
  actor_tenant_slug: string | null;
  target_display_name: string | null;
  target_is_enabled: boolean;
  token_state: PrincipalAuditTokenState;
  ts_iso: string;
}

export function insertPrincipalAuditLog(
  db: SqlJsDatabase,
  input: {
    tenant_id: string;
    principal_role: 'tenant_admin' | 'tenant_operator_readonly';
    action: PrincipalAuditAction;
    actor: PrincipalReplaceActorFields;
    target_display_name: string | null;
    target_is_enabled: boolean;
    token_state: PrincipalAuditTokenState;
    ts_iso: string;
  },
): void {
  const id = randomUUID();
  db.run(
    `INSERT INTO tenant_admin_principal_audit_logs (
       id, tenant_id, principal_role, action,
       actor_auth_source, actor_role, actor_scope_type, actor_tenant_slug,
       target_display_name, target_is_enabled, token_state, ts_iso
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.tenant_id,
      input.principal_role,
      input.action,
      input.actor.actor_auth_source,
      input.actor.actor_role,
      input.actor.actor_scope_type,
      input.actor.actor_tenant_slug,
      input.target_display_name,
      input.target_is_enabled ? 1 : 0,
      input.token_state,
      input.ts_iso,
    ],
  );
}
