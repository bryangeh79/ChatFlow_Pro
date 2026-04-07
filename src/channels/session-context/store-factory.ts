import type { SessionStore } from './store-types';
import { InMemorySessionStore } from './in-memory-store';

let singleton: SessionStore | null = null;

/** Process-wide session store; default is in-memory singleton (3B). */
export function getSessionStore(): SessionStore {
  if (!singleton) {
    singleton = new InMemorySessionStore();
  }
  return singleton;
}
