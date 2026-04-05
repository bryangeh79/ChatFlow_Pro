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

Server listens on **http://127.0.0.1:3030** (maps container `PORT=3030`).

## Smoke

In another terminal (host has Node + repo):

```bash
SMOKE_BASE_URL=http://127.0.0.1:3030 npm run smoke:webhooks
```

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
