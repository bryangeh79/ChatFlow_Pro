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
| `request_id` | string? | Aligns with HTTP **`X-Request-Id`** for this webhook turn (Pro_v1.07.47+) |
| `message_trace_id` | string? | Optional trace correlate |

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
| `request_id` | string? | Aligns with HTTP **`X-Request-Id`** (Pro_v1.07.47+) |
| `message_trace_id` | string? | Optional |
| `assigned_owner_id` | string? | When auto-assign produced an owner |
| `assign_reason` | string? | Why that owner was chosen |
| `online_agents_count` | number? | Snapshot for ops |
| `assignment_log_id` | string? | JSONL audit id when assignment was logged |

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

## 4. Local development echo

For quick integration tests on the same machine, use the built-in echo server (prints JSON body; **never** prints notify secret header values — only redacted length).

```bash
npm run dev:notify-echo
```

Default listen: **`http://127.0.0.1:3848/notify`** (POST). Health: **`GET http://127.0.0.1:3848/health`**.

**Env:**

| Variable | Default | Purpose |
|----------|---------|---------|
| `NOTIFY_ECHO_PORT` | `3848` | Listen port (avoid clash with `website-outbound-echo` on `3847`) |
| `NOTIFY_ECHO_PATH_PREFIX` | `/notify` | Only paths under this prefix return `200` |
| `NOTIFY_ECHO_BODY_LOG_MAX` | `8000` | Max raw body chars before truncation in logs |

**Example `.env` (local):**

```env
CHATFLOW_LEAD_NOTIFY_URL=http://127.0.0.1:3848/notify
CHATFLOW_HANDOFF_NOTIFY_URL=http://127.0.0.1:3848/notify
# Optional: set secrets in ChatFlow and verify receiver logic separately
```

Restart ChatFlow Pro after changing env. Trigger a lead capture or handoff keyword; the echo terminal should show one POST per notify.

---

## 5. Version reference

- Lead notify: **Pro_v1.07.39+**
- Handoff notify + suppress reply: **Pro_v1.07.41+** / **Pro_v1.07.42+**
- Notify echo dev server + this section: **Pro_v1.07.44+**
- `request_id` / handoff assign fields on notify bodies: **Pro_v1.07.47+**

---

## 6. 生产上线前核对清单（Go-live）

1. **URL**：`CHATFLOW_*_NOTIFY_URL` 使用 **HTTPS**（生产）；内网/演练可用 HTTP。  
2. **幂等与关联**：接收端按 §3 做去重；用 **`request_id`**（及 `message_trace_id`）与自有日志/`X-Request-Id` 对齐。  
3. **密钥**：若配置 `*_SECRET`，接收端用**常量时间**比对对应 header，**勿**把密钥打进应用日志。  
4. **本地冒烟**：先 **`npm run dev:notify-echo`** + §4 示例 env，再触发一条 lead 与一次 handoff，确认 POST 体与字段。  
5. **环境可见性（不打印密钥）**：`npm run check:staging-env` 查看 notify / suppress / handoff runtime 相关项为 SET 或 MISSING。  
6. **全通道**：有公网 staging 后按 **`docs/157`** / **`docs/158`** 跑 smoke；无 Docker 见 **`docs/155`** *T1 equivalence*。
