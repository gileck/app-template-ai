---
description: Enable RPC calls in a child project — register the local daemon as a task-cli daemon, mount the RPC indicator in the top nav, and verify end-to-end.
---

# Enable RPC Calls (Child Project)

Wires the template's RPC-over-MongoDB transport into a child project:
1. Registers `yarn daemon` as a managed daemon task via `task-cli` (auto-restart, log capture).
2. Mounts `RpcConnectionIndicator` in the top nav so admins can Connect / Test / Stop from any page.
3. Verifies the daemon is up and tells the user exactly what to click to test.

The RPC system itself (daemon code, gate, `/admin/rpc-connection` page) ships with the template — this skill is the per-project install + wiring.

**Run this conversationally.** Each step has a verify gate. Do not advance until the verify passes.

---

## Background the agent needs

| Piece | Where | Owner |
|---|---|---|
| Daemon script | `src/server/template/rpc/daemon.ts` (run via `yarn daemon`) | template |
| Connection gate + indicator UI | `src/server/template/rpc/`, `src/client/features/template/rpc-connection/` | template |
| `RpcConnectionIndicator` mount | `src/client/components/project/NavLinks.project.tsx` → `TopNavBarRightSlot` | **project** |
| task-cli daemon registration | `agent-tasks/rpc-daemon/config.json` | **project** (not synced) |
| `RPC_SECRET` env var | `.env.local` (local) + Vercel (production+preview) | shared between sides |
| `MONGO_URI` env var | `.env.local` (local) + Vercel | shared (already present) |

Both sides of the transport (Vercel + local daemon) must share the **same** `RPC_SECRET` and the **same** `MONGO_URI`. Anything else and the daemon will reject jobs or read from the wrong database.

The gate is admin-only in v1 (route + APIs gated to `ADMIN_USER_ID`), so the indicator self-hides for non-admins. Telegram approval + bot setup must already be in place — if not, this skill blocks at Step 5 and points the user at `setup-vercel-deploy-notifications` / `yarn telegram-setup`.

---

## Step 0 — Pre-flight

```bash
# Must be a child project, not the template itself
node -p "require('./package.json').name"
```

If the name is `app-template-ai`, **refuse** with: "This skill is for child projects. The template repo already has its own rpc-daemon task — don't double-register it."

Then:

```bash
git status --porcelain
```

If dirty, ask the user to commit or stash first. This skill edits a project-owned file (`NavLinks.project.tsx`) and writes a new config; rollback on a dirty tree is messy.

```bash
# Confirm the daemon script exists in package.json
node -p "require('./package.json').scripts.daemon || ''"
```

Empty result → the template's `daemon` script hasn't been synced yet. Tell the user to run a template sync first; do not proceed.

```bash
# Confirm task-cli is installed and the Task Manager app is running
task-cli status >/dev/null 2>&1 && echo OK || echo "task-cli not reachable"
```

If not reachable, tell the user: install `task-cli` and make sure the Task Manager app is running, then re-run this skill.

---

## Step 1 — Ensure `MONGO_URI` is present locally

```bash
grep -q '^MONGO_URI=' .env.local && echo OK || echo MISSING
```

If missing, **stop**. RPC needs MongoDB — the user must finish DB setup first. Don't fabricate a value.

---

## Step 2 — Ensure `RPC_SECRET` is present locally and on Vercel

The same secret must live in both places. If only one side has it (or the values differ), the daemon will silently reject every job.

### 2a. Local

```bash
if grep -q '^RPC_SECRET=' .env.local; then
  echo "OK — using existing value"
else
  SECRET=$(openssl rand -hex 32)
  printf '\nRPC_SECRET=%s\n' "$SECRET" >> .env.local
  echo "Generated and wrote RPC_SECRET to .env.local"
fi
```

### 2b. Vercel

```bash
SECRET=$(grep '^RPC_SECRET=' .env.local | cut -d= -f2-)
yarn vercel-cli env:set --name RPC_SECRET --value "$SECRET" --target production,preview
```

(Use `env:set`, not `env:add` or piped input — it uses the Vercel API and avoids trailing-newline bugs that have bitten us before.)

After pushing, the user must redeploy for the new env to take effect — but defer that to Step 6 so we only redeploy once.

**Verify** the value matches both sides:

