/**
 * DB-backed channel connection inspection (no outbound network).
 * Aligns with tenant-channel-config credential requirements.
 */

export type TenantChannelInspectId =
  | 'telegram'
  | 'whatsapp'
  | 'messenger'
  | 'line'
  | 'zalo'
  | 'website';

export interface TenantChannelInspectRow {
  id: TenantChannelInspectId;
  label: string;
  connected: boolean;
}

const DEFS: readonly {
  id: TenantChannelInspectId;
  label: string;
  isConnected: (creds: Map<string, string>) => boolean;
}[] = [
  {
    id: 'telegram',
    label: 'Telegram',
    isConnected: (c) => Boolean(c.get('TELEGRAM_BOT_TOKEN')?.trim()),
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    isConnected: (c) =>
      Boolean(c.get('WHATSAPP_ACCESS_TOKEN')?.trim() && c.get('WHATSAPP_PHONE_NUMBER_ID')?.trim()),
  },
  {
    id: 'messenger',
    label: 'Messenger',
    isConnected: (c) =>
      Boolean(c.get('MESSENGER_PAGE_ACCESS_TOKEN')?.trim() && c.get('MESSENGER_PAGE_ID')?.trim()),
  },
  {
    id: 'line',
    label: 'LINE',
    isConnected: (c) => Boolean(c.get('LINE_CHANNEL_ACCESS_TOKEN')?.trim()),
  },
  {
    id: 'zalo',
    label: 'Zalo',
    isConnected: (c) => Boolean(c.get('ZALO_ACCESS_TOKEN')?.trim() && c.get('ZALO_OA_ID')?.trim()),
  },
  {
    id: 'website',
    label: 'Website',
    isConnected: (c) => {
      const inbound = Boolean(c.get('WEBSITE_WEBHOOK_SIGNING_SECRET')?.trim());
      const outbound = Boolean(c.get('WEBSITE_OUTBOUND_URL')?.trim());
      return inbound || outbound;
    },
  },
];

export function listTenantChannelInspectRows(creds: Map<string, string>): TenantChannelInspectRow[] {
  return DEFS.map((d) => ({
    id: d.id,
    label: d.label,
    connected: d.isConnected(creds),
  }));
}

export function countConnectedTenantChannels(creds: Map<string, string>): number {
  return DEFS.filter((d) => d.isConnected(creds)).length;
}

export function isTenantChannelConnected(
  creds: Map<string, string>,
  channelId: string,
): boolean {
  const d = DEFS.find((x) => x.id === channelId);
  return d ? d.isConnected(creds) : false;
}

/** Credential keys removed on "disconnect" for that channel (DB-backed; no env). */
export const TENANT_CHANNEL_CREDENTIAL_KEYS: Record<TenantChannelInspectId, readonly string[]> = {
  telegram: ['TELEGRAM_BOT_TOKEN'],
  whatsapp: [
    'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_PHONE_NUMBER_ID',
    'WHATSAPP_APP_SECRET',
    'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
    'WHATSAPP_API_VERSION',
  ],
  messenger: [
    'MESSENGER_PAGE_ACCESS_TOKEN',
    'MESSENGER_PAGE_ID',
    'MESSENGER_APP_SECRET',
    'MESSENGER_WEBHOOK_VERIFY_TOKEN',
    'MESSENGER_API_VERSION',
  ],
  line: [
    'LINE_CHANNEL_ACCESS_TOKEN',
    'LINE_CHANNEL_SECRET',
    'LINE_WEBHOOK_VERIFY_TOKEN',
    'LINE_API_BASE_URL',
  ],
  zalo: [
    'ZALO_ACCESS_TOKEN',
    'ZALO_OA_ID',
    'ZALO_WEBHOOK_VERIFY_TOKEN',
    'ZALO_API_BASE_URL',
  ],
  website: [
    'WEBSITE_OUTBOUND_URL',
    'WEBSITE_OUTBOUND_SIGNING_SECRET',
    'WEBSITE_WEBHOOK_SIGNING_SECRET',
    'WEBSITE_WEBHOOK_VERIFY_TOKEN',
  ],
};
