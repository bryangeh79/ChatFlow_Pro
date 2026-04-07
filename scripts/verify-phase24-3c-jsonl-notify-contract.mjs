/**
 * Phase 24 / 3C — JSONL + notify idempotency_key contract (pure functions).
 * Requires: npm run build
 */

import { dirname, join as pathJoin } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = pathJoin(__dirname, '..');
const modPath = pathJoin(root, 'dist', 'src', 'shared', 'outbound-idempotency.js');

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function assertEq(label, actual, expected) {
  if (actual !== expected) {
    fail(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

async function main() {
  let mod;
  try {
    mod = await import(pathToFileURL(modPath).href);
  } catch (e) {
    fail(
      `Cannot load ${modPath}. Run npm run build first.\n${e instanceof Error ? e.message : e}`,
    );
  }

  const {
    buildLeadCapturedIdempotencyKey,
    buildHandoffPendingNotifyIdempotencyKey,
    buildHandoffAssignmentIdempotencyKey,
    OUTBOUND_IDEMPOTENCY_NO_REQUEST_ID,
    LEAD_CAPTURED_EVENT_TYPE,
    HANDOFF_ASSIGNMENT_LOGGED_EVENT_TYPE,
  } = mod;

  assertEq(
    'lead with request_id',
    buildLeadCapturedIdempotencyKey({
      sessionId: 's1',
      requestId: 'req-a',
      messageId: 'm1',
    }),
    'lead_captured:s1:req-a',
  );

  assertEq(
    'lead request_id missing, message_id fallback',
    buildLeadCapturedIdempotencyKey({
      sessionId: 's2',
      messageId: 'm2',
    }),
    'lead_captured:s2:m2',
  );

  assertEq(
    'lead request_id and message_id missing',
    buildLeadCapturedIdempotencyKey({ sessionId: 's3' }),
    `lead_captured:s3:${OUTBOUND_IDEMPOTENCY_NO_REQUEST_ID}`,
  );

  assertEq(
    'handoff notify with request_id',
    buildHandoffPendingNotifyIdempotencyKey({ sessionId: 's4', requestId: 'req-b' }),
    'handoff_pending:s4:req-b',
  );

  assertEq(
    'handoff notify request_id missing',
    buildHandoffPendingNotifyIdempotencyKey({ sessionId: 's5' }),
    `handoff_pending:s5:${OUTBOUND_IDEMPOTENCY_NO_REQUEST_ID}`,
  );

  assertEq(
    'handoff assignment idempotency',
    buildHandoffAssignmentIdempotencyKey('abc-xyz'),
    'handoff_assignment:abc-xyz',
  );

  if (LEAD_CAPTURED_EVENT_TYPE !== 'lead_captured') {
    fail(`LEAD_CAPTURED_EVENT_TYPE: ${LEAD_CAPTURED_EVENT_TYPE}`);
  }
  if (HANDOFF_ASSIGNMENT_LOGGED_EVENT_TYPE !== 'handoff_assignment_logged') {
    fail(`HANDOFF_ASSIGNMENT_LOGGED_EVENT_TYPE: ${HANDOFF_ASSIGNMENT_LOGGED_EVENT_TYPE}`);
  }

  // eslint-disable-next-line no-console
  console.log('verify-phase24-3c-jsonl-notify-contract: ok');
}

main();
