/**
 * WhatsApp Cloud API configuration (env only — never log token values).
 */

import { getWhatsAppAccessTokenResolved } from '../tokens/meta-token-cache';

export interface WhatsAppCloudConfig {
  accessToken: string;
  phoneNumberId: string;
  apiVersion: string;
}

/**
 * Checks if WhatsApp Cloud real send is disabled via sandbox or disabled flags.
 */
export function isWhatsAppSandboxOrDisabled(): boolean {
  const sandbox = process.env.WHATSAPP_SANDBOX;
  const disabled = process.env.WHATSAPP_CLOUD_DISABLED;
  return sandbox === 'true' || sandbox === '1' || disabled === 'true' || disabled === '1';
}

export function getWhatsAppAccessTokenRaw(): string | undefined {
  return getWhatsAppAccessTokenResolved();
}

export function getWhatsAppPhoneNumberIdRaw(): string | undefined {
  const id = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  return id || undefined;
}

export function getWhatsAppApiVersionRaw(): string {
  const v = process.env.WHATSAPP_API_VERSION?.trim();
  return v || 'v19.0';
}

/**
 * Returns config for real send, or null to use synthetic sender.
 * Null when: sandbox/disabled mode, missing token, or missing phone number ID.
 */
export function loadWhatsAppCloudConfigForRealSend(): WhatsAppCloudConfig | null {
  if (isWhatsAppSandboxOrDisabled()) {
    return null;
  }

  const accessToken = getWhatsAppAccessTokenRaw();
  const phoneNumberId = getWhatsAppPhoneNumberIdRaw();

  if (!accessToken || !phoneNumberId) {
    return null;
  }

  const apiVersion = getWhatsAppApiVersionRaw();
  return {
    accessToken,
    phoneNumberId,
    apiVersion,
  };
}

/**
 * Redacts WhatsApp access token from log/error messages.
 */
export function redactWhatsAppTokenInMessage(message: string, token: string): string {
  if (!token || !message) return message;
  return message.split(token).join('[REDACTED]');
}
