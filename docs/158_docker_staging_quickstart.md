# Docker — quick runnable staging (SMOKE_BASE_URL in minutes)

## Why

When you do not yet have a cloud **staging URL**, you can still get a stable **`SMOKE_BASE_URL`** on your machine or LAN using the repo **Dockerfile** + **docker-compose.yml**.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with **Compose v2** (`docker compose`).

## Run

From the repository root:

```bash
docker compose up --build
```

Server listens on **http://127.0.0.1:3030** by default (maps container `PORT=3030`). If **3030 is already in use** (e.g. `npm run start`), set **`STAGING_HOST_PORT`** (e.g. `3031`) for both Compose and smoke:

```bash
STAGING_HOST_PORT=3031 docker compose up --build
SMOKE_BASE_URL=http://127.0.0.1:3031 npm run smoke:webhooks
```

On Windows PowerShell: `$env:STAGING_HOST_PORT=3031` then `docker compose up --build`.

## Smoke

In another terminal (host has Node + repo):

```bash
SMOKE_BASE_URL=http://127.0.0.1:3030 npm run smoke:webhooks
```

### One-shot (compose + smoke + teardown)

From the repo root, with Docker running:

```bash
npm run staging:docker-smoke
```

This runs `docker compose up -d --build`, waits for **`GET /health`**, runs **`npm run smoke:webhooks`**, then **`npm run verify:lead-capture-states`** (**all seven** channels — each **none → partial → captured** on the unified pipeline; skip flags mirror smoke: **`SMOKE_SKIP_WEBSITE`**, **`SMOKE_SKIP_TELEGRAM_LEAD`**, **`SMOKE_SKIP_WHATSAPP_LEAD`**, **`SMOKE_SKIP_MESSENGER_LEAD`**, **`SMOKE_SKIP_LINE_LEAD`**, **`SMOKE_SKIP_ZALO_LEAD`**, or comma **`SMOKE_SKIP_CHANNELS`** when POST signature blocks unsigned smoke), then **`docker compose down`**.  
Base URL defaults to **`http://127.0.0.1:<STAGING_HOST_PORT>`** (`STAGING_HOST_PORT` defaults to **3030**). If port **3030 is busy**, use e.g. **`STAGING_HOST_PORT=3031 npm run staging:docker-smoke`**.  
When **`STAGING_HOST_PORT` is set**, the script **overrides** `SMOKE_BASE_URL` to `http://127.0.0.1:<that port>` so a shell-wide `SMOKE_BASE_URL` pointing at **3030** cannot send smoke to the wrong process.  
To keep containers up after smoke (debug): `STAGING_COMPOSE_DOWN=0 npm run staging:docker-smoke` (Unix) or set `STAGING_COMPOSE_DOWN=0` in the environment on Windows.

For another machine on the LAN, use the host’s IP, e.g. `http://192.168.1.10:3030`, and ensure the firewall allows the port.

## Env / webhooks

- By default the image runs **without** your `.env` (intentionally: no secrets baked in).  
- For **real outbound** (Telegram / Line / WhatsApp / Messenger) or stricter POST signature behaviour inside Docker, merge the optional overlay (**never** commit `.env`):  

  ```bash
  docker compose -f docker-compose.yml -f docker-compose.local-credentials.yml up --build
  ```

  Shorthand from repo root: **`npm run docker:up:local-env`**.  
  Then smoke from the host, e.g. `SMOKE_BASE_URL=http://127.0.0.1:3030 npm run smoke:webhooks` (or your `STAGING_HOST_PORT`).  
- Alternatively, uncomment **`env_file: .env`** in `docker-compose.yml` locally (do not commit that change if it points at real secrets).  
- Continue **Phase 0 → A → B/C** in **`docs/157`** when validating token refresh.

## Default staging ladder (project decision — **does not block** shipping code)

**Verdict:** Merging and continuing feature work **do not** require a public cloud staging URL, full signed smoke on every channel, or a Zalo OA. Those are **confidence layers**, not hard gates.

