import http from 'node:http';
import { URL } from 'node:url';
import {
  channelFromPathname,
  createRequestId,
  isHttpAccessLogEnabled,
  webhookPhasesFromHandlerResult,
  writeHttpAccessLog,
} from './observability/http-access';
import {
  getLineWebhookVerifyToken,
  getMessengerWebhookVerifyToken,
  getWebsiteWebhookVerifyToken,
  getWhatsAppWebhookVerifyToken,
  getZaloWebhookVerifyToken,
  handleWebhookGetWithOptionalMetaVerify,
  informationalWebhookGetPing,
  sendWebhookGetVerifyResponse,
} from './config/webhook-verify';
import { loadMetaWebhookConfig, verifyMetaSignature, warnIfNoAppSecret } from './config/meta-webhook';
import { getLineChannelSecret, verifyLineSignature, warnIfNoLineChannelSecret } from './config/line-webhook';
import { getWebsiteSigningSecret, verifyWebsiteSignature, warnIfNoWebsiteSigningSecret } from './config/website-webhook';
import { handleTelegramWebhook } from './webhooks/telegram';
import { handleWebsiteWebhook } from './webhooks/website';
import { handleWhatsAppWebhook } from './webhooks/whatsapp';
import { handleMessengerWebhook } from './webhooks/messenger';
import { handleLineWebhook } from './webhooks/line';
import { handleZaloWebhook } from './webhooks/zalo';
import { runMinimalInboundVerification } from './webhooks/verification';

const port = Number(process.env.PORT ?? 3030);

// Load webhook config once at startup
const metaConfig = loadMetaWebhookConfig();
if (!metaConfig.whatsappAppSecret && !metaConfig.messengerAppSecret) {
  // eslint-disable-next-line no-console
  console.warn('[MetaWebhook] No app secret configured for WhatsApp or Messenger; signature verification disabled');
} else {
  if (metaConfig.whatsappAppSecret) {
    // eslint-disable-next-line no-console
    console.log('[MetaWebhook] WhatsApp signature verification enabled');
  }
  if (metaConfig.messengerAppSecret) {
    // eslint-disable-next-line no-console
    console.log('[MetaWebhook] Messenger signature verification enabled');
  }
}

// Load Line channel secret
const lineChannelSecret = getLineChannelSecret();
warnIfNoLineChannelSecret(!!lineChannelSecret);
if (lineChannelSecret) {
  // eslint-disable-next-line no-console
  console.log('[LineWebhook] Line signature verification enabled');
}

// Load Website signing secret
const websiteSigningSecret = getWebsiteSigningSecret();
warnIfNoWebsiteSigningSecret(!!websiteSigningSecret);
if (websiteSigningSecret) {
  // eslint-disable-next-line no-console
  console.log('[WebsiteWebhook] Website signature verification enabled');
}

async function readRequestBody(req: http.IncomingMessage): Promise<{ raw: Buffer; parsed: unknown }> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks);
  const text = raw.toString('utf8').trim();
  if (!text) return { raw, parsed: null };
  try {
    return { raw, parsed: JSON.parse(text) };
  } catch {
    return { raw, parsed: text };
  }
}

