import { fetch } from 'undici';
import { isInProcessTokenRefreshEnabled } from './in-process-flag';
import {
  applyMessengerPageAccessTokenOverride,
  applyWhatsAppAccessTokenOverride,
  getMessengerPageAccessTokenResolved,
  getWhatsAppAccessTokenResolved,
} from './meta-token-cache';

const GRAPH_API_BASE = 'https://graph.facebook.com';

let waInFlight: Promise<boolean> | null = null;
let msInFlight: Promise<boolean> | null = null;

interface GraphOAuthResponse {
  access_token?: string;
  error?: { message?: string; code?: number };
}

function getMetaAppId(): string | undefined {
  return process.env.META_APP_ID?.trim();
}

/** App secret for OAuth exchange: shared META or channel-specific (same as webhook config precedence). */
function getMetaAppSecretForOAuth(): string | undefined {
  return (
    process.env.META_APP_SECRET?.trim() ||
    process.env.WHATSAPP_APP_SECRET?.trim() ||
    process.env.MESSENGER_APP_SECRET?.trim() ||
    undefined
  );
}

/**
 * Graph fb_exchange_token — verify against current Meta documentation before production.
 * Returns new access_token string or null.
 */
async function exchangeFbToken(apiVersion: string, currentToken: string): Promise<string | null> {
  const appId = getMetaAppId();
  const secret = getMetaAppSecretForOAuth();
  if (!isInProcessTokenRefreshEnabled() || !appId || !secret || !currentToken) {
    return null;
  }

  const url = new URL(`${GRAPH_API_BASE}/${apiVersion}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', appId);
  url.searchParams.set('client_secret', secret);
  url.searchParams.set('fb_exchange_token', currentToken);

  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await res.json().catch(() => ({}))) as GraphOAuthResponse;
    if (!res.ok || !data.access_token || typeof data.access_token !== 'string') {
      const hint = data.error?.code ?? res.status;
      console.error('[MetaOAuth] fb_exchange_token failed:', hint);
      return null;
    }
    return data.access_token;
  } catch (e) {
    console.error('[MetaOAuth] fb_exchange_token exception:', String(e));
    return null;
  }
}

/** HTTP 401 or OAuthException 190 — common invalid/expired access token signals (confirm in staging). */
export function isMetaGraphTokenRefreshCandidate(status: number, graphErrorCode?: number): boolean {
  if (!isInProcessTokenRefreshEnabled()) return false;
  if (status === 401) return true;
  if (status === 400 && graphErrorCode === 190) return true;
  return false;
}

async function doWhatsAppRefresh(apiVersion: string): Promise<boolean> {
  const current = getWhatsAppAccessTokenResolved();
  if (!current) return false;
  const next = await exchangeFbToken(apiVersion, current);
  if (!next) return false;
  applyWhatsAppAccessTokenOverride(next);
  return true;
}

async function doMessengerRefresh(apiVersion: string): Promise<boolean> {
  const current = getMessengerPageAccessTokenResolved();
  if (!current) return false;
  const next = await exchangeFbToken(apiVersion, current);
  if (!next) return false;
  applyMessengerPageAccessTokenOverride(next);
  return true;
}

export function refreshWhatsAppAccessTokenSingleFlight(apiVersion: string): Promise<boolean> {
  if (waInFlight) return waInFlight;
  waInFlight = doWhatsAppRefresh(apiVersion).finally(() => {
    waInFlight = null;
  });
  return waInFlight;
}

export function refreshMessengerPageAccessTokenSingleFlight(apiVersion: string): Promise<boolean> {
  if (msInFlight) return msInFlight;
  msInFlight = doMessengerRefresh(apiVersion).finally(() => {
    msInFlight = null;
  });
  return msInFlight;
}
