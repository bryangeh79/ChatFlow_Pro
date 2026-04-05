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

This runs `docker compose up -d --build`, waits for **`GET /health`**, runs **`npm run smoke:webhooks`**, then **`docker compose down`**.  
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
| **T1 — default local** | After Docker or infra change | **`npm run staging:docker-smoke`** (compose **without** `.env`) | **`[smoke] all passed`** on **seven** webhook routes |
| **T2 — secrets in container** | After editing `.env` for Meta/Line POST verify | **`npm run docker:up:local-env`** (or dual `-f` compose) + smoke with skips | **`SMOKE_SKIP_CHANNELS=whatsapp,messenger,line`** (add `website` if Website signing is on) → **all passed** on non-skipped routes; **403** on skipped routes without skip is **expected** |
| **T3 — real traffic** | Before production cutover | Public **HTTPS** URL + platform webhooks + one **manual** test message per channel you ship | Human confirms reply / logs + **`X-Request-Id`** |
| **T4 — optional drills** | When you enable in-process refresh | **`docs/157`** Phase **A → B/C** | Checklist only |

**Deferred without blocking the repo:** Zalo OA creation (platform permission), Phase **B** until OA exists, Phase **C** until you schedule a Meta test window.

## CI note

GitHub Actions still uses **`npm run build`** only; the Docker image is validated when you build locally or add a future optional workflow.

## References

- `docs/157_phase17_staging_validation_playbook.md`  
- `docs/152_phase16_ops_token_rotation_runbook.md`
