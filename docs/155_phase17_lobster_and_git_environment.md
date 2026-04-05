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
- If the agent runs in a **minimal container** or **sandbox without git**, install `git` in the image or mount the host `git` — otherwise commit/push steps will always fail; use `check:agent-env` to fail fast.

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

Report **actual** `git rev-parse HEAD` in `memory/YYYY-MM-DD.md`, not a placeholder.

## References

- `scripts/agent-env-check.mjs` — implementation  
- `AGENTS.md` — workspace note for AI agents  
- `docs/152_phase16_ops_token_rotation_runbook.md` — ops runbook (separate from agent PATH)
