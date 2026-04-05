# Phase 17.x — Lobster / local agent: Git-capable environment

## Goal

Local agents (**龙虾** / OpenClaw / other CLI workers) must be able to run **`git`** from the ChatFlow Pro repo root so they can report real **HEAD SHA**, **commit**, and **push** — not “simulated” git.

## One-command check

From the repo root (`C:\AI_WORKSPACE\Chatflow\ChatFlow_Pro` or your clone):

```bash
npm run check:agent-env
```

- Prints `node`, `npm`, `git --version`, `git rev-parse HEAD`, current branch.  
- **Exit code 1** if `git` is missing or cwd is not a git work tree.

Agents should run this **once per session** before any task that includes “commit / push / CI”.

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

## References

- `scripts/agent-env-check.mjs` — strict check (git on PATH)  
- `scripts/agent-git-metadata.mjs` / `scripts/agent-git-fs.mjs` — SHA without git CLI  
- `AGENTS.md` — workspace note for AI agents  
- `docs/152_phase16_ops_token_rotation_runbook.md` — ops runbook (separate from agent PATH)
