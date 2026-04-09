import { logStateCasConflict } from '../observability/state-cas-log';
import { getSaasDbAdapter } from './db-adapter';
import type { UnifiedSessionContext } from '../../shared/types/unified-session-context';

export interface TenantSessionStateRow {
  tenant_id: string;
  session_id: string;
  channel: UnifiedSessionContext['channel'];
  external_user_id: string;
  external_session_id: string;
  state: UnifiedSessionContext;
  version: number;
  updated_at: string;
  expires_at: string | null;
}

export type UpsertTenantSessionStateResult =
  | { ok: true; version: number }
  | { ok: false; reason: 'cas_conflict' };

function toIsoNow(): string {
  return new Date().toISOString();
}

function parseStateJson(raw: unknown): UnifiedSessionContext | null {
  if (typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw) as UnifiedSessionContext;
  } catch {
    return null;
  }
}

export async function getTenantSessionState(
  tenantId: string,
  sessionId: string,
): Promise<TenantSessionStateRow | null> {
  const adapter = await getSaasDbAdapter();
  const row = await adapter.queryOne(
    `SELECT tenant_id, session_id, channel, external_user_id, external_session_id, state_json, version, updated_at, expires_at
       FROM tenant_session_state
      WHERE tenant_id = ? AND session_id = ?`,
    [tenantId, sessionId],
  );
  if (!row) return null;
  const parsed = parseStateJson(row.state_json);
  if (!parsed) return null;
  return {
    tenant_id: String(row.tenant_id),
    session_id: String(row.session_id),
    channel: String(row.channel) as UnifiedSessionContext['channel'],
    external_user_id: String(row.external_user_id),
    external_session_id: String(row.external_session_id),
    state: parsed,
    version: Number(row.version ?? 0),
    updated_at: String(row.updated_at ?? toIsoNow()),
    expires_at: row.expires_at ? String(row.expires_at) : null,
  };
}

export async function upsertTenantSessionStateWithCas(input: {
  tenant_id: string;
  session: UnifiedSessionContext;
  expected_version: number | null;
  expires_at?: string | null;
}): Promise<UpsertTenantSessionStateResult> {
  const adapter = await getSaasDbAdapter();
  const now = toIsoNow();
  const payload = JSON.stringify(input.session);
  const expiresAt = input.expires_at ?? null;
  const sessionId = input.session.session_id;

  if (input.expected_version === null) {
    const inserted = await adapter.queryOne(
      `INSERT INTO tenant_session_state (
         tenant_id, session_id, channel, external_user_id, external_session_id, state_json, version, updated_at, expires_at
       ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
       ON CONFLICT (tenant_id, session_id)
       DO NOTHING
       RETURNING version`,
      [
        input.tenant_id,
        sessionId,
        input.session.channel,
        input.session.external_user_id,
        input.session.external_session_id,
        payload,
        now,
        expiresAt,
      ],
    );
    if (!inserted) {
      logStateCasConflict({
        layer: 'session_state',
        tenant_id: input.tenant_id,
        session_id: sessionId,
        channel: input.session.channel,
      });
      return { ok: false, reason: 'cas_conflict' };
    }
    return { ok: true, version: Number(inserted.version ?? 1) };
  }

  const updated = await adapter.queryOne(
    `UPDATE tenant_session_state
        SET state_json = ?,
            channel = ?,
            external_user_id = ?,
            external_session_id = ?,
            version = version + 1,
            updated_at = ?,
            expires_at = ?
      WHERE tenant_id = ?
        AND session_id = ?
        AND version = ?
      RETURNING version`,
    [
      payload,
      input.session.channel,
      input.session.external_user_id,
      input.session.external_session_id,
      now,
      expiresAt,
      input.tenant_id,
      sessionId,
      input.expected_version,
    ],
  );
  if (!updated) {
    logStateCasConflict({
      layer: 'session_state',
      tenant_id: input.tenant_id,
      session_id: sessionId,
      channel: input.session.channel,
    });
    return { ok: false, reason: 'cas_conflict' };
  }
  return { ok: true, version: Number(updated.version ?? input.expected_version + 1) };
}
