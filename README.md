# ChatFlow Pro

AI reception and customer-support automation for SMEs.

**License:** see **`LICENSE`** (proprietary). **Security:** **`SECURITY.md`**.

## Deliverable runtime (this repo)

Production path: Node server under `src/` (seven webhooks, unified pipeline, outbound send). **Go-live checklist (2-day):** **`docs/168_pro_two_day_go_live_checklist.md`**. **Commercial model (one customer = one deployment):** **`docs/169_pro_commercial_one_customer_one_deploy.md`**. **Customer ops:** **`docs/170_pro_customer_ops_runbook.md`**. **Vendor release:** **`docs/171_pro_vendor_release_checklist.md`**, **`CHANGELOG.md`**. **Customer compose:** `docker-compose.customer.yml`. **HTTPS 反代：** **`docs/172_pro_https_reverse_proxy_caddy_nginx.md`**（`examples/reverse-proxy/`）。 Module intent: **`docs/01_module_blueprint.md`**.

## Structure
- `frontend/` chat widget and admin UI skeleton
- `backend/` modular API and service skeleton
- `shared/` shared types, constants, interfaces
- `i18n/` language resource skeleton
- `docs/` product and architecture documentation
- `memory/` project state and handoff notes
