/**
 * Phase 24 / 2K — Postgres connection env contract + DSN validation stub (no TCP, no pool).
 */

import { isPostgresClientEnabled } from './postgres-gate';

const E_URL = 'CHATFLOW_SAAS_POSTGRES_URL';
const E_HOST = 'CHATFLOW_SAAS_POSTGRES_HOST';
const E_PORT = 'CHATFLOW_SAAS_POSTGRES_PORT';
const E_DB = 'CHATFLOW_SAAS_POSTGRES_DB';
const E_USER = 'CHATFLOW_SAAS_POSTGRES_USER';
const E_PASS = 'CHATFLOW_SAAS_POSTGRES_PASSWORD';
const E_SSL = 'CHATFLOW_SAAS_POSTGRES_SSL';

export type PostgresConnectionConfigSource = 'url' | 'fields' | 'missing';

export interface PostgresConnectionConfigResult {
  source: PostgresConnectionConfigSource;
  valid: boolean;
  host: string | null;
  port: number | null;
  database: string | null;
  user: string | null;
  ssl_enabled: boolean;
  redacted_url: string | null;
  /** Never contains raw password. */
  message: string;
}

function trim(s: string | undefined): string {
  return typeof s === 'string' ? s.trim() : '';
}

function isPortValid(p: number): boolean {
  return Number.isInteger(p) && p >= 1 && p <= 65535;
}

function parseSslFromQuery(sslmode: string | null): boolean {
  const m = (sslmode || '').trim().toLowerCase();
  if (m === '' || m === 'disable' || m === 'allow') return false;
  if (m === 'prefer' || m === 'require' || m === 'verify-ca' || m === 'verify-full') return true;
  return false;
}

/** Parse `CHATFLOW_SAAS_POSTGRES_SSL`: unset/`0` → false, `1` → true; else invalid marker. */
function parseSslEnvRaw(): boolean | 'invalid' {
  const v = trim(process.env[E_SSL]);
  if (v === '' || v === '0') return false;
  if (v === '1') return true;
  return 'invalid';
}

function anySplitFieldSet(): boolean {
  return (
    trim(process.env[E_HOST]) !== '' ||
    trim(process.env[E_PORT]) !== '' ||
    trim(process.env[E_DB]) !== '' ||
    trim(process.env[E_USER]) !== '' ||
    trim(process.env[E_PASS]) !== '' ||
    trim(process.env[E_SSL]) !== ''
  );
}

/**
 * Redact password in a postgres URL for logs/readiness. Does not connect.
 */
export function redactPostgresConnectionString(raw: string): string {
  const s = trim(raw);
  if (s === '') return '';
  try {
    const u = new URL(s);
    if (u.password) u.password = 'REDACTED';
    return u.toString();
  } catch {
    return '[postgres_url_unparseable]';
  }
}

function buildRedactedFieldsUrl(
  host: string,
  port: number,
  database: string,
  user: string,
  ssl: boolean,
): string {
  const encDb = encodeURIComponent(database);
  const encUser = encodeURIComponent(user);
  const q = ssl ? '?sslmode=require' : '';
  return `postgresql://${encUser}:REDACTED@${host}:${port}/${encDb}${q}`;
}

