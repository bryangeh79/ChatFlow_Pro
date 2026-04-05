# Phase 16 — Operations runbook: token rotation (platform default)

## Purpose

Step-by-step guidance for **option A** in `docs/151_phase16_meta_zalo_token_refresh_adr.md`: rotate outbound credentials in the **hosting secret store**, then **reload configuration** (typically process restart or rolling deploy). No in-process token refresh is assumed.

## Scope

| Variable | Channels | Notes |
|----------|----------|--------|
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp Cloud | Obtain/replace per **current** Meta / WhatsApp Cloud documentation. |
| `MESSENGER_PAGE_ACCESS_TOKEN` | Messenger | Page token; lifecycle depends on Meta app configuration. |
| `ZALO_ACCESS_TOKEN` | Zalo OA | OAuth access token; may expire; refresh flow is vendor-defined (see Zalo Open API docs). |
| `LINE_CHANNEL_ACCESS_TOKEN` | Line | Not covered in `docs/151`; rotate the same way (platform secret + restart) until a Line-specific ADR exists. |
| `TELEGRAM_BOT_TOKEN` | Telegram | New token from BotFather replaces the old one; no OAuth refresh loop. |

**Never** commit real tokens. **Never** paste tokens into logs, tickets, or chat.

## Preconditions

- Staging (or production) environment where env vars are injected by your platform (K8s Secret, PaaS config, Vault, etc.).
- Ability to **restart** or **roll** the ChatFlow Pro process(es) after secret update.
- Optional: enable `CHATFLOW_HTTP_ACCESS_LOG=true` (or `1` / `json`) during the drill to capture structured lines (see `docs/150_phase16_http_access_observability.md`).

## Rotation procedure (one channel at a time)

1. **Prepare**  
   - Generate or obtain the **new** token from the vendor console (Meta, Zalo, Line, Telegram).  
   - Confirm old token still works (baseline smoke) if you need a rollback reference.

2. **Update secret**  
   - Replace **only** the relevant env key in the secret store for that environment.  
   - Do not change unrelated vars.

3. **Deploy / restart**  
   - Apply the usual rollout so **all running instances** load the new env (rolling restart, new task definition, etc.).

4. **Verify — HTTP**  
   - Call `GET /health` → `200`, `{ "ok": true }`.  
   - Send a **minimal POST** to `POST /webhooks/<channel>` for the channel you rotated (flat test bodies are in `docs/129_phase13_0_pro_seven_channel_acceptance_checklist.md`).  
   - Expect `200` and `ok: true` (or documented `skipped` behavior for empty payloads).  
   - Note response header **`X-Request-Id`** for correlation.

5. **Verify — outbound (real send)**  
   - Only if that channel is configured for **real** send (not sandbox/disabled): send a test user message from the real channel and confirm delivery.  
   - If send fails, check vendor dashboard for token validity and app permissions before rolling back.

6. **Optional — access log**  
   - With `CHATFLOW_HTTP_ACCESS_LOG` enabled, confirm one JSON line per request with `type: "http_access"`, matching `request_id`, `channel`, `duration_ms`, and when applicable `phases_ms` (`prepare_ms`, `outbound_send_ms`).

7. **Repeat** for the next channel; avoid rotating every channel’s token in a single step until the process is proven in staging.

## Rollback

1. Restore the **previous** secret value in the platform.  
2. Restart / roll again.  
3. Re-run the same smoke POST (and real send if applicable).

## Staging drill checklist (copy/paste)

- [ ] `GET /health` OK  
- [ ] `POST /webhooks/telegram` OK (if Telegram in scope)  
- [ ] `POST /webhooks/whatsapp` OK  
- [ ] `POST /webhooks/messenger` OK  
- [ ] `POST /webhooks/line` OK  
- [ ] `POST /webhooks/zalo` OK  
- [ ] `POST /webhooks/website` OK (signature if secret configured)  
- [ ] Real outbound spot-check for channels that use real send  
- [ ] Access log line present when flag enabled; `request_id` correlates with response  

## Automated local smoke (before / after rotation)

With the server already running on the target base URL:

```bash
npm run build
npm run start   # other terminal, or your process manager
SMOKE_BASE_URL=http://127.0.0.1:3030 npm run smoke:webhooks
```

- Checks `GET /health` and minimal `POST /webhooks/*` bodies aligned with `docs/129` flat samples.  
- Asserts **`X-Request-Id`** on every response.  
- If **POST signature** envs are set (Website / Meta / Line), unsigned bodies get `403`: skip those channels, e.g.  
  `SMOKE_SKIP_CHANNELS=website,whatsapp,messenger,line SMOKE_BASE_URL=... npm run smoke:webhooks`  
  or use `SMOKE_SKIP_WEBSITE=1` for website only.

Point `SMOKE_BASE_URL` at **staging** after deploying new secrets to validate the same paths remotely.

## References

- `docs/151_phase16_meta_zalo_token_refresh_adr.md` — strategy (A / B / C).  
- `docs/157_phase17_staging_validation_playbook.md` — order staging drills for **152** + Phase **17.1 / 17.2** in-process refresh.  
- `docs/158_docker_staging_quickstart.md` — local **SMOKE_BASE_URL** via Docker.  
- `docs/150_phase16_http_access_observability.md` — `CHATFLOW_HTTP_ACCESS_LOG`, `X-Request-Id`, `phases_ms`.  
- `docs/129_phase13_0_pro_seven_channel_acceptance_checklist.md` — example curl bodies per channel.
