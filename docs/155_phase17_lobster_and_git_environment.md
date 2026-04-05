# Phase 17.x — Lobster / local agent: Git-capable environment

## Goal

Local agents (**龙虾** / OpenClaw / other CLI workers) must be able to run **`git`** from the ChatFlow Pro repo root so they can report real **HEAD SHA**, **commit**, and **push** — not “simulated” git.

## One-command check

From the repo root (`C:\AI_WORKSPACE\Chatflow\ChatFlow_Pro` or your clone):

```bash
npm run check:agent-env
```

Quick **build + HEAD** (no git binary needed for the second part): `npm run verify:local`

- Prints `node`, `npm`, `git --version`, `git rev-parse HEAD`, current branch.  
- **Exit code 1** if `git` is missing or cwd is not a git work tree.

Agents should run this **once per session** before any task that includes “commit / push / CI”.

## Typical OpenClaw profile (read-only `/workspace`, Telegram, etc.)

Some deployments match this pattern (exact versions and HEAD change over time — **do not** treat pasted SHAs as eternal):

| Item | Usual reality |
|------|----------------|
| **Workspace** | `/workspace` in Docker; **read-only** FS except allowed mounts |
| **`.git`** | Often **present** (normal clone) but **`git` binary absent** |
| **HEAD / branch** | Use **`npm run report:agent-git`** — never invent a SHA |
| **Project version** | Read **`package.json`** `version` and **`memory/01_project_status.md`** `Pro_v…` after host sync |
| **Docker** | **No** Docker-in-Docker; **`docker compose`** only on **host** |
| **`npm run staging:docker-smoke`** | **Host-only** (needs `docker` CLI + Compose v2). **Inside read-only OpenClaw: skip — not a failure**, see *T1 equivalence* below. |
| **Remote smoke** | **`SMOKE_BASE_URL`** must point at a reachable HTTP API (public staging **or** host-reachable `http://127.0.0.1:3030` if smoke runs on same machine as the server) |

**Formal split of duties (与 `docs/158`、`docs/159` 一致)**

1. **Git** (commit / push / pull): **Cursor 或宿主**；容器内用 `report:agent-git` 汇报 SHA。  
2. **Docker staging**: **宿主**执行 `docker compose up`（见 **`docs/158`**）。  
3. **CI**: **宿主 push `main`** 后由 GitHub Actions 跑（见 **`.github/workflows/ci.yml`**）。

### T1 equivalence when the agent has no Docker (龙虾 / OpenClaw)

If **`staging:docker-smoke` cannot run** (no `docker` in the container), treat **T1** as satisfied when **all** of the following hold:

1. **GitHub Actions** workflow **CI** on **`main`** is green, including the **`docker-smoke`** job (runs full compose lifecycle + `smoke:webhooks` + `verify:lead-capture-states` on Ubuntu).  
2. In the agent shell: **`npm run build`** succeeds.  
3. With a **running** ChatFlow process on the same reachable host (e.g. `npm run start` on `127.0.0.1:3030`):  
   - `SMOKE_BASE_URL=http://127.0.0.1:3030 npm run smoke:webhooks`  
   - `SMOKE_BASE_URL=http://127.0.0.1:3030 npm run verify:lead-capture-states`  
   (Respect **`SMOKE_SKIP_*`** / **`SMOKE_SKIP_CHANNELS`** the same way as **`docs/152`** / **`docs/158`** when signatures are enforced.)

**Cursor / 宿主** may run **`npm run staging:docker-smoke`** on a machine with Docker to reproduce CI-like T1 locally; that does **not** replace the lobster checklist above when the lobster is container-only.

**Still allowed in-container:** `npm run build`, `npm run smoke:webhooks` (with env), `npm run verify:lead-capture-states` (with env, server reachable), `npm run verify:local`, file edits under workspace policy, local `node` on port 3030+ when the image permits.

### Latest CI run without `git` (workspace may lag)

Even when **local HEAD is behind `origin/main`**, you can still print the latest **CI** run (workflow file **`ci.yml`**) — **no git**, only HTTPS:

- **`npm run report:github-ci`** — reads the GitHub REST API. Default repo is **`bryangeh79/ChatFlow_Pro`**; override with **`GITHUB_REPOSITORY=owner/name`**. For **private** repos, set **`GITHUB_TOKEN`** (needs permission to read Actions).  
- Use this so reports never say “CI skipped because workspace stale”; compare **`head_sha`** from the script to **`npm run report:agent-git`** to see drift.

