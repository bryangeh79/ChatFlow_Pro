/**
 * Phase D-C2A — migrate plaintext tenant_credentials.value rows to cf1: sealed (shared by CLI + tests).
 */

import { getSaasDbAdapter, getSaaSDbDriver } from './db-adapter';
import type { SaaSDbAdapter } from './db-adapter/types';
import { getTenantSecretCrypto, isCredentialValueSealedV1 } from './secret-crypto';

export interface PlainCredentialRow {
  tenant_id: string;
  key: string;
  value: string;
}

async function updateCredentialValue(adapter: SaaSDbAdapter, tenantId: string, key: string, sealed: string): Promise<void> {
  if (getSaaSDbDriver() === 'postgres') {
    await adapter.execute(
      `UPDATE tenant_credentials SET value = ?, updated_at = NOW() WHERE tenant_id = ? AND key = ?`,
      [sealed, tenantId, key],
    );
  } else {
    await adapter.execute(
      `UPDATE tenant_credentials SET value = ?, updated_at = datetime('now') WHERE tenant_id = ? AND key = ?`,
      [sealed, tenantId, key],
    );
  }
}

export async function listPlaintextTenantCredentialRows(): Promise<PlainCredentialRow[]> {
  const adapter = await getSaasDbAdapter();
  const rows = await adapter.queryAll('SELECT tenant_id, key, value FROM tenant_credentials', []);
  return rows
    .map((r) => ({
      tenant_id: String(r.tenant_id),
      key: String(r.key),
      value: String(r.value ?? ''),
    }))
    .filter((r) => !isCredentialValueSealedV1(r.value));
}

export interface MigratePlaintextCredentialsResult {
  total_rows: number;
  pending_plaintext_count: number;
  rows_updated: number;
  sample_keys: Array<{ tenant_id: string; key: string }>;
}

/**
 * @param dryRun — if true, no writes
 * @param maxRows — cap updates (apply only); Infinity = no cap
 */
export async function migratePlaintextTenantCredentialsToCf1(input: {
  dryRun: boolean;
  maxRows?: number;
}): Promise<MigratePlaintextCredentialsResult> {
  const crypto = getTenantSecretCrypto();
  if (!crypto.enabled) {
    throw new Error('CHATFLOW_SAAS_CREDENTIALS_MASTER_KEY_required_for_migration');
  }

  const adapter = await getSaasDbAdapter();
  const all = await adapter.queryAll('SELECT tenant_id, key, value FROM tenant_credentials', []);
  const total_rows = all.length;
  const pending = all
    .map((r) => ({
      tenant_id: String(r.tenant_id),
      key: String(r.key),
      value: String(r.value ?? ''),
    }))
    .filter((r) => !isCredentialValueSealedV1(r.value));

  const maxRows = input.maxRows ?? Infinity;
  const sample_keys = pending.slice(0, 50).map((r) => ({ tenant_id: r.tenant_id, key: r.key }));

  if (input.dryRun) {
    return {
      total_rows,
      pending_plaintext_count: pending.length,
      rows_updated: 0,
      sample_keys,
    };
  }

  let rows_updated = 0;
  for (const r of pending) {
    if (rows_updated >= maxRows) break;
    const sealed = crypto.sealPlaintext(r.value);
    await updateCredentialValue(adapter, r.tenant_id, r.key, sealed);
    rows_updated += 1;
  }
  await adapter.persistIfNeeded();

  return {
    total_rows,
    pending_plaintext_count: pending.length,
    rows_updated,
    sample_keys,
  };
}

export async function countPlaintextTenantCredentialRows(): Promise<number> {
  const pending = await listPlaintextTenantCredentialRows();
  return pending.length;
}

export type ZeroPlaintextVerifyOk = { ok: true; row_count: number };
export type ZeroPlaintextVerifyFail = {
  ok: false;
  plaintext_or_unknown_format_count: number;
  sample_keys: Array<{ tenant_id: string; key: string }>;
};
export type ZeroPlaintextVerifyResult = ZeroPlaintextVerifyOk | ZeroPlaintextVerifyFail;

/** Policy check: every tenant_credentials.value must be cf1: sealed and decryptable (when master key is on). */
export async function verifyTenantCredentialsZeroPlaintext(): Promise<ZeroPlaintextVerifyResult> {
  const crypto = getTenantSecretCrypto();
  if (!crypto.enabled) {
    throw new Error('CHATFLOW_SAAS_CREDENTIALS_MASTER_KEY_required_for_zero_plaintext_verify');
  }

  const adapter = await getSaasDbAdapter();
  const rows = await adapter.queryAll('SELECT tenant_id, key, value FROM tenant_credentials', []);
  const bad = rows.filter((r) => !isCredentialValueSealedV1(String(r.value ?? '')));

  if (bad.length > 0) {
    return {
      ok: false,
      plaintext_or_unknown_format_count: bad.length,
      sample_keys: bad.slice(0, 30).map((r) => ({ tenant_id: String(r.tenant_id), key: String(r.key) })),
    };
  }

  let decryptErrors = 0;
  for (const r of rows) {
    try {
      crypto.openSealed(String(r.value ?? ''));
    } catch {
      decryptErrors += 1;
    }
  }
  if (decryptErrors > 0) {
    throw new Error(`sealed_row_decrypt_failed:${decryptErrors}`);
  }

  return { ok: true, row_count: rows.length };
}