function loadFromUrl(rawUrl: string): PostgresConnectionConfigResult {
  const redacted_url = redactPostgresConnectionString(rawUrl);
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return {
      source: 'url',
      valid: false,
      host: null,
      port: null,
      database: null,
      user: null,
      ssl_enabled: false,
      redacted_url,
      message: 'postgres_config: invalid URL syntax',
    };
  }

  if (u.protocol !== 'postgres:' && u.protocol !== 'postgresql:') {
    return {
      source: 'url',
      valid: false,
      host: null,
      port: null,
      database: null,
      user: null,
      ssl_enabled: false,
      redacted_url,
      message: 'postgres_config: URL must use postgres: or postgresql: scheme',
    };
  }

  const host = u.hostname || '';
  const portNum = u.port ? parseInt(u.port, 10) : 5432;
  const pathSeg = u.pathname.replace(/^\//, '');
  let database = '';
  if (pathSeg) {
    try {
      database = decodeURIComponent(pathSeg.split('/')[0] || '');
    } catch {
      database = '';
    }
  }
  let user = '';
  try {
    user = decodeURIComponent(u.username || '');
  } catch {
    user = '';
  }
  const ssl_enabled = parseSslFromQuery(u.searchParams.get('sslmode'));

  const port = Number.isNaN(portNum) ? null : portNum;
  const valid =
    host.length > 0 &&
    port !== null &&
    isPortValid(port) &&
    database.length > 0 &&
    user.length > 0;

  return {
    source: 'url',
    valid,
    host: host || null,
    port,
    database: database || null,
    user: user || null,
    ssl_enabled,
    redacted_url,
    message: valid
      ? 'postgres_config: parsed from CHATFLOW_SAAS_POSTGRES_URL (password redacted; no connect).'
      : 'postgres_config: URL present but failed validation (host/port/database/user).',
  };
}

function loadFromFields(): PostgresConnectionConfigResult {
  const sslParsed = parseSslEnvRaw();
  if (sslParsed === 'invalid') {
    return {
      source: 'fields',
      valid: false,
      host: null,
      port: null,
      database: null,
      user: null,
      ssl_enabled: false,
      redacted_url: null,
      message: 'postgres_config: CHATFLOW_SAAS_POSTGRES_SSL must be 0, 1, or unset',
    };
  }

  const host = trim(process.env[E_HOST]);
  const portRaw = trim(process.env[E_PORT]);
  const database = trim(process.env[E_DB]);
  const user = trim(process.env[E_USER]);

  let port: number | null = 5432;
  if (portRaw !== '') {
    const n = parseInt(portRaw, 10);
    port = Number.isNaN(n) ? null : n;
  }

  const ssl_enabled = sslParsed;

  const baseInvalid = !host || !database || !user || port === null || !isPortValid(port);
  const redacted_url =
    !baseInvalid && host && port !== null && database && user
      ? buildRedactedFieldsUrl(host, port, database, user, ssl_enabled)
      : null;

  const valid = !baseInvalid;

  return {
    source: 'fields',
    valid,
    host: host || null,
    port,
    database: database || null,
    user: user || null,
    ssl_enabled,
    redacted_url,
    message: valid
      ? 'postgres_config: parsed from split env vars (password never echoed; no connect).'
      : 'postgres_config: split env incomplete or invalid (need host, db, user; port 1–65535 or default 5432).',
  };
}

/**
 * Parse connection settings from env only. No password in return value. No network I/O.
 */
export function loadPostgresConnectionConfig(): PostgresConnectionConfigResult {
  const rawUrl = trim(process.env[E_URL]);
  if (rawUrl !== '') {
    return loadFromUrl(rawUrl);
  }
  if (anySplitFieldSet()) {
    return loadFromFields();
  }
  return {
    source: 'missing',
    valid: false,
    host: null,
    port: null,
    database: null,
    user: null,
    ssl_enabled: false,
    redacted_url: null,
    message: 'postgres_config: missing — set CHATFLOW_SAAS_POSTGRES_URL or split HOST/DB/USER (+ optional PORT, PASSWORD, SSL).',
  };
}

/**
 * Same as `loadPostgresConnectionConfig` plus gate/runtime advisory note (still no connect).
 */
export function getPostgresConnectionConfigSummary(): PostgresConnectionConfigResult {
  const c = loadPostgresConnectionConfig();
  const gate = isPostgresClientEnabled();
  const tail = gate
    ? ' postgres_client_gate=on — no TCP connect / pool in 2K.'
    : ' postgres_client_gate=off — advisory only; runtime not enabled.';
  return {
    ...c,
    message: `${c.message}${tail}`,
  };
}