```bash
LOCAL=$(grep '^RPC_SECRET=' .env.local | cut -d= -f2- | head -c 8)
REMOTE=$(yarn vercel-cli env:get --name RPC_SECRET --target production 2>/dev/null | tail -1 | head -c 8)
[[ "$LOCAL" == "$REMOTE" ]] && echo "MATCH" || echo "MISMATCH"
```

If `MISMATCH`, re-run 2b and recheck. Do not proceed until the first 8 chars match.

---

## Step 3 — Register the daemon with task-cli

The template's own `agent-tasks/rpc-daemon/config.json` is a reference, **but it points at the template's working directory** — child projects need their own.

### 3a. Derive the values

```bash
REPO_NAME=$(node -p "require('./package.json').name")
PROJECT_DIR=$(pwd)
echo "Repo: $REPO_NAME"
echo "Dir:  $PROJECT_DIR"
```

### 3b. Write the config

```bash
mkdir -p agent-tasks/rpc-daemon/runs
```

Then write `agent-tasks/rpc-daemon/config.json` with the derived values spliced in (replace `<repo-name>` and `<project-dir>` literally — do not leave placeholders):

```json
{
  "name": "RPC Daemon (<repo-name>)",
  "uniqueKey": "<repo-name>:rpc-daemon",
  "groupName": "<repo-name>",
  "description": "Polls MongoDB for remote function calls and executes locally (residential IP)",
  "script": {
    "path": "daemon",
    "args": ["--verbose"],
    "interpreter": "npm",
    "workingDirectory": "<project-dir>"
  },
  "schedule": {
    "type": "daemon"
  },
  "daemon": {
    "restartDelayMs": 5000,
    "maxRestarts": 5,
    "restartWindowMs": 300000,
    "healthyRunMs": 60000
  },
  "notifications": {
    "onStart": false,
    "onSuccess": false,
    "onFailure": true
  },
  "options": {
    "enabled": true,
    "allowParallelRuns": false,
    "requiresInternet": true
  },
  "output": {
    "logFile": "<project-dir>/agent-tasks/rpc-daemon/runs/output.log",
    "statusFile": "<project-dir>/agent-tasks/rpc-daemon/runs/status.json"
  }
}
```

Key points (do not edit silently):
- `uniqueKey` must be `<repo-name>:rpc-daemon` so it doesn't collide with the template's `app-template-ai:rpc-daemon` or other projects' daemons in task-cli.
- `schedule.type: "daemon"` (NOT `interval`) — this is a long-running process, not a polled cron.
- `workingDirectory` must be the **project's own root**, not `agents-copy/<repo>` (the workflow agents use agents-copy; the daemon uses the live repo because it imports project handlers from `src/server/project/**`).
- `output.logFile` must be absolute — task-cli does not resolve relative paths.

### 3c. Register

```bash
task-cli create --config=./agent-tasks/rpc-daemon/config.json
```

If task-cli reports the key already exists, the user re-ran the skill or set it up manually. Confirm before overwriting:

```bash
task-cli edit "<repo-name>:rpc-daemon" --config=./agent-tasks/rpc-daemon/config.json
```

### 3d. Start it (task-cli does NOT auto-start a freshly-created daemon)

```bash
task-cli daemon start "<repo-name>:rpc-daemon"
```

---

## Step 4 — Mount the indicator in the top nav

Edit `src/client/components/project/NavLinks.project.tsx` (project-owned, never synced).

If the file is missing the import, add it at the top:

```ts
import { RpcConnectionIndicator } from '@/client/features/template/rpc-connection';
```

Then ensure `TopNavBarRightSlot` returns the indicator. If the slot is already exported with other content, compose them in a flex row — don't overwrite existing controls:

```tsx
// New project — slot was previously `null`
export const TopNavBarRightSlot = (): ReactNode => <RpcConnectionIndicator />;

// Project already uses the slot for something else — compose:
export const TopNavBarRightSlot = (): ReactNode => (
  <div className="flex items-center gap-2">
    <RpcConnectionIndicator />
    <ExistingPill />
  </div>
);
```

Heads-up: `RpcConnectionIndicator` self-hides for non-admins via `useIsAdmin()`, so it's safe to mount unconditionally — don't add an extra admin gate around it.

**Verify** the edit:

```bash
yarn checks
```

Must end with 0 errors before continuing. If TypeScript flags an unused import or a missing slot type, fix in place — do not paper over with `eslint-disable`.

