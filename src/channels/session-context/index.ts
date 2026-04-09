import type { UnifiedInboundMessage } from '../../../shared/types/unified-inbound-message';
import type { UnifiedSessionContext } from '../../../shared/types/unified-session-context';
import { getTenantIdOrNull } from '../../saas/tenant-context';
import { getSaaSDbDriver } from '../../saas/db-adapter';
import { getTenantSessionState, upsertTenantSessionStateWithCas } from '../../saas/session-state-repository';
import { getSessionStore } from './store-factory';

export function namespacedSessionIdForMessage(message: UnifiedInboundMessage): string {
  const base = `${message.channel}:${message.external_user_id}:${message.external_session_id}`;
  const tid = getTenantIdOrNull();
  return tid ? `${tid}:${base}` : base;
}

const SESSION_STATE_VERSION_META_KEY = '__session_state_version';

function readSessionStateVersion(session: UnifiedSessionContext): number | null {
  const raw = session.metadata?.[SESSION_STATE_VERSION_META_KEY];
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

function writeSessionStateVersion(session: UnifiedSessionContext, version: number): void {
  session.metadata = {
    ...(session.metadata ?? {}),
    [SESSION_STATE_VERSION_META_KEY]: version,
  };
}

function makeNewSession(message: UnifiedInboundMessage): UnifiedSessionContext {
  const sessionId = namespacedSessionIdForMessage(message);
  return {
    session_id: sessionId,
    channel: message.channel,
    external_user_id: message.external_user_id,
    external_session_id: message.external_session_id,
    current_language: message.language ?? null,
    first_seen_at: message.timestamp,
    last_seen_at: message.timestamp,
    lead_capture_state: { status: 'none' },
    handoff_state: { enabled: true, status: 'none' },
  };
}

function applyTouch(
  session: UnifiedSessionContext,
  message: UnifiedInboundMessage,
): UnifiedSessionContext {
  return {
    ...session,
    last_seen_at: message.timestamp,
    ...(message.language && { current_language: message.language }),
  };
}

export async function createOrUpdateSessionContext(
  message: UnifiedInboundMessage,
): Promise<UnifiedSessionContext> {
  const sessionId = namespacedSessionIdForMessage(message);
  const tenantId = getTenantIdOrNull();
  const dbDriver = getSaaSDbDriver();

  if (tenantId && dbDriver === 'postgres') {
    const row = await getTenantSessionState(tenantId, sessionId);
    if (row) {
      const touched = applyTouch(row.state, message);
      writeSessionStateVersion(touched, row.version);
      return touched;
    }
    return makeNewSession(message);
  }

  const store = getSessionStore();
  const existing = store.get(sessionId);
  if (existing) {
    return applyTouch(existing, message);
  }

  return makeNewSession(message);
}

/**
 * 提交 session 到存储（必须在 pipeline 后调用）
 */
export async function commitSessionContext(session: UnifiedSessionContext): Promise<void> {
  const tenantId = getTenantIdOrNull();
  const dbDriver = getSaaSDbDriver();

  if (tenantId && dbDriver === 'postgres') {
    const expectedVersion = readSessionStateVersion(session);
    const saved = await upsertTenantSessionStateWithCas({
      tenant_id: tenantId,
      session,
      expected_version: expectedVersion,
    });
    if (!saved.ok) {
      throw new Error('session_state_cas_conflict');
    }
    writeSessionStateVersion(session, saved.version);
    return;
  }

  getSessionStore().set(session);
}
