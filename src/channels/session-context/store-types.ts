import type { UnifiedSessionContext } from '../../../shared/types/unified-session-context';

/** Backend discriminator; `external_stub` reserved for future wired stores (3C+). */
export type SessionStoreKind = 'in_memory' | 'external_stub';

/** Optional hints for external backends; in-memory ignores (TTL fixed in implementation). */
export interface SessionStoreSetOptions {
  ttlMs?: number;
}

/**
 * Unified session persistence boundary (Phase 24 / 3B).
 * Key is always `session.session_id` (incl. tenant namespacing from callers).
 */
export interface SessionStore {
  readonly kind: SessionStoreKind;
  get(sessionId: string): UnifiedSessionContext | undefined;
  set(session: UnifiedSessionContext, options?: SessionStoreSetOptions): void;
  delete(sessionId: string): boolean;
  /** Best-effort expiry sweep; in-memory implements; optional for stubs. */
  cleanupExpired?(): void;
}
