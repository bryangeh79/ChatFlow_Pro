# Changelog

All notable changes to this repository are documented here. **Per-customer deployments** carry their own `.env`; see **`docs/169`**, **`docs/170`**.

## Unreleased

- **`npm run health:curl`** — `scripts/curl-health.mjs` (`HEALTH_CHECK_URL` optional).
- **`LICENSE`** (proprietary), **`SECURITY.md`** (reporting guidance).
- **`docs/172`** — HTTPS reverse proxy (Caddy / Nginx); **`examples/reverse-proxy/`** templates.
- **`docs/171`** — vendor release checklist.
- **`docker-compose.customer.yml`** — long-running customer compose (`env_file: .env`, `restart: unless-stopped`).
- **`CHANGELOG.md`** — this file.

## 1.7.57

- Commercial delivery docs: **`docs/169`**, **`docs/170`**, **`docs/168`**.
- **`npm run backup:data`** — copy `data/` to timestamped `backups/` (or `CHATFLOW_BACKUP_PARENT`).
- CI: `check:staging-env` after build; **`npm run check:go-live`**.
