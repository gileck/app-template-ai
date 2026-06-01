---
description: First skill to run after cloning a project from app-template-ai. AI-driven project initialization — configures identity (name/description/theme), env, the local MongoDB user, git hooks, and demo cleanup (what `yarn init-project` does), then verifies the project is correctly set up, checks the Vercel deployment, and sets up the Telegram bot. When it finishes, the project is ready to use.
---

# Initialize This Project

**Run this FIRST, right after cloning a new project from `app-template-ai`.** It takes a fresh clone to a working, verified, deployable app.

It does everything `yarn init-project` does — but **AI-driven and verified at each step** — plus three additions: it confirms the project is actually set up correctly, checks the Vercel deployment is live, and sets up the Telegram bot. When this skill finishes, **the project is ready to use.**

**Run this conversationally and drive it.** Do the deterministic work directly (config edits, verification, fixes); only ask the developer to run a command themselves when it's interactive or needs their credentials. Run `yarn checks` after steps that touch code. Don't advance past a verify gate until it passes.

> 🔒 **You (the agent) must never enter secrets.** API keys, DB URIs, tokens, passwords — direct the developer to put those in `.env.local` themselves. You read/verify which keys exist (not their values) and tell them what's missing.

---

## What `yarn init-project` does (the core this skill drives)

| # | Step | What it sets |
|---|---|---|
| 1 | Ensure `.env` + `.env.local` | Copies from a sibling `../app-template-ai/` if present (or creates empty), and **strips template identity keys** (`LOCAL_USER_ID`, `ADMIN_USER_ID`) so you don't inherit the template author's ids |
| 2 | Init template tracking | Runs `init-template` → creates `.template-sync.json` (holds `init.*` idempotency flags + path-ownership config) |
| 3–5 | Project identity | Prompts name / description / theme color → updates `src/app.config.js` (`appName` + `dbName`), `package.json` name, `src/config/pwa.config.ts`, `public/manifest.json`. Sets the `init.appConfig` flag |
| 6–7 | Local user | Creates a dev user in MongoDB (`local_user_id` / `1234`) and writes `LOCAL_USER_ID` to `.env` |
| 8 | Demo cleanup | Deletes the example features (Todos, Chat, AIChat, demo Home) |
| 9 | Git hooks | `yarn setup-hooks` (installs hooks + marks `yarn.lock` skip-worktree) |
| 10 | Vercel | Prompts `vercel link`, then optionally pushes env vars (excludes `LOCAL_*`) |

It's **idempotent** — every step checks a flag/marker and skips if already done, so re-running is safe.

This skill runs that core, then adds: **verify setup → verify Vercel deployment → set up Telegram bot**.

---

## Phase 0 — Preflight

1. **Refuse on the template repo itself.** If `package.json` `name` is `app-template-ai` (or the working dir is the template clone), STOP — this skill is for child projects. Initializing the template would wipe its demo features (which are its documentation).
2. **Dependencies installed.** If `node_modules` is missing, run `yarn install`.
3. **Clean tree.** Run `git status`. If there are uncommitted changes beyond a fresh clone, note them — this skill edits config files and deletes demos.
4. **Tooling present.** Confirm `node`, `yarn`, and (for later phases) the `vercel` CLI are available; MongoDB must be reachable for the local-user step.

Gate: child project confirmed, deps installed. Continue.

---

## Phase 1 — Secrets (`.env.local`)

The local user creation (Phase 2) and the app itself need a database; later phases need provider keys. **The developer fills these — you only check presence.**

