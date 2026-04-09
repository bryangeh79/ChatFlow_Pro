/**
 * Phase D-C2B1 — single-key tenant credential rotation + DB ledger (no plaintext in audit rows).
 */

import { randomUUID, timingSafeEqual } from 'node:crypto';
import { getSaasDbAdapter } from './db-adapter';
import { getTenantSecretCrypto } from './secret-crypto';
import { observabilityFingerprint } from '../observability/structured-log';
import { logGovernanceCredentialRotationClosed } from '../observability/governance-audit-closure';
import { upsertTenantCredentialSealedWithAdapter } from './repository';

function plaintextEqualsConstantTime(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function credentialSecretFingerprint(plaintext: string): string {
  return observabilityFingerprint(plaintext);
}

export function credentialStoredFingerprint(stored: string): string {
  return observabilityFingerprint(stored);
}

export interface RotateTenantCredentialIfExpectedInput {
  tenantId: string;
  credentialKey: string;
  expectedPlaintext: string;
  newPlaintext: string;
  actorSource: string;
  /** Default `manual`. */
  rotationReason?: string;
}

/**
 * Replaces one `tenant_credentials` row only if decrypted current value matches `expectedPlaintext`,
 * then inserts one `tenant_credential_rotation_events` row (fingerprints only).
 * No overlap window: old secret stops working immediately after successful commit.
 */
export async function rotateTenantCredentialIfExpected(
  input: RotateTenantCredentialIfExpectedInput,
): Promise<{ rotation_event_id: string }> {
  const key = input.credentialKey.trim();
  if (!key) throw new Error('credential_key_required');
  if (typeof input.newPlaintext !== 'string') throw new Error('new_plaintext_required');

  const crypto = getTenantSecretCrypto();
  const adapter = await getSaasDbAdapter();

  const row = await adapter.queryOne(
    'SELECT value FROM tenant_credentials WHERE tenant_id = ? AND key = ?',
    [input.tenantId, key],
  );
  if (!row) throw new Error('credential_key_not_found');

  const storedBefore = String(row.value ?? '');
  let currentPlain: string;
  try {
    currentPlain = crypto.openSealed(storedBefore);
  } catch {
    throw new Error('credential_decrypt_failed');
  }

  if (!plaintextEqualsConstantTime(currentPlain, input.expectedPlaintext)) {
    throw new Error('credential_expected_mismatch');
  }

  const prevPlaintextFp = credentialSecretFingerprint(currentPlain);
  const newPlaintextFp = credentialSecretFingerprint(input.newPlaintext);
  const prevBlobFp = credentialStoredFingerprint(storedBefore);
  const sealedAfter = crypto.sealPlaintext(input.newPlaintext);
  const newBlobFp = credentialStoredFingerprint(sealedAfter);

  const rotationReason = (input.rotationReason ?? 'manual').trim() || 'manual';
  const eventId = randomUUID();
  const tsIso = new Date().toISOString();

  await upsertTenantCredentialSealedWithAdapter(adapter, input.tenantId, key, sealedAfter);

  await adapter.execute(
    `INSERT INTO tenant_credential_rotation_events (
       id, tenant_id, credential_key, actor_source, rotation_reason,
       prev_plaintext_fp, new_plaintext_fp, prev_blob_fp, new_blob_fp, outcome, ts_iso
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      eventId,
      input.tenantId,
      key,
      input.actorSource,
      rotationReason,
      prevPlaintextFp,
      newPlaintextFp,
      prevBlobFp,
      newBlobFp,
      'success',
      tsIso,
    ],
  );

  await adapter.persistIfNeeded();

  logGovernanceCredentialRotationClosed({
    rotation_event_id: eventId,
    tenant_id: input.tenantId,
    credential_key: key,
    actor_source: input.actorSource,
    rotation_reason: rotationReason,
    outcome: 'success',
    prev_plaintext_fp: prevPlaintextFp,
    new_plaintext_fp: newPlaintextFp,
    prev_blob_fp: prevBlobFp,
    new_blob_fp: newBlobFp,
  });

  return { rotation_event_id: eventId };
}
