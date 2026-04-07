import type { UnifiedSessionContext } from '../../../shared/types/unified-session-context';
import type { SessionStore, SessionStoreKind, SessionStoreSetOptions } from './store-types';

/**
 * 进程内 Session 存储（单例 Map）
 * 注意：重启丢失，单进程，不支持多实例
 */
export class InMemorySessionStore implements SessionStore {
  readonly kind: SessionStoreKind = 'in_memory';

  private sessions: Map<string, UnifiedSessionContext> = new Map();

  private readonly MAX_SESSIONS = 1000;
  private readonly SESSION_TTL_MS = 24 * 60 * 60 * 1000;

  get(sessionId: string): UnifiedSessionContext | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      if (this.isSessionExpired(session)) {
        this.sessions.delete(sessionId);
        return undefined;
      }
    }
    return session;
  }

  set(session: UnifiedSessionContext, _options?: SessionStoreSetOptions): void {
    this.cleanupExpiredSessions();

    if (this.sessions.size >= this.MAX_SESSIONS && !this.sessions.has(session.session_id)) {
      this.evictOldestSession();
    }

    this.sessions.set(session.session_id, session);
  }

  delete(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  cleanupExpired(): void {
    this.cleanupExpiredSessions();
  }

  private isSessionExpired(session: UnifiedSessionContext): boolean {
    const now = Date.now();
    const lastSeen = new Date(session.last_seen_at).getTime();
    return now - lastSeen > this.SESSION_TTL_MS;
  }

  private cleanupExpiredSessions(): void {
    const expiredKeys: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (this.isSessionExpired(session)) {
        expiredKeys.push(sessionId);
      }
    }

    for (const sessionId of expiredKeys) {
      this.sessions.delete(sessionId);
    }

    if (process.env.NODE_ENV === 'development' && expiredKeys.length > 0) {
      console.debug(`[SessionStore] Cleaned up ${expiredKeys.length} expired sessions`);
    }
  }

  private evictOldestSession(): void {
    const firstKey = this.sessions.keys().next().value;
    if (firstKey) {
      this.sessions.delete(firstKey);
    }
  }

  /** @internal debug / tests */
  size(): number {
    return this.sessions.size;
  }

  /** @internal debug / tests */
  getMaxSessions(): number {
    return this.MAX_SESSIONS;
  }

  /** @internal debug / tests */
  clear(): void {
    this.sessions.clear();
  }
}