---

## Step 5 — Verify the daemon is up

```bash
task-cli daemon list 2>&1 | grep -E "<repo-name>:rpc-daemon"
```

Status must be `Up`. If it's `Down` / `Failed (crash loop)`, stream the log to find out why:

```bash
task-cli daemon logs "<repo-name>:rpc-daemon"
# Ctrl+C after a few seconds — we just want the first error
```

Common failures and what they mean:

| Log line | Cause | Fix |
|---|---|---|
| `MONGO_URI is required` | env var missing from the daemon's process env | Daemon reads `.env.local` via `src/agents/shared/loadEnv` — confirm it exists at the project root |
| `MongoServerError: bad auth` | wrong `MONGO_URI` | Re-paste from your Atlas dashboard, confirm user/password URL-encoded |
| `RPC_SECRET is required` | missing local secret | Step 2a |
| `Error: Cannot find module 'tsx'` | `node_modules` missing | `yarn install` in the project dir |
| `EADDRINUSE` / `lock` errors | another daemon already polling | `task-cli daemon list` — kill the duplicate |

Re-start after fixing:

```bash
task-cli daemon restart "<repo-name>:rpc-daemon"
```

Tail the log and confirm you see the `[rpc-daemon] polling for jobs...` line (verbose mode) before moving on. If you don't see it within ~5 seconds, the daemon never reached the poll loop — keep debugging.

---

## Step 6 — Redeploy Vercel (only if Step 2b set/changed `RPC_SECRET`)

If you generated a new secret in Step 2a, env-var change only applies to the **next** Vercel deployment:

```bash
yarn vercel-cli redeploy --message "chore: enable RPC daemon — set RPC_SECRET"
```

Skip this if `RPC_SECRET` was already present and unchanged on Vercel.

---

## Step 7 — Tell the user how to test

End the skill with these instructions. Do not click these yourself — the test requires Telegram approval from the human admin.

> **You're set up. To verify end-to-end:**
>
> 1. Open the app and sign in as the admin user (the one matching `ADMIN_USER_ID`).
> 2. You should now see a small **`RPC ●`** pill in the top-right of the header. The dot is **gray** (offline session).
> 3. Click it → opens a dialog → click **Connect**. The dot turns **yellow** (pending approval).
> 4. Check your owner Telegram chat — there's a message with **✅ Approve** / **❌ Reject** buttons. Tap **Approve**.
> 5. The dot turns **green**. Click **Test** in the dialog (or go to `/admin/rpc-connection` → Test).
> 6. Within ~2 seconds it should report **success** with a round-trip latency. That confirms: Vercel → MongoDB → daemon → MongoDB → Vercel all working.
>
> If **Test** hangs and eventually fails with *"No RPC daemon picked up the job…"*, the daemon isn't actually polling — go back to Step 5 and re-check `task-cli daemon list` + logs.
>
> If Connect fails because no Telegram message arrives, the owner chat isn't configured. Run `yarn telegram-setup` and verify `appConfig.ownerTelegramChatId` is set.

---

## Quick checklist (agent ticks these off as you go)

- [ ] Confirmed this is a child project (`package.json` name ≠ `app-template-ai`)
- [ ] Git tree clean
- [ ] `package.json` has the `daemon` script (template synced)
- [ ] `task-cli status` reachable
- [ ] `MONGO_URI` in `.env.local`
- [ ] `RPC_SECRET` in `.env.local`
- [ ] `RPC_SECRET` pushed to Vercel (production + preview), first 8 chars match local
- [ ] `agent-tasks/rpc-daemon/runs/` exists
- [ ] `agent-tasks/rpc-daemon/config.json` written with `uniqueKey: <repo>:rpc-daemon`, absolute paths, `schedule.type: "daemon"`
- [ ] `task-cli create` succeeded (or `edit` if pre-existing)
- [ ] `task-cli daemon start <repo>:rpc-daemon` ran
- [ ] `NavLinks.project.tsx` imports `RpcConnectionIndicator` and exports it via `TopNavBarRightSlot`
- [ ] `yarn checks` passes (0 errors)
- [ ] `task-cli daemon list` shows the daemon as **Up**
- [ ] Daemon log shows `polling for jobs...`
- [ ] Vercel redeployed (only if `RPC_SECRET` was new/changed)
- [ ] User instructed to Connect → approve in Telegram → Test