## Docker / container / no `git` binary

Many agent hosts use a **minimal image** (no `git`, read-only FS). Then:

| Need | What to do |
|------|------------|
| **Report HEAD SHA / branch** in notes | Run **`npm run report:agent-git`** — reads `.git/HEAD` and `refs` (or `packed-refs`) **without** the git CLI. Requires a **normal clone** (`.git` present and readable). |
| **commit / push** | Not possible inside that container unless you add **`git` to the image**, bind-mount the host `git` binary, or run git on the **Windows host / Cursor** and let the container only produce patches. |

**Long-term options**

1. **Base image** that includes `git` (e.g. `apk add git` on Alpine, or use `node` image + `apt-get install git`).  
2. **Two-stage workflow** (**recommended** when lobster has no git): lobster in container → `build` + `smoke` + `report:agent-git` + 列出变更文件/摘要；**Cursor（或指挥官本机）**在仓库根执行 `git status` → `git add` → `git commit` → `git push`。龙虾汇报里写「**Git 由 Cursor/宿主代跑**」并附上 `report:agent-git` 的 HEAD 行即可。  
3. **Mount repo from host** where git already works; run the agent process **on the host** if you need full `check:agent-env` green.

## Windows: install Git and PATH

1. Install **Git for Windows**: https://git-scm.com/download/win  
2. During setup, choose an option that puts Git on **PATH** for third-party tools (e.g. *“Git from the command line and also from 3rd-party software”*).  
3. Default install path is often `C:\Program Files\Git\cmd\git.exe` — the directory **`...\Git\cmd`** should appear in **PATH**.  
4. **Restart** the terminal, IDE, or **OpenClaw / 龙虾** host process so it inherits the new PATH.  
5. Verify in the **same shell the agent uses**:

   ```powershell
   git --version
   ```

## OpenClaw / 龙虾 host configuration

- **Working directory**: must be the **repository root** (folder that contains `package.json` and `.git`).  
- **Shell**: PowerShell or cmd is fine if `git` resolves on PATH.  
- If the agent runs in a **minimal container** without `git`, use **`npm run report:agent-git`** for SHA reporting and offload **commit/push** to a host with git (see table above).  
- **Want git + Docker inside 龙虾?** See **`docs/159_phase17_lobster_runtime_git_docker.md`** (custom image, host run, or `docker.sock` mount).

## After check passes

Standard flow for delivery tasks:

```powershell
git status
git pull
npm run build
npm run smoke:webhooks
# … make changes …
git add -A
git commit -m "feat: …"
git push origin main
```

Report **actual** HEAD in `memory/YYYY-MM-DD.md`: either `git rev-parse HEAD` or the line printed by **`npm run report:agent-git`** — not a placeholder.

## Environment & secrets (`.env`) — project policy

1. **Never commit** a file that contains real tokens (`.env`, `.env.production`, `.env.local`, overrides, etc.). **`.env.example`** is the **only** env file that belongs in git: names + comments + empty values, no secrets.  
2. **GitHub Actions / CI** must use **repository Secrets** (or OIDC to a secret store), not a committed `.env`. This repo’s workflows do not ship env files.  
3. **Pro vs future Enterprise**: use **separate** `.env` (or secret store namespaces) per **environment** and per **product line** when you split repos — **do not** copy production `.env` into a second repo or paste it into chat/issues.  
4. **Agents (龙虾 / Cursor)**: do not paste `.env` lines into tickets or model context; use **`npm run check:staging-env`** / **`--debug-parse`** (lengths only) and **`docs/160`** §4.  
5. **Rotation / incidents**: follow **`docs/152`**; revoke leaked keys at the **platform** (Meta / Line / Telegram / Zalo) even if git history was cleaned.  
6. **`.gitignore`** intentionally allows **`.env.example`** and ignores **`.env.*`** otherwise, plus common key extensions (`*.pem`, `*.p12`).

## References

- `scripts/agent-env-check.mjs` — strict check (git on PATH)  
- `scripts/agent-git-metadata.mjs` / `scripts/agent-git-fs.mjs` — SHA without git CLI  
- `AGENTS.md` — workspace note for AI agents  
- `docs/152_phase16_ops_token_rotation_runbook.md` — ops runbook (separate from agent PATH)