async function handler(req: http.IncomingMessage, res: http.ServerResponse) {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const pathname = url.pathname;
  const method = req.method ?? 'GET';
  const requestId = createRequestId();
  const started = Date.now();
  const channelTag = channelFromPathname(pathname);
  let webhookPhases: ReturnType<typeof webhookPhasesFromHandlerResult>;

  res.setHeader('x-request-id', requestId);

  if (isHttpAccessLogEnabled()) {
    res.on('finish', () => {
      writeHttpAccessLog({
        ts: new Date().toISOString(),
        type: 'http_access',
        request_id: requestId,
        method,
        path: pathname,
        status: res.statusCode,
        duration_ms: Date.now() - started,
        ...(channelTag ? { channel: channelTag } : {}),
        ...(webhookPhases ? { phases_ms: webhookPhases } : {}),
      });
    });
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/webhooks/telegram') {
    sendWebhookGetVerifyResponse(
      res,
      informationalWebhookGetPing('telegram', 'post_only_no_url_challenge_set_webhook_via_botfather'),
    );
    return;
  }

  if (req.method === 'GET' && url.pathname === '/webhooks/website') {
    handleWebhookGetWithOptionalMetaVerify(
      res,
      'website',
      url.searchParams,
      getWebsiteWebhookVerifyToken(),
      'meta_style_hub_query_when_using_custom_gateway',
    );
    return;
  }

  if (req.method === 'GET' && url.pathname === '/webhooks/whatsapp') {
    handleWebhookGetWithOptionalMetaVerify(
      res,
      'whatsapp',
      url.searchParams,
      getWhatsAppWebhookVerifyToken(),
      'meta_style_hub_subscribe_verification',
    );
    return;
  }

  if (req.method === 'GET' && url.pathname === '/webhooks/messenger') {
    handleWebhookGetWithOptionalMetaVerify(
      res,
      'messenger',
      url.searchParams,
      getMessengerWebhookVerifyToken(),
      'meta_style_hub_subscribe_verification',
    );
    return;
  }

  if (req.method === 'GET' && url.pathname === '/webhooks/line') {
    handleWebhookGetWithOptionalMetaVerify(
      res,
      'line',
      url.searchParams,
      getLineWebhookVerifyToken(),
      'events_are_post_line_console_may_not_send_hub_get',
    );
    return;
  }

  if (req.method === 'GET' && url.pathname === '/webhooks/zalo') {
    handleWebhookGetWithOptionalMetaVerify(
      res,
      'zalo',
      url.searchParams,
      getZaloWebhookVerifyToken(),
      'optional_meta_style_if_proxy_maps_zalo_to_hub_params',
    );
    return;
  }

  if (req.method === 'POST' && url.pathname === '/verification') {
    const { parsed: body } = await readRequestBody(req);
    const result = await runMinimalInboundVerification();
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, input: body, result }, null, 2));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/webhooks/telegram') {
    const { parsed: body } = await readRequestBody(req);
    const result = await handleTelegramWebhook(body, { httpRequestId: requestId });
    webhookPhases = webhookPhasesFromHandlerResult(result);
    res.writeHead(result.ok ? 200 : 400, { 'content-type': 'application/json' });
    res.end(JSON.stringify(result, null, 2));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/webhooks/website') {
    const { raw, parsed } = await readRequestBody(req);
    
    // Verify website signature if signing secret is configured
    const signatureHeader = req.headers['x-webhook-signature'] as string | undefined;
    const isValid = verifyWebsiteSignature(raw, signatureHeader, websiteSigningSecret);
    
    if (!isValid) {
      // 403 Forbidden for invalid signature
      res.writeHead(403, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'signature_invalid' }));
      return;
    }
    
    const result = await handleWebsiteWebhook(parsed, { httpRequestId: requestId });
    webhookPhases = webhookPhasesFromHandlerResult(result);
    res.writeHead(result.ok ? 200 : 400, { 'content-type': 'application/json' });
    res.end(JSON.stringify(result, null, 2));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/webhooks/whatsapp') {
    const { raw, parsed } = await readRequestBody(req);
    
    // Verify signature if app secret is configured
    const signatureHeader = req.headers['x-hub-signature-256'] as string | undefined;
    const isValid = verifyMetaSignature(raw, signatureHeader, metaConfig.whatsappAppSecret);
    
    if (!isValid) {
      // 403 Forbidden for invalid signature
      res.writeHead(403, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'signature_invalid' }));
      return;
    }
    
    const result = await handleWhatsAppWebhook(parsed, { httpRequestId: requestId });
    webhookPhases = webhookPhasesFromHandlerResult(result);
    const status = result.ok ? 200 : 400;
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(result, null, 2));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/webhooks/messenger') {
    const { raw, parsed } = await readRequestBody(req);
    
    // Verify signature if app secret is configured
    const signatureHeader = req.headers['x-hub-signature-256'] as string | undefined;
    const isValid = verifyMetaSignature(raw, signatureHeader, metaConfig.messengerAppSecret);
    
    if (!isValid) {
      // 403 Forbidden for invalid signature
      res.writeHead(403, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'signature_invalid' }));
      return;
    }
    
    const result = await handleMessengerWebhook(parsed, { httpRequestId: requestId });
    webhookPhases = webhookPhasesFromHandlerResult(result);
    const status = result.ok ? 200 : 400;
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(result, null, 2));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/webhooks/line') {
    const { raw, parsed } = await readRequestBody(req);
    
    // Verify Line signature if channel secret is configured
    const signatureHeader = req.headers['x-line-signature'] as string | undefined;
    const isValid = verifyLineSignature(raw, signatureHeader, lineChannelSecret);
    
    if (!isValid) {
      // 403 Forbidden for invalid signature
      res.writeHead(403, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'signature_invalid' }));
      return;
    }
    
    const result = await handleLineWebhook(parsed, { httpRequestId: requestId });
    webhookPhases = webhookPhasesFromHandlerResult(result);
    const status = result.ok ? 200 : 400;
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(result, null, 2));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/webhooks/zalo') {
    const { parsed: body } = await readRequestBody(req);
    const result = await handleZaloWebhook(body, { httpRequestId: requestId });
    webhookPhases = webhookPhasesFromHandlerResult(result);
    const status = result.ok ? 200 : 400;
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(result, null, 2));
    return;
  }

  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ ok: false, error: 'not_found' }));
}

export function startServer() {
  const server = http.createServer((req, res) => {
    void handler(req, res);
  });

  const host = process.env.CHATFLOW_HTTP_HOST ?? '0.0.0.0';
  server.listen(port, host, () => {
    // eslint-disable-next-line no-console
    console.log(`server listening on ${host}:${port}`);
  });

  return server;
}

if (require.main === module) {
  startServer();
}
