const TENANT_CHANNEL = /^\/webhooks\/t\/([^/]+)\/(telegram|website|whatsapp|messenger|line|zalo)$/;

export function matchTenantWebhookPath(pathname: string): { slug: string; channel: string } | null {
  const m = pathname.match(TENANT_CHANNEL);
  if (!m) return null;
  return { slug: m[1], channel: m[2] };
}