1. Ensure `.env` and `.env.local` exist (Phase 2's script creates them, but `MONGO_URI` must be set *before* it runs, since it writes the local user to that DB).
2. List the keys to set and ask the developer to populate `.env.local`:
   - **Required now:** `MONGO_URI` (the project's own database — not the template's), `RPC_SECRET`.
   - **As needed:** AI provider keys (`ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY`), `JWT_SECRET`, and any others the app's features use.
3. Verify the required keys are present (names only — never echo values). If `MONGO_URI` still points at the template's database, flag it: the new project needs its own DB (the `dbName` is spliced from `src/app.config.js`).

Gate: `MONGO_URI` + `RPC_SECRET` present in `.env.local`. Continue.

---

## Phase 2 — Run the core initialization

`yarn init-project` writes to MongoDB (creates the local user) and is interactive (identity prompts + an optional `vercel link`). Drive it like this:

1. **Decide the identity first** — ask the developer (use `AskUserQuestion`):
   - **Project name** (e.g. "AI Doctor") → becomes `appName` + a derived `dbName` + `package.json` name
   - **Description** (one line, for the PWA manifest)
   - **Theme color** (hex, e.g. `#1188ff`)
2. **Run it.** Because it's interactive and does a DB write, have the developer run it and answer with the values you agreed:
   ```
   ! yarn init-project
   ```
   Tell them exactly what to type at each prompt, and to **decline the `vercel link` step here** (answer `n`) — this skill links Vercel in Phase 5.
   - If `MONGO_URI` is missing/wrong, the local-user step fails — fix Phase 1 and re-run (it's idempotent).
3. After it completes, you take over for verification.

> Already-configured projects: if the identity prompts are skipped (the `init.appConfig` flag is set) or `LOCAL_USER_ID` already exists, that's the idempotency guard working — not an error.

Gate: the script reports initialization complete. Continue.

---

## Phase 3 — Verify the project is set up correctly

Don't trust — verify each result, and fix any gap directly:

- `src/app.config.js` → `appName` is the new name (not `app-template-ai`) and `dbName` is derived/sensible.
- `package.json` `name` updated.
- `src/config/pwa.config.ts` + `public/manifest.json` reflect the name / description / theme color.
- `.env` contains a real `LOCAL_USER_ID` (and it is NOT the template author's — it should be a freshly-created id).
- `.template-sync.json` exists with `init.appConfig` (and other `init.*`) flags set.
- Git hooks installed (`.git/hooks` populated by `yarn setup-hooks`) and `yarn.lock` is skip-worktree.
- Demo features removed (Todos / Chat / AIChat / demo Home gone), and `src/client/routes/index.project.ts` / `src/apis/apis.project.ts` no longer reference them. If `/` is now unrouted, decide with the developer (redirect, placeholder, or leave for their first feature) — see `/cleanup-template-demo` for the routing follow-up.

Fix anything off (you can edit the config files directly). Then continue.

---

## Phase 4 — Validate the build + boot

1. **`yarn checks`** must pass (TypeScript, ESLint, circular deps, unused deps). Fix any project-layer failures (see `/fix-checks` if they're tangled).
2. **Boot it.** `yarn dev`, load the app, and confirm it renders. Sign in with the seeded local user (`local_user_id` / `1234`) to prove the DB + auth wiring works end-to-end.

Gate: checks green and the app boots + logs in. Continue.

---

## Phase 5 — Vercel: link, push env, verify deployment

1. **Link** (needs the developer's Vercel auth):
   ```
   ! vercel link
   ```
   Confirm `.vercel/project.json` now exists and names the right project.
2. **Push env vars** — this changes Vercel project configuration, so **confirm the key list with the developer first** (values aren't shown; `LOCAL_*` keys are excluded automatically):
   ```
   yarn vercel-cli env:push
   ```
   Remind them to remove any dev-only values (e.g. a local MongoDB URI) before pushing.
3. **Verify the deployment is live** (the addition). After a push to the connected branch triggers a build — or trigger one — check it reaches **Ready**:
   ```
   npx vercel ls          # latest deployment + status
   npx vercel inspect <deployment-url>   # details if a build failed
   ```
   If the latest build is **Error**, read the build logs (`yarn vercel-cli logs --deployment <id>`), fix the cause (commonly a missing env var or a `yarn checks` failure), and redeploy. Don't finish this phase until a deployment is **Ready**.

Gate: a Vercel deployment is **Ready**. Continue.

---

## Phase 6 — Set up the Telegram bot

The template uses Telegram for owner alerts, deploy notifications, and approval flows (RPC sessions, agent workflows). Set it up now so those work later.

- Run the dedicated skill: **`/setup-telegram-bot`** — it creates the bot, captures the token + owner chat id, pushes them to Vercel, and registers the webhook. Follow it to completion.
- Optional follow-up the developer may want next: **`/setup-vercel-deploy-notifications`** (Vercel → Telegram deploy pings), which depends on the bot existing.

Gate: `/setup-telegram-bot` reports success (bot reachable, owner chat id set). Continue.

---

## Phase 7 — Done: the project is ready

Confirm and summarize:
- ✅ Identity configured (name / description / theme) and verified
- ✅ `.env.local` has the required secrets; `LOCAL_USER_ID` seeded (fresh, not the template author's)
- ✅ `yarn checks` green; app boots and the local user logs in
- ✅ Vercel linked, env pushed, a deployment is **Ready**
- ✅ Telegram bot set up

Then point the developer at sensible next steps for THIS project:
- **`/enable-rpc-calls`** — if they'll use the AI agent or any RPC-backed feature (the agent can't run without it).
- **`/build-app-agent`** — build the app's domain-specific AI agent.
- **`/create-app-icon`** — generate the PWA app icon.
- **`/cleanup-template-demo`** — remove any remaining demo features (e.g. the Agent demo) they don't want.

Offer to commit the initialization changes (don't commit unprompted). Suggested message: `chore: initialize <project name> from app-template-ai`.

---

## Quick reference

| Need | Command / skill |
|---|---|
| Core init (env, template tracking, identity, local user, hooks, demo cleanup) | `yarn init-project` |
| Validate | `yarn checks`, `yarn dev` |
| Vercel link / env / deploys | `vercel link`, `yarn vercel-cli env:push`, `npx vercel ls` |
| Telegram bot | `/setup-telegram-bot` |
| RPC (needed for the agent) | `/enable-rpc-calls` |
| Build the app's agent | `/build-app-agent` |
| Remove demo features | `/cleanup-template-demo` |
