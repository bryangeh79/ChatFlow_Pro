/**
 * In-memory overrides for Meta Graph outbound tokens after fb_exchange_token.
 * Never log these values.
 */

let whatsappAccessOverride: string | null = null;
let messengerPageAccessOverride: string | null = null;

export function getWhatsAppAccessTokenResolved(): string | undefined {
  const o = whatsappAccessOverride?.trim();
  if (o) return o;
  return process.env.WHATSAPP_ACCESS_TOKEN?.trim() || undefined;
}

export function getMessengerPageAccessTokenResolved(): string | undefined {
  const o = messengerPageAccessOverride?.trim();
  if (o) return o;
  return process.env.MESSENGER_PAGE_ACCESS_TOKEN?.trim() || undefined;
}

export function applyWhatsAppAccessTokenOverride(token: string): void {
  whatsappAccessOverride = token.trim();
}

export function applyMessengerPageAccessTokenOverride(token: string): void {
  messengerPageAccessOverride = token.trim();
}
