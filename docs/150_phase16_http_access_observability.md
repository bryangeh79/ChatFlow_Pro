# Phase 16 — HTTP access observability (minimal)

## Goals

- **Request correlation**: every HTTP response includes header **`X-Request-Id`** (UUID).
- **Optional structured access log**: one **JSON line per request** when `CHATFLOW_HTTP_ACCESS_LOG` is enabled, emitted on **`response.finish`** (so `status` and wall time are accurate).

## Environment

| Variable | Values | Default |
|----------|--------|---------|
| `CHATFLOW_HTTP_ACCESS_LOG` | `1`, `true`, `json` (case-insensitive) | unset → **no** access JSON lines |

## Log shape

Each line is a single JSON object:

- `ts` — ISO timestamp  
- `type` — `http_access`  
- `request_id` — same as `X-Request-Id`  
- `method`, `path`  
- `status` — HTTP status from `res.statusCode`  
- `duration_ms` — wall time from handler entry to `finish`  
- `channel` — optional; set for paths under `/webhooks/{channel}` (e.g. `telegram`, `whatsapp`)
- `phases_ms` — optional; on successful `POST /webhooks/*` when the handler returns timings:
  - `prepare_ms` — parse + session + unified pipeline + map outbound (everything before `sender.send`)
  - `outbound_send_ms` — optional; wall time of `sender.send` (omitted on `skipped` early returns)

## Code

- `src/observability/http-access.ts` — helpers  
- `src/server.ts` — attaches `finish` listener when enabled; sets `X-Request-Id` always  
- `src/channels/errors/observability.ts` — `createMinimalTraceContext({ httpRequestId })` uses the same id as `X-Request-Id` when `server` passes it into each `handle*Webhook`  
- Webhook handlers — optional second argument `{ httpRequestId }`; outbound `debug_metadata.request_id` then matches access logs and the response header  
- `src/webhooks/webhook-timing.ts` — `webhookObservabilityPhases` builds `observability.phases_ms` on JSON responses  
- `webhookPhasesFromHandlerResult` in `http-access.ts` — server copies phases into the access log line when enabled  

## Non-goals (this phase)

- No Prometheus / OpenTelemetry  
- No log sampling; enable flag controls volume  
- No fine-grained breakdown inside `runUnifiedInboundPipeline` (only prepare vs outbound send at webhook boundary)
