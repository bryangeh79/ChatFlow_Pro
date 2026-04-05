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
- For real outbound or signature checks, use **`env_file: .env`** in `docker-compose.yml` (local only; **never commit** `.env`).  
- Then continue **Phase 0 → A → B/C** in **`docs/157`**.

## CI note

GitHub Actions still uses **`npm run build`** only; the Docker image is validated when you build locally or add a future optional workflow.

## References

- `docs/157_phase17_staging_validation_playbook.md`  
- `docs/152_phase16_ops_token_rotation_runbook.md`
