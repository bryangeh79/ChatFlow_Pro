# Phase 17 — Outbound notify webhooks (lead + handoff)

ChatFlow Pro can **POST JSON** to customer-controlled HTTPS endpoints when optional env vars are set. Delivery is **fire-and-forget** (no retries in-process); the server process logs non-2xx only to stderr. **Never** log full request bodies or secrets in production.

**Code:** `src/channels/lead-capture-hook/notify-outbound.ts`, `src/channels/handoff-trigger/notify-outbound.ts`  
**Config:** `.env.example` (`CHATFLOW_LEAD_NOTIFY_*`, `CHATFLOW_HANDOFF_NOTIFY_*`)

---

## 1. Lead capture notify

**When:** First time a lead is **persisted** to JSONL (`data/local-captured-leads.jsonl`).

**Env:**

| Variable | Required | Purpose |
|----------|----------|---------|
| `CHATFLOW_LEAD_NOTIFY_URL` | Yes (to enable) | `https://` or `http://` endpoint |
| `CHATFLOW_LEAD_NOTIFY_SECRET` | No | Shared secret for optional verification |

**Request:**

- **Method:** `POST`
- **`Content-Type`:** `application/json`
- **`User-Agent`:** `ChatFlow-Pro/lead-notify`
- **Optional header (if secret set):** `x-chatflow-lead-notify-secret: <secret>` — verify on the receiver with **constant-time** compare; do not log the value.

**Body:** Same shape as **one JSON line** in `data/local-captured-leads.jsonl` (see `CapturedLeadRecord` in `src/channels/lead-capture-hook/captured-lead-record.ts`).

| Field | Type | Notes |
|-------|------|--------|
| `session_id` | string | Stable session key |
| `channel` | string | `website` \| `telegram` \| `whatsapp` \| `messenger` \| `line` \| `zalo` |
| `collected_fields` | object | Optional `name`, `phone`, `email` |
| `completed_at` | string | ISO timestamp |
| `message_id` | string? | Optional |
| `captured_at` | string | ISO timestamp |

**Timeout:** 10s client-side; receiver should respond quickly (e.g. enqueue and return `202`).

---

## 2. Handoff notify

**When:** Session **first** transitions to `handoff_state.status === 'pending'` (e.g. keyword trigger).

**Env:**

| Variable | Required | Purpose |
|----------|----------|---------|
| `CHATFLOW_HANDOFF_NOTIFY_URL` | Yes (to enable) | `https://` or `http://` endpoint |
| `CHATFLOW_HANDOFF_NOTIFY_SECRET` | No | Shared secret for optional verification |

**Request:**

- **Method:** `POST`
- **`Content-Type`:** `application/json`
- **`User-Agent`:** `ChatFlow-Pro/handoff-notify`
- **Optional header (if secret set):** `x-chatflow-handoff-notify-secret: <secret>`

**Body:**

| Field | Type | Notes |
|-------|------|--------|
| `event` | string | Always `handoff_pending` |
| `session_id` | string | |
| `channel` | string | Same channel enum as above |
| `external_user_id` | string | |
| `external_session_id` | string | |
| `reason` | string \| null | e.g. `keyword` when triggered by keywords |
| `triggered_at` | string \| null | ISO timestamp when pending was set |

**Timeout:** 10s client-side.

---

## 3. Receiver integration notes

**Idempotency:** ChatFlow does not guarantee exactly-once delivery. Use a natural key such as:

- **Lead:** `(session_id, captured_at)` or a hash of the body fields you care about.
- **Handoff:** `(session_id, triggered_at)` when `triggered_at` is non-null; if you only need one ticket per session, dedupe on `session_id` + `event`.

**HTTP status:** Return `2xx` after the event is safely queued or stored. Non-2xx is logged on the ChatFlow side only.

**Privacy:** Bodies may contain PII. Avoid logging raw JSON in application logs; restrict access to your webhook URL.

**Related:** Optional **`CHATFLOW_SUPPRESS_REPLY_ON_HANDOFF`** — when enabled (`1` / `true` / `yes`), bot outbound may be skipped while `handoff_required` is true; see `.env.example` and `npm run check:staging-env` for SET/OFF visibility.

---

## 4. Version reference

- Lead notify: **Pro_v1.07.39+**
- Handoff notify + suppress reply: **Pro_v1.07.41+** / **Pro_v1.07.42+**
