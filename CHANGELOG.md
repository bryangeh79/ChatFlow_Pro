# Changelog

All notable changes to this repository are documented here. **Per-customer deployments** carry their own `.env`; see **`docs/169`**, **`docs/170`**.

## Unreleased

- **`npm run release:ship`** — one-command ship (`release:prepare` + `delivery:zip` + `report:github-ci` + `delivery:latest`, with optional `-- --with-pdf --with-health`).
- **`npm run release:verify`** — read-only release checks (go-live, git meta, CI, required docs exists).
- **`npm run delivery:latest`** — print latest bundle zip path and SHA256.
- **`npm run release:prepare`** — vendor preflight (`check:go-live` + `report:agent-git`, optional PDF/health).
- **`npm run delivery:manifest`** — emit `data/delivery-manifest.json` (version/SHA/docs-exists).
- **`npm run delivery:bundle`** — build `dist/delivery-bundle/` + `SHA256SUMS.txt` for customer handoff.
- **`npm run delivery:zip`** — build timestamped zip from `dist/delivery-bundle/`.
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
