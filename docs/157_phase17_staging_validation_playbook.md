# Phase 17 — Staging validation & ops drill playbook

## Purpose

Single place to **validate** Phase **17.1** (Zalo in-process refresh) and **17.2** (Meta `fb_exchange_token`) in a **non-production** environment, and to chain **remote smoke** + **platform rotation** (`docs/152`) without guessing the order.

**小白逐步版 + 最小必测矩阵 + PDF 导出说明** → **`docs/160_phase17_minimal_test_matrix_beginner.md`**（可导出为同路径 `.pdf`）。

## Preconditions

- **Staging** (or isolated Meta/Zalo test apps) — not customer production.  
- Deployed ChatFlow Pro with **real outbound** test numbers/pages where needed.  
- Optional: `CHATFLOW_HTTP_ACCESS_LOG=true` for JSON lines (`docs/150`).  
- **Never** paste tokens into chat, tickets, or committed logs — use redacted excerpts and `X-Request-Id` only.

## Phase 0 — Baseline (in-process refresh **off**)

1. Ensure **`CHATFLOW_INPROCESS_TOKEN_REFRESH`** is **unset** or **not** `1` / `true`.  
2. **Base URL options** (pick one):  
   - **Local Docker**: `http://127.0.0.1:3030` — **`docs/158`**. One-shot: **`npm run staging:docker-smoke`**.  
   - **Self-hosted HTTPS** (e.g. **Vultr + Docker + Caddy**): deploy with **`127.0.0.1:<port>`** bound to the app, terminate TLS on **80/443**, then use **`https://your-subdomain.example.com`** as **`SMOKE_BASE_URL`** from your laptop. DNS **A/AAAA** → server; first-time cert issuance needs **port 80** reachable for ACME (unless you use DNS-01).  
   - Before Phase B/C, run **`npm run check:staging-env`** (or `--phase=b` / `c-wa` / `c-messenger` / `--strict`) — lists **SET/MISSING** without printing secret values; see **`docs/160`** §4.  
3. From your laptop (or CI):  
   `SMOKE_BASE_URL=https://your-staging.example.com npm run smoke:webhooks`  
   Use `SMOKE_SKIP_*` per `docs/152` if POST signatures are enforced.  
4. Record: pass/fail per channel, one sample **`X-Request-Id`**.

## Phase A — Option A rotation drill (`docs/152`)

1. Pick **one** channel (e.g. WhatsApp).  
2. Rotate token in the **platform secret store** only; restart/roll processes.  
3. Re-run **Phase 0** smoke; confirm outbound still works.  
4. Repeat for the next channel on another day if you want a safe rhythm.

## Phase B — Zalo 17.1 (in-process refresh)

1. Set in staging only:  
   - `CHATFLOW_INPROCESS_TOKEN_REFRESH=1`  
   - `ZALO_REFRESH_TOKEN`, `ZALO_APP_ID`, `ZALO_APP_SECRET`, plus existing `ZALO_ACCESS_TOKEN`, `ZALO_OA_ID`.  
2. **Force** an invalid/expired access token scenario (method depends on your OA test setup — e.g. temporary wrong `ZALO_ACCESS_TOKEN` then restore after test, or wait for natural expiry in a test OA).  
3. Send a minimal `POST /webhooks/zalo` (`docs/129`).  
4. Expect: outbound may succeed after refresh; in webhook JSON / logs look for **`zalo_real_token_refresh_retry`** in `debug_steps` (or equivalent evidence).  
5. **Rollback**: set `CHATFLOW_INPROCESS_TOKEN_REFRESH` off; redeploy; confirm behavior returns to pre–17.1.

## Phase C — Meta 17.2 (`fb_exchange_token`)

1. Set in staging only:  
   - `CHATFLOW_INPROCESS_TOKEN_REFRESH=1`  
   - `META_APP_ID`  
   - One of `META_APP_SECRET` / `WHATSAPP_APP_SECRET` / `MESSENGER_APP_SECRET`  
   - Valid `WHATSAPP_ACCESS_TOKEN` + phone number ID and/or Messenger page token + page ID.  
2. Provoke **401** or **400** with Graph **`error.code` 190** (exact method depends on Meta test app — invalid token, revoked session, etc.).  
3. Send inbound webhook for that channel; expect possible recovery after exchange.  
4. Look for **`whatsapp_real_meta_token_exchange_retry`** or **`messenger_real_meta_token_exchange_retry`** in evidence.  
5. **Rollback**: disable in-process flag; fix env tokens via **152**; redeploy.

## Evidence checklist (copy/paste)

- [ ] Phase 0 smoke: OK / skipped channels noted  
- [ ] 152 rotation: channel name + date  
- [ ] Zalo 17.1: refresh path observed Y/N (no secrets in notes)  
- [ ] Meta 17.2: exchange path observed Y/N  
- [ ] Rollback tested Y/N  

## References

- `docs/160_phase17_minimal_test_matrix_beginner.md` — minimal test matrix, step-by-step for beginners, PDF export options.  
- `docs/158_docker_staging_quickstart.md` — local Docker → `SMOKE_BASE_URL`.  
- `docs/152_phase16_ops_token_rotation_runbook.md` — platform rotation (option A).  
- `docs/154_phase17_inprocess_token_refresh.md` — Zalo 17.1.  
- `docs/156_phase17_2_meta_inprocess_token_refresh_spec.md` — Meta 17.2.  
- `docs/151_phase16_meta_zalo_token_refresh_adr.md` — strategy A/B/C.  
- `docs/129_phase13_0_pro_seven_channel_acceptance_checklist.md` — sample bodies.
