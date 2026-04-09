/**
 * Phase D-C2A — tenant credential at-rest encryption (local envelope v1).
 * KMS-compatible shape: seal/open + optional master key from env.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const PREFIX_V1 = 'cf1:';

/** True if stored value is already Phase D-C2A v1 sealed blob (idempotent migrate / verify). */
export function isCredentialValueSealedV1(stored: string): boolean {
  return typeof stored === 'string' && stored.startsWith(PREFIX_V1);
}

export interface TenantSecretCrypto {
  readonly enabled: boolean;
  /** Store-safe string (encrypted blob or plaintext passthrough when disabled). */
  sealPlaintext(plaintext: string): string;
  /** Inverse of sealPlaintext; supports legacy plaintext rows. */
  openSealed(stored: string): string;
}

function decodeMasterKey(raw: string): Buffer | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^[0-9a-fA-F]{64}$/.test(t)) return Buffer.from(t, 'hex');
  try {
    const b = Buffer.from(t, 'base64');
    if (b.length === 32) return b;
  } catch {
    /* ignore */
  }
  try {
    const b = Buffer.from(t, 'base64url');
    if (b.length === 32) return b;
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Resolve 32-byte AES key from env.
 * `CHATFLOW_SAAS_CREDENTIALS_MASTER_KEY`: 64-char hex or base64/base64url of 32 raw bytes.
 */
export function loadCredentialMasterKey(): Buffer | null {
  const raw = process.env.CHATFLOW_SAAS_CREDENTIALS_MASTER_KEY?.trim();
  if (!raw) return null;
  return decodeMasterKey(raw);
}

export function isTenantCredentialEncryptionEnabled(): boolean {
  const raw = process.env.CHATFLOW_SAAS_CREDENTIALS_MASTER_KEY?.trim();
  if (!raw) return false;
  return decodeMasterKey(raw) !== null;
}

class Aes256GcmTenantSecretCrypto implements TenantSecretCrypto {
  readonly enabled = true;

  constructor(private readonly key: Buffer) {}

  sealPlaintext(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    const packed = Buffer.concat([iv, tag, enc]);
    return `${PREFIX_V1}${packed.toString('base64url')}`;
  }

  openSealed(stored: string): string {
    if (!stored.startsWith(PREFIX_V1)) {
      return stored;
    }
    const b = Buffer.from(stored.slice(PREFIX_V1.length), 'base64url');
    if (b.length < 12 + 16 + 1) {
      throw new Error('credential_crypto_invalid_blob');
    }
    const iv = b.subarray(0, 12);
    const tag = b.subarray(12, 28);
    const data = b.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }
}

class PassthroughTenantSecretCrypto implements TenantSecretCrypto {
  readonly enabled = false;

  sealPlaintext(plaintext: string): string {
    return plaintext;
  }

  openSealed(stored: string): string {
    return stored;
  }
}

let cached: TenantSecretCrypto | null = null;

export function getTenantSecretCrypto(): TenantSecretCrypto {
  if (cached) return cached;
  const raw = process.env.CHATFLOW_SAAS_CREDENTIALS_MASTER_KEY?.trim();
  if (raw) {
    const key = loadCredentialMasterKey();
    if (!key) {
      throw new Error(
        'CHATFLOW_SAAS_CREDENTIALS_MASTER_KEY_set_but_invalid: use_64_char_hex_or_base64_of_32_bytes',
      );
    }
    cached = new Aes256GcmTenantSecretCrypto(key);
  } else {
    cached = new PassthroughTenantSecretCrypto();
  }
  return cached;
}

/** Test hook: reset singleton (verify scripts only). */
export function resetTenantSecretCryptoCacheForTests(): void {
  cached = null;
}