| Tier | When | Command / action | Pass criterion |
|------|------|------------------|----------------|
| **T0 — always** | Every push / before PR | CI **`npm run build`** (and repo **`npm run verify:local`** if you use git locally) | Build green |
| **T1 — default local** | After Docker or infra change | **`npm run staging:docker-smoke`** (compose **without** `.env`) | **`[smoke] all passed`** on **seven** webhook routes **and** **`[lead-verify] all passed`** (seven-channel lead triplets unless skipped) |
| **T2 — secrets in container** | After editing `.env` for Meta/Line POST verify | **`npm run staging:docker-smoke:t2`** (one-shot: dual compose + default skips) **or** `npm run docker:up:local-env` + manual smoke | Default skip **`whatsapp,messenger,line`**; add **`website`** in env if Website signing is on (`SMOKE_SKIP_CHANNELS=whatsapp,messenger,line,website`) → **all passed** on non-skipped routes |
| **T3 — real traffic** | Before production cutover | Public **HTTPS** URL + platform webhooks + one **manual** test message per channel you ship | Human confirms reply / logs + **`X-Request-Id`** |
| **T4 — optional drills** | When you enable in-process refresh | **`docs/157`** Phase **A → B/C** | Checklist only |

**Deferred without blocking the repo:** Zalo OA creation (platform permission), Phase **B** until OA exists, Phase **C** until you schedule a Meta test window.

## Single-channel (Telegram) deliverable closeout

Use this when **one** bot on **one** VPS is “good enough to operate” — no need to validate every channel first. Full playbook overlap: **`docs/157`** Phase 0 (remote smoke + skips), **`docs/160`** §4.

### Before you call it done

1. **HTTPS terminates in front of the app** (e.g. Caddy → `127.0.0.1:<host_port>`). **Port 80** must reach Caddy for **ACME HTTP-01** on first issue and renewals (unless you use DNS-01). After changes: `sudo caddy validate --config /etc/caddy/Caddyfile` then `sudo systemctl reload caddy` (or your equivalent).
2. **Health**: `curl -fsS https://<your-subdomain>/health` → JSON **`{"ok":true}`** (see `src/server.ts` **`GET /health`**).
3. **Telegram end-to-end**: User message → bot reply; **`getWebhookInfo`** URL matches **`https://<subdomain>/webhooks/telegram`** (no double `bot` path); **`TELEGRAM_BOT_TOKEN`** in `.env` is the **same** bot as the webhook.
4. **Observability**: Set **`CHATFLOW_HTTP_ACCESS_LOG=true`** in `.env` (see **`.env.example`**). Every response includes **`x-request-id`**; correlate support tickets to **one line** in Docker logs (`docker compose logs -f`) using that id and/or `request_id` inside webhook JSON **`debug_metadata`** when present.
5. **Secrets & backup**: **Never** commit `.env`. On the server, restrict permissions (e.g. `chmod 600 .env`). Keep an **offline** copy of `.env` (password manager / encrypted backup — not chat logs). If a token leaks, rotate at the platform and update `.env`, then **`docker compose up -d --force-recreate`**.
6. **Upgrade path** (code): from the client deploy dir (e.g. `/opt/chatflow/clients/client-01`): `git pull` → `docker compose up -d --build`. If behaviour is wrong, capture **`x-request-id`** from the failing request before rollback (`git checkout <sha>` + rebuild).
7. **Optional confidence** (from laptop, non-blocking): `SMOKE_BASE_URL=https://<subdomain> npm run smoke:webhooks` with **`SMOKE_SKIP_*`** for channels you have not wired yet — still records Phase 0 style pass/skip ( **`docs/157`** ).
8. **Optional lead notify**: Set **`CHATFLOW_LEAD_NOTIFY_URL`** (and optionally **`CHATFLOW_LEAD_NOTIFY_SECRET`**) in `.env` so the first successful write to **`data/local-captured-leads.jsonl`** also triggers an async **POST** (Zapier / internal CRM). **`npm run check:staging-env`** lists SET/MISSING for these keys.

## CI note

GitHub Actions runs **`build`** then **`docker-smoke`** (`npm run staging:docker-smoke`), which includes **`smoke:webhooks`** and **`verify:lead-capture-states`** on the built image. Workflows use **`actions/checkout@v5`** and **`actions/setup-node@v5`**.

To read the latest **`ci.yml`** run from any shell **without git** (e.g. read-only agent): **`npm run report:github-ci`** — see **`docs/155`** (*Latest CI run without `git`*).

## References

- `docs/162_customer_seven_channel_access_token_guide.md` — **客户阅读**：七通道凭据/Token 去哪些官网申请（可 `npm run docs:pdf:162` 导出 PDF）。  
- `docs/157_phase17_staging_validation_playbook.md`  
- `docs/152_phase16_ops_token_rotation_runbook.md`
