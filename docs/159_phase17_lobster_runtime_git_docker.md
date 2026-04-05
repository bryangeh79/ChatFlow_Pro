# Lobster / OpenClaw — Git & Docker on the agent (match your dev host)

## Can we install git / Docker for 龙虾?

**Yes**, if **you control** how the agent runs (host OS, or the **image** / **compose** that starts OpenClaw). You cannot rely on `apt install` inside a **read-only** or **minimal** container unless you **rebuild** that image with packages baked in.

## Goals

| Capability | Why |
|------------|-----|
| **`git`** on PATH | `check:agent-env` green, real `commit` / `pull` / `push`, accurate SHA without hand-reading `.git`. |
| **`docker` + Compose v2** | Run **`docker compose`** for **`docs/158`** (local `SMOKE_BASE_URL`) from the same environment as other agent tasks. |

“**匹配**” means: use **same major stack** as your workstation when possible (e.g. Git 2.4x, Docker Engine + Compose plugin, Node 22) so scripts behave the same.

## Option A — Run the agent on the **Windows host** (simplest)

1. Install **Git for Windows** and **Docker Desktop** (or Docker Engine + Compose on WSL2).  
2. Ensure **PATH** is visible to the OpenClaw process (restart agent after install).  
3. Run `git --version`, `docker compose version`, `npm run check:agent-env` in the **same shell profile** the agent uses.

No Docker-in-Docker; Compose talks to the **host** engine.

## Option B — Agent inside **Docker** (custom image)

1. **Do not** use a scratch/minimal image without a package manager if you need git.  
2. Base image example: `node:22-bookworm-slim` (or Alpine + `apk add git`).  
3. **Git**: `apt-get update && apt-get install -y --no-install-recommends git` (Debian) or `apk add git` (Alpine).  
4. **Docker CLI + Compose** (talk to **host** daemon):  
   - Install **client only** (`docker-ce-cli`, Compose plugin) in the image **or** copy static `docker` binary.  
   - Mount host socket: `-v /var/run/docker.sock:/var/run/docker.sock` (Linux host).  
   - **Security**: any process with the socket can control the host Docker daemon — restrict to trusted agents and read-only repos where possible.  
5. Rebuild image, point OpenClaw at it, restart.

**Docker-in-Docker (DinD)** is possible but heavier and usually unnecessary if mounting `docker.sock` is acceptable.

## Option C — Git only in the agent; Docker stays on **host**

- Give 龙虾 **git** in its image/PATH.  
- Document: “`docker compose` must be run by **human** or **Cursor** on the host” (current split).  
- Still faster than today’s no-git container.

## Verification

After any change:

```bash
git --version
docker compose version
cd /path/to/ChatFlow_Pro && npm run check:agent-env
```

For socket-mounted Docker, from the agent container:

```bash
docker compose version
```

## References

- `docs/155_phase17_lobster_and_git_environment.md` — PATH, `check:agent-env`, `report:agent-git`.  
- `docs/158_docker_staging_quickstart.md` — Compose usage for ChatFlow Pro itself.
