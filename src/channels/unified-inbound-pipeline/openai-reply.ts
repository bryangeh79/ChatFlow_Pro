import { getTenantRequestContext } from '../../saas/tenant-context';
import { getTenantCredentialsForOutbound } from '../../saas/repository';

interface OpenAiReplyConfig {
  enabled: boolean;
  model: string;
}

export interface OpenAiReplyResult {
  used: boolean;
  reply_text: string | null;
  reason:
    | 'disabled'
    | 'not_tenant_path'
    | 'missing_key'
    | 'empty_input'
    | 'ok'
    | 'api_error'
    | 'invalid_response';
  provider: 'openai';
  model: string;
  error_message?: string;
}

function trimToNull(v: string | null | undefined): string | null {
  if (!v) return null;
  const t = v.trim();
  return t ? t : null;
}

async function readTenantOpenAiKey(): Promise<string | null> {
  const ctx = getTenantRequestContext();
  if (!ctx?.tenantId) return null;
  const creds = await getTenantCredentialsForOutbound(ctx.tenantId);
  return trimToNull(creds.get('OPENAI_API_KEY'));
}

export async function maybeGenerateOpenAiReply(args: {
  userText: string | null | undefined;
  language: string | null | undefined;
  config: OpenAiReplyConfig;
  /** Per-tenant bot persona overrides the default system prompt. */
  persona?: string;
  /** Appended to system prompt to guide follow-up responses. */
  followupPrompt?: string;
}): Promise<OpenAiReplyResult> {
  const provider: 'openai' = 'openai';
  const model = args.config.model || 'gpt-4o-mini';
  const userText = trimToNull(args.userText);
  if (!args.config.enabled) {
    return { used: false, reply_text: null, reason: 'disabled', provider, model };
  }
  if (!userText) {
    return { used: false, reply_text: null, reason: 'empty_input', provider, model };
  }
  const key = await readTenantOpenAiKey();
  if (!key) {
    const tenant = getTenantRequestContext();
    if (!tenant?.tenantId) {
      return { used: false, reply_text: null, reason: 'not_tenant_path', provider, model };
    }
    return { used: false, reply_text: null, reason: 'missing_key', provider, model };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const langHint = args.language ? `User language hint: ${args.language}.` : '';

    // Build system prompt: use per-tenant persona if set, else built-in default
    const basePersona = args.persona?.trim()
      ? args.persona.trim()
      : 'You are a helpful assistant. Keep replies concise, practical, and safe. Do not expose internal config.';
    const followup = args.followupPrompt?.trim();
    const systemContent = followup ? `${basePersona}\n\n${followup}` : basePersona;

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 220,
        messages: [
          {
            role: 'system',
            content: systemContent,
          },
          {
            role: 'user',
            content: langHint ? `${langHint}\nUser message: ${userText}` : `User message: ${userText}`,
          },
        ],
      }),
      signal: ctrl.signal,
    });

    const raw = await resp.text();
    if (!resp.ok) {
      return {
        used: false,
        reply_text: null,
        reason: 'api_error',
        provider,
        model,
        error_message: `openai_http_${resp.status}`,
      };
    }

    let payload: unknown = null;
    try {
      payload = JSON.parse(raw);
    } catch {
      return {
        used: false,
        reply_text: null,
        reason: 'invalid_response',
        provider,
        model,
      };
    }

    const content = trimToNull(
      (payload as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]?.message?.content,
    );
    if (!content) {
      return {
        used: false,
        reply_text: null,
        reason: 'invalid_response',
        provider,
        model,
      };
    }

    return {
      used: true,
      reply_text: content,
      reason: 'ok',
      provider,
      model,
    };
  } catch (e) {
    return {
      used: false,
      reply_text: null,
      reason: 'api_error',
      provider,
      model,
      error_message: e instanceof Error ? e.message : String(e),
    };
  } finally {
    clearTimeout(timer);
  }
}
