/**
 * Phase 24 / 3B — session store abstraction (default in-memory only).
 * Requires: npm run build
 */

import { readFileSync } from 'node:fs';
import { dirname, join as pathJoin } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = pathJoin(__dirname, '..');

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function minimalSession(overrides) {
  const ts = new Date().toISOString();
  return {
    session_id: 'verify-3b-sid',
    channel: 'website',
    external_user_id: 'u1',
    external_session_id: 'ext1',
    current_language: null,
    first_seen_at: ts,
    last_seen_at: ts,
    lead_capture_state: { status: 'none' },
    handoff_state: { enabled: true, status: 'none' },
    ...overrides,
  };
}

function minimalMessage(overrides) {
  return {
    channel: 'website',
    external_user_id: 'u-pipe',
    external_session_id: 's-pipe',
    message_id: 'm-pipe',
    message_type: 'text',
    timestamp: new Date().toISOString(),
    raw_payload: {},
    ...overrides,
  };
}

async function main() {
  const pkg = JSON.parse(readFileSync(pathJoin(root, 'package.json'), 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.optionalDependencies };
  if ('redis' in deps || 'ioredis' in deps) {
    fail('verify-session-store-abstraction: unexpected redis dependency');
  }

  const factoryPath = pathJoin(root, 'dist', 'src', 'channels', 'session-context', 'store-factory.js');
  const sessionCtxPath = pathJoin(root, 'dist', 'src', 'channels', 'session-context', 'index.js');

  const { getSessionStore } = await import(pathToFileURL(factoryPath).href);
  const sessionMod = await import(pathToFileURL(sessionCtxPath).href);

  const store = getSessionStore();
  if (store.kind !== 'in_memory') {
    fail(`expected store.kind in_memory, got ${store.kind}`);
  }
  if (getSessionStore() !== store) {
    fail('getSessionStore must return the same singleton');
  }

  const sid = 'verify-3b-roundtrip';
  const s0 = minimalSession({ session_id: sid });
  store.set(s0);
  const g0 = store.get(sid);
  if (!g0 || g0.session_id !== sid) {
    fail('get/set roundtrip failed');
  }
  if (!store.delete(sid)) {
    fail('delete expected true');
  }
  if (store.get(sid) !== undefined) {
    fail('after delete get should be undefined');
  }

  const oldTs = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
  const sidTtl = 'verify-3b-ttl';
  store.set(
    minimalSession({
      session_id: sidTtl,
      first_seen_at: oldTs,
      last_seen_at: oldTs,
    }),
  );
  if (store.get(sidTtl) !== undefined) {
    fail('TTL: expired session should not be returned on get');
  }

  const sidFresh = 'verify-3b-fresh';
  const sidStale = 'verify-3b-stale';
  const freshTs = new Date().toISOString();
  const staleTs = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
  store.set(minimalSession({ session_id: sidFresh, first_seen_at: freshTs, last_seen_at: freshTs }));
  store.set(minimalSession({ session_id: sidStale, first_seen_at: staleTs, last_seen_at: staleTs }));
  if (typeof store.cleanupExpired !== 'function') {
    fail('in-memory store should expose cleanupExpired');
  }
  store.cleanupExpired();
  if (store.get(sidStale) !== undefined) {
    fail('cleanupExpired should remove stale session');
  }
  if (store.get(sidFresh) === undefined) {
    fail('cleanupExpired should keep fresh session');
  }
  store.delete(sidFresh);

  const msg = minimalMessage({});
  const ctx = sessionMod.createOrUpdateSessionContext(msg);
  if (!ctx.session_id || !ctx.session_id.includes('website')) {
    fail('createOrUpdateSessionContext: unexpected session_id');
  }
  sessionMod.commitSessionContext(ctx);
  const again = sessionMod.createOrUpdateSessionContext({
    ...msg,
    timestamp: new Date().toISOString(),
  });
  if (again.session_id !== ctx.session_id) {
    fail('pipeline: session_id namespace should be stable across turns');
  }
  if (again.lead_capture_state?.status !== ctx.lead_capture_state?.status) {
    fail('pipeline: expected same session lineage after commit + second create');
  }
  store.delete(ctx.session_id);

  console.log('verify-session-store-abstraction: ok');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
