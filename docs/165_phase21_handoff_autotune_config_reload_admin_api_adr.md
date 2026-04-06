# Phase 21 — Handoff ops suggestions: config reload vs minimal admin API (ADR)

## Status

**B 已落地（路径 + SIGHUP + 优先级）** — Phase 21 实现完成。新增环境变量 `CHATFLOW_HANDOFF_RUNTIME_CONFIG_PATH` 指向 JSON 文件；优先级规则：env 为基底，JSON 仅覆盖文件中出现的键；支持 Unix SIGHUP 重载；Windows 需重启进程。

**C 仍为未来** — 最小 admin HTTP 端点未实现，保持可选。

**Phase 21.2（`docs/167`）** — 可选 `CHATFLOW_OPS_AUTOTUNE_WRITE_RUNTIME=1`：在 `CHATFLOW_HANDOFF_RUNTIME_CONFIG_PATH` 已设且 autotune 采纳变更时，将**白名单键**合并写入该 JSON；Unix 写后需 **SIGHUP** 或重启方载入进程。

**Context:** Phase 20 `ops:handoff-autotune` (`scripts/run-handoff-autotune.mjs`) may propose changes to handoff-related env (e.g. balance mode, SLA target). Persistent state includes `CHATFLOW_OPS_AUTOTUNE_STATE_PATH` (default `data/.handoff-autotune-state.json`); optional merge write to runtime JSON per **21.2**.

## Problem

Operators want **controlled application** of autotune (or manual) parameter updates **without** always redeploying the whole service, while keeping **security and predictability** (single-process, no surprise token exposure).

## Explicitly out of scope (this ADR)

- Replacing platform secret stores or K8s rolling restart as the **primary** production pattern for channel tokens (see **`docs/151`**, **`docs/156`**).
- Full admin UI, multi-tenant RBAC, or arbitrary env mutation APIs.
- Changing unified inbound contracts (`memory/06`, `memory/07`) or webhook `200 OK` / degraded-send policy without a separate ADR.

## Options

### A — Document-only + restart (baseline)

Continue to apply env changes via deployment / process manager; autotune remains **advisory**.

- **Pros:** Zero new attack surface; matches current Phase 20 safety posture.
- **Cons:** No faster loop for handoff tuning knobs.

### B — Narrow **reload file** for handoff tuning only (recommended first implementation)

Introduce a **single, documented JSON path** (e.g. under `data/`, git-ignored) listing **only** whitelisted keys (mirror of a subset of handoff-assign env). On **SIGHUP** or on a **timer**, the process **re-reads** that file and updates **in-memory** handoff assignment config. Autotune (when `CHATFLOW_OPS_AUTOTUNE=1` and rules allow) may **write that file** instead of printing-only; still **no** broad `.env` rewrite.

- **Pros:** Bounded surface; no HTTP auth story initially; aligns with JSONL-style `data/` usage; easy to audit diffs.
- **Cons:** Requires clear **precedence** (file vs env: document whether file overrides env or only fills defaults).

### C — Minimal **admin HTTP** endpoint (future)

`POST /internal/admin/reload-handoff-config` (or similar) behind **shared secret header** + optional IP allowlist, idempotent, **same whitelist** as B. Rate-limited; logs **redacted**; returns JSON `{ ok, applied_keys[] }`.

- **Pros:** Fits external cron / GitOps webhooks; no shell on host.
- **Cons:** New exposure class; must be **default off** and documented threat model.

## Decision (preliminary)

1. **Default production posture remains A** until Phase 21 is prioritized.
2. **Prefer B** as the first code slice when automation is required: whitelist + file + in-memory refresh; **precedence rule** must be stated in the implementation PR (recommend: **env is base, file overrides only listed keys**).
3. **C** is optional later; do not ship C without **off-by-default** gate and **`docs/161`-style** operational notes (never log secrets).

## References

- **`memory/01`**, **`memory/03`** — Phase 20 completion and Phase 21 pointer.
- **`docs/161`** — notify contracts and `request_id` (unchanged by this ADR).
- **`scripts/run-handoff-autotune.mjs`** — current advisory autotune behavior.
