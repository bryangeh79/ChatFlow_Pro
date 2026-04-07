import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function must(cond, msg) {
  if (!cond) {
    console.error(msg);
    process.exit(1);
  }
}

async function main() {
  const repositoryTs = await readFile(join(root, 'src', 'saas', 'repository.ts'), 'utf8');
  const webhookTs = await readFile(join(root, 'src', 'saas', 'tenant-webhook-http.ts'), 'utf8');
  const channelConfigTs = await readFile(join(root, 'src', 'saas', 'tenant-channel-config.ts'), 'utf8');

  must(
    /export async function getTenantCredentials\([\s\S]*?return getTenantCredentialsForOutbound\(tenantId\);[\s\S]*?\}/m.test(
      repositoryTs,
    ),
    'expected getTenantCredentials compatibility shim delegating to outbound entrypoint',
  );

  must(
    webhookTs.includes('getTenantCredentialsForWebhook'),
    'expected tenant-webhook-http to import/use getTenantCredentialsForWebhook',
  );
  must(
    !webhookTs.includes('getTenantCredentials(tenantId)'),
    'unexpected direct getTenantCredentials usage in tenant-webhook-http',
  );

  const outboundFns = [
    'loadTelegramConfigForTenant',
    'loadWhatsAppCloudConfigForTenant',
    'loadMessengerGraphConfigForTenant',
    'loadLineMessagingConfigForTenant',
    'loadZaloOpenApiConfigForTenant',
    'loadWebsiteOutboundConfigForTenant',
  ];
  for (const fn of outboundFns) {
    const fnBlock = new RegExp(`export async function ${fn}\\([\\s\\S]*?\\n\\}`, 'm');
    const match = channelConfigTs.match(fnBlock);
    must(Boolean(match), `missing function block: ${fn}`);
    must(
      match[0].includes('getTenantCredentialsForOutbound(tenantId)'),
      `expected ${fn} to use getTenantCredentialsForOutbound`,
    );
  }

  const webhookFns = [
    'getWhatsAppAppSecretForTenant',
    'getMessengerAppSecretForTenant',
    'getLineChannelSecretForTenant',
    'getWebsiteSigningSecretForTenant',
  ];
  for (const fn of webhookFns) {
    const fnBlock = new RegExp(`export async function ${fn}\\([\\s\\S]*?\\n\\}`, 'm');
    const match = channelConfigTs.match(fnBlock);
    must(Boolean(match), `missing function block: ${fn}`);
    must(
      match[0].includes('getTenantCredentialsForWebhook(tenantId)'),
      `expected ${fn} to use getTenantCredentialsForWebhook`,
    );
  }

  must(
    !channelConfigTs.includes('getTenantCredentials(tenantId)'),
    'unexpected direct getTenantCredentials usage in tenant-channel-config',
  );

  console.log('verify-tenant-credentials-entrypoint-boundary: ok');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
