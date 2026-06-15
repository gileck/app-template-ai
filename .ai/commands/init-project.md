---
description: First skill to run after cloning a project from app-template-ai. AI-driven project initialization — configures identity (name/description/theme), env, the local MongoDB user, git hooks, and demo cleanup (what `yarn init-project` does), then verifies the project is correctly set up, checks the Vercel deployment, and sets up the Telegram bot. When it finishes, the project is ready to use.
---

# Initialize This Project

**Run this FIRST, right after cloning a new project from `app-template-ai`.** It takes a fresh clone to a working, verified, deployable app.

It does everything `yarn init-project` does — but **AI-driven and verified at each step** — plus three additions: it confirms the project is actually set up correctly, checks the Vercel deployment is live, and sets up the Telegram bot. When this skill finishes, **the project is ready to use.**

**Run this conversationally and drive it.** Do the deterministic work directly (config edits, verification, fixes); only ask the developer to run a command themselves when it's interactive or needs their credentials. Run `yarn checks` after steps that touch code. Don't advance past a verify gate until it passes.

> 🔒 **You (the agent) must never enter secrets.** API keys, DB URIs, tokens, passwords — direct the developer to put those in `.env.local` themselves. You read/verify which keys exist (not their values) and tell them what's missing.

> 🛠️ **Use the structured tools, not fragile shell.** For verification (checking a key exists, a file's content, whether a demo dir is gone) prefer **Read / Grep / Glob** over hand-written `grep`/`for`/`cat` pipelines — `for…done` loops and piped heredocs repeatedly broke mid-run in past inits. Reserve Bash for actual commands (`yarn …`, `git …`, `vercel …`). When you do need a one-off shell check, keep it a single non-looping command.

---

## Fast path (happy case)

Most fresh clones need only this — the phases below are the full detail + recovery. Skim Phase 0, then:

1. **Confirm prerequisites:** child repo (not the template), `node_modules` present, `MONGO_URI` + `RPC_SECRET` in `.env.local`, git `origin` is THIS project's repo. (Phases 0–1.)
2. **Gather identity in one `AskUserQuestion`** (name + description + theme), then run init non-interactively:
   ```
   ! yarn init-project --name "<Name>" --description "<one line>" --theme "<#hex>" --no-vercel
   ```
3. **Finish demo cleanup:** run **`/cleanup-template-demo`** (init deletes demo dirs but not their route/api references).
4. **Validate:** `yarn checks` green, then `yarn dev` + log in as `local_user_id` / `1234`. (Phases 3–4.)
5. **Deploy + finish:** Vercel link + env + verify Ready (Phase 5), owner account (6), Telegram (7), summarize (8).

If anything is off, drop into the matching phase below.

---

## What `yarn init-project` does (the core this skill drives)

| # | Step | What it sets |
|---|---|---|
| 1 | Ensure `.env` + `.env.local` | Copies from a sibling `../app-template-ai/` if present (or creates empty), and **strips template-specific keys** so you don't inherit the template author's values: identity (`LOCAL_USER_ID`, `ADMIN_USER_ID`); services (`TELEGRAM_BOT_TOKEN`, `CLAUDE_TELEGRAM_BOT_TOKEN`, `OWNER_TELEGRAM_CHAT_ID`, `VERCEL_TELEGRAM_CHAT_ID`, `VERCEL_WEBHOOK_SECRET`, `AUTH_MODE`, `WEBAUTHN_RP_ID` — otherwise the child points at the template's bot/chat or gets locked into passkey mode with no enrolled passkeys); and Vercel deployment (`VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_OIDC_TOKEN` — otherwise the new project's app URL silently resolves to `app-template-ai.vercel.app`). Identity + service keys are stripped on copy only; the Vercel deployment keys are stripped on every run |
| 2 | Init template tracking | Runs `init-template` → creates `.template-sync.json` (holds `init.*` idempotency flags + path-ownership config) |
| 3–5 | Project identity | Prompts name / description / theme color → updates `src/app.config.js` (`appName` + `dbName`), `package.json` name, `src/config/pwa.config.ts`, `public/manifest.json`. Sets the `init.appConfig` flag |
| 6–7 | Local user | Via **`yarn create-local-user`** — reuses the app's real `users.insertUser` + `SALT_ROUNDS` + approval logic (so the seeded user matches the current schema and is created **approved**), then writes `LOCAL_USER_ID` to `.env`. `LOCAL_USER_ID` is a dev-only auth shortcut that also grants admin locally |
| 8 | Demo cleanup | Deletes the example features (Todos, Chat, AIChat, demo Home) |
| 9 | Git hooks | `yarn setup-hooks` (installs hooks + marks `yarn.lock` skip-worktree) |
| 10 | Register with template | Appends this child's `../<dir-name>` to the template's `child-projects.json` (at `../app-template-ai/`) so `yarn sync-children` run from the template picks it up. Idempotent; best-effort (skips if the template isn't a sibling) |
| 11 | Vercel | Prompts `vercel link`, then optionally pushes env vars (excludes `LOCAL_*`). Skipped entirely with `--no-vercel`; `--core-env` narrows the push to boot/auth essentials |

It's **idempotent** — every step checks a flag/marker and skips if already done, so re-running is safe.

This skill runs that core, then adds: **verify setup → verify Vercel deployment → set up Telegram bot**.

---

## Phase 0 — Preflight

1. **Refuse on the template repo itself — check the PATH, not the package name.** Initializing the template would wipe its demo features (which are its documentation), so refuse if you're in it. But the `package.json` `name` is `app-template-ai` in *every* fresh child too (it's a copy artifact this skill fixes in Phase 2), so it is NOT a reliable signal — **do not gate on it.** Instead determine "am I the template?" the way the codebase does (`scripts/template/init-project.js` → `isTemplateRepoItself()`):
   - **It's the template (STOP):** the working directory's basename is `app-template-ai` (e.g. `~/Projects/app-template-ai`) **and** `.template-sync.json` has an empty/absent `templateRepo`. (Git origin alone is not a discriminator — the in-app scaffold flow repoints a child's origin back at the template repo.)
   - **It's a child (PROCEED):** the directory is named anything else (e.g. `~/Projects/test-project`), **or** `.template-sync.json` already has a non-empty `templateRepo`. A child whose `package.json` still says `app-template-ai` is the *normal* starting state — proceed without asking.
   - **Only if genuinely ambiguous** (dir basename *is* `app-template-ai` but `templateRepo` is already set) ask the developer to confirm before doing anything destructive.
2. **Check the git remote points at THIS project's repo, not the template.** A fresh child often still has `origin` pointing at `gileck/app-template-ai` (the scaffold flow leaves it there). Run `git remote get-url origin` — if it ends in `gileck/app-template-ai(.git)`, the project has **no repo of its own yet**. Push + Vercel-link would then target the template. Have the developer create/point their repo BEFORE Phase 5:
   ```
   gh repo create <your-project> --private --source=. --remote=origin --push
   # or: git remote set-url origin <your-repo-url>
   ```
   (`init-project` also prints this warning at startup; local init still proceeds, but don't deploy until origin is fixed.)
3. **Dependencies installed.** If `node_modules` is missing, run `yarn install`.
4. **Clean tree.** Run `git status`. If there are uncommitted changes beyond a fresh clone, note them — this skill edits config files and deletes demos.
5. **Tooling present.** Confirm `node`, `yarn`, and (for later phases) the `vercel` CLI are available; MongoDB must be reachable for the local-user step.

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

`yarn init-project` writes to MongoDB (creates the local user). It prompts for identity by default, but **you should drive it non-interactively via flags** (below) so it runs in one clean pass — no stdin prompts to babysit. Drive it like this:

1. **Decide the identity first — ask ALL of it up front in ONE `AskUserQuestion` batch** (name, description, theme color together). Front-loading every question means the rest of init runs in a single uninterrupted pass:
   - **Project name** (e.g. "AI Doctor") → becomes `appName` + a derived `dbName` + `package.json` name
   - **Description** (one line, for the PWA manifest)
   - **Theme color** (hex, e.g. `#1188ff`)
2. **Run it non-interactively — pass the identity as flags so there are no stdin prompts** (piping answers via `printf ... | yarn init-project` hits stdin-EOF on the 2nd prompt and aborts half-initialized; flags avoid that entirely):
   ```
   ! yarn init-project --name "AI Doctor" --description "..." --theme "#1188ff" --no-vercel
   ```
   - `--no-vercel` skips the link/env-push prompts (this skill does Vercel in Phase 5 — so use `--no-vercel` here). `--core-env` only matters when you DON'T pass `--no-vercel`: it narrows the push to boot/auth essentials and auto-confirms it (no prompt). Since this skill defers Vercel to Phase 5, `--core-env` is normally irrelevant during init — the core-vs-full choice happens at `env:sync` time.
   - Flags win over env vars win over interactive prompts; the same values are also accepted as `INIT_PROJECT_NAME` / `INIT_PROJECT_DESCRIPTION` / `INIT_PROJECT_THEME` / `INIT_NO_VERCEL=1` / `INIT_CORE_ENV=1` / `INIT_YES=1`.
   - It does a DB write — if `MONGO_URI` is missing/wrong, the local-user step fails. Fix Phase 1 and re-run (it's idempotent).
3. After it completes, you take over for verification.

> The local user is created by **`yarn create-local-user`** (which `init-project` calls) — a non-interactive, idempotent script that reuses the app's real user code. If you ever need just that step (e.g. the DB was reset), you can run `yarn create-local-user` directly yourself — no interactive prompts.

> Already-configured projects: if the identity prompts are skipped (the `init.appConfig` flag is set) or `LOCAL_USER_ID` already exists, that's the idempotency guard working — not an error.

Gate: the script reports initialization complete. Continue.

---

## Phase 3 — Verify the project is set up correctly

Don't trust — verify each result, and fix any gap directly:

- `src/app.config.js` → `appName` is the new name (not `app-template-ai`) and `dbName` is derived/sensible.
- `package.json` `name` updated.
- `src/config/pwa.config.ts` + `public/manifest.json` reflect the name / description / theme color. `init-project` registers `src/config/pwa.config.ts` under `.template-sync.json` → `projectOverrides` (its per-project identity edits would otherwise trip the template-ownership pre-commit guard); confirm it's listed.
- `.env` contains a real `LOCAL_USER_ID` (and it is NOT the template author's — it should be a freshly-created id).
- `.env` / `.env.local` did NOT inherit the template's Vercel values. `init-project` now strips the leaky PROJECT keys (`VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_OIDC_TOKEN`) from `.env`/`.env.local` on **every run** — not just on copy — so a pre-populated env is cleaned too. Confirm: `grep -nE '^VERCEL_PROJECT_PRODUCTION_URL=|^VERCEL_OIDC_TOKEN=' .env.local` prints nothing (Vercel re-provides the correct per-project URL at deploy time). The identity keys (`LOCAL_USER_ID`/`ADMIN_USER_ID`) are intentionally left alone on existing files — they belong to this project.
- If `AUTH_MODE=passkey` (passkey login), `WEBAUTHN_RP_ID` must be the **production domain host** (no scheme) — passkeys bind to the rpID and break without it. You get the domain in Phase 5 (`yarn vercel-cli domain`); see `/migrate-to-passkeys`.
- `.template-sync.json` exists with `init.appConfig` (and other `init.*`) flags set.
- Git hooks installed (`.git/hooks` populated by `yarn setup-hooks`) and `yarn.lock` is skip-worktree. **yarn.lock is intentionally NOT committed** in children — it's gitignored, and the pre-commit hook actively blocks it. Local installs against a private registry (e.g. `npm.dev.wixpress.com`) rewrite its URLs, which would break Vercel builds (they can only reach public npm). So: never `git add yarn.lock`, never "fix" it by regenerating + committing. If a stray `yarn.lock` is tracked, drop it with `git rm --cached yarn.lock` (the hook permits the deletion) and ensure it's in `.gitignore` — don't fight the hook.
- Demo features removed (Todos / Chat / AIChat / demo Home gone). **`init-project` deletes the demo *directories* but NOT their references** — `src/client/routes/index.project.ts` and `src/apis/apis.project.ts` can still import the now-deleted modules, which fails `yarn checks` in Phase 4. **Finish the cleanup now by running `/cleanup-template-demo`** (it strips the route/api references and resolves the empty `/` route) rather than deferring it — that keeps Phase 4's `yarn checks` green. If `/` is left unrouted, decide with the developer (redirect, placeholder, or leave for their first feature).

Fix anything off (you can edit the config files directly). Then continue.

---

## Phase 4 — Validate the build + boot

1. **`yarn checks`** must pass (TypeScript, ESLint, circular deps, unused deps). Fix any project-layer failures (see `/fix-checks` if they're tangled).
2. **Boot it.** `yarn dev`, load the app, and confirm it renders. Sign in with the seeded local user (`local_user_id` / `1234`) to prove the DB + auth wiring works end-to-end.
   - **If you get a passkey login screen instead of the password form (or auto-auth), suspect a leaked shell env var — NOT a project misconfig.** `getAuthMode()` reads `process.env.AUTH_MODE`, and a `process.env` value beats anything in `.env`/`.env.local`. Check with `printenv AUTH_MODE`: if it prints `passkey`, the dev server inherited it from your shell (a previous `export AUTH_MODE=passkey`). Confirm it's absent from the files (`grep -n '^AUTH_MODE=' .env .env.local` → nothing), then restart the server with it unset: `unset AUTH_MODE && yarn dev`. This leak is local-only and never affects Vercel.

Gate: checks green and the app boots + logs in (password form / auto-auth, not passkey). Continue.

---

## Phase 5 — Vercel: link, push env, verify deployment

1. **Link** (needs the developer's Vercel auth):
   ```
   ! vercel link
   ```
   Confirm `.vercel/project.json` now exists and names the right project.
2. **Sync env vars** — this changes Vercel project configuration, so **confirm the key list with the developer first** (values aren't shown). Use `env:sync`: it reads `.env.local` by default and skips local-only keys — `VERCEL_OIDC_TOKEN`, `VERCEL_TOKEN`, `VERCEL_PROJECT_PRODUCTION_URL`, `RPC_LOCAL_DIRECT`, `TEST_*`, `IGNORE_*` (so dev shortcuts and personal/ephemeral tokens never reach prod). Preview first:
   ```
   yarn vercel-cli env:sync --dry-run         # preview what would sync
   yarn vercel-cli env:sync                    # sync .env.local → Vercel (all envs)
   ```
   Still scrub any dev-only value the filter can't know about (e.g. a local `MONGO_URI`) before syncing. (`env:push --file .env.local` is the lower-level alternative — it now applies the same exclusion list; use `env:rm --name X` to delete a var that slipped through.)
3. **Verify the deployment is live.** A push to the connected branch triggers a build — check it reaches **Ready** (prefer the project's own CLI over `npx vercel`, which can be network-blocked in agent sandboxes):
   ```
   yarn vercel-cli list                       # latest deployment + status
   yarn vercel-cli logs --deployment <id>     # build logs if it failed
   ```
   If the latest build is **Error**, read the logs, fix the cause (commonly a missing env var or a `yarn checks` failure), and redeploy (`yarn vercel-cli redeploy`). Don't finish this phase until a deployment is **Ready**.
4. **Lock in the app URL — verify it points at THIS project.** Absolute links (passkey enrollment, password reset, login-approval, Telegram deep-links, WebAuthn origin) come from `appConfig.appUrl`. Now that the project has deployed, read its **canonical production domain** straight from Vercel:
   ```
   yarn vercel-cli domain                      # e.g. https://<project>-<hash>.vercel.app (or your custom domain)
   yarn vercel-cli domain --plain              # bare URL; capture with: URL=$(yarn --silent vercel-cli domain --plain)
   ```
   This calls the Vercel API (`GET /v9/projects/{projectId}/domains`) and returns the real production domain — NOT a per-deployment alias (`info --deployment` shows those), and NOT the `<project>.vercel.app` short name (another account may already own it). **Verify** `appConfig.appUrl` resolves to this domain:
   - **Normal case (nothing to do):** with the leaky `VERCEL_PROJECT_PRODUCTION_URL` stripped in Phase 1, Vercel auto-injects the correct per-project value and `appUrl` already matches.
   - **If it doesn't match** — an older project that inherited `app-template-ai.vercel.app`, or a **custom domain** Vercel reports here — pin the real domain (sets `NEXT_PUBLIC_APP_URL`, resolution priority #1, locally + all Vercel envs) and redeploy so it takes effect:
     ```
     yarn vercel-cli domain --set-app-url       # detect + pin in one step
     yarn vercel-cli redeploy                   # env changes only affect NEW builds
     ```

Gate: a Vercel deployment is **Ready** and `appConfig.appUrl` points at this project's own domain. Continue.

---

## Phase 6 — Create the production owner account

The `local_user_id` from Phase 2 is a **dev-only** shortcut (it auto-authenticates on localhost). Production has no such shortcut — sign-ups go through the real auth flow, which is **gated by admin approval** (`requireAdminApproval`, on by default). So you need a real, approved owner account, and an admin to approve any future sign-ups.

**Key facts (explain these to the developer, then pick a path):**
- **First-user-wins:** on a *fresh* production database with no users yet, the **first** sign-up is auto-approved, and the server logs `Set ADMIN_USER_ID=<id>`. That first user becomes your admin.
- **`ADMIN_USER_ID`** designates the admin — it bypasses the approval gate and can approve others via `/admin/approvals`.
- **Shared vs separate DB matters:** if local and production use the **same** `MONGO_URI` + `dbName`, the `local_user_id` you created in Phase 2 already consumed the first-user slot — so a production sign-up will land **pending**. Prefer a **separate production database** so prod gets its own clean first-user bootstrap.

**Pick the path that fits:**
- **A — Fresh prod DB (recommended):** deploy, then **sign up your real account first** on the production URL → auto-approved. Grab the `_id` from the build/runtime logs and set **`ADMIN_USER_ID=<id>`** in `.env.local` and on Vercel (`yarn vercel-cli env:push`), then redeploy.
- **B — Bootstrap directly (no sign-up UI):** run the canonical script against the production database — it creates the user **already approved**, so no approval dance:
  ```
  yarn create-user --username <you> --password <pw> --admin
  ```
  (the developer runs this with their own password — you must not enter it). Then set `ADMIN_USER_ID=<printed id>` on Vercel.
- **C — Approve a pending sign-up:** if someone already signed up and is pending (e.g. shared DB), an existing **admin** approves them via **`/admin/approvals`**. So you only need the create-then-approve flow for *organic third-party* sign-ups — not for your own owner account (use A or B).

Gate: a real, **approved** owner account exists and `ADMIN_USER_ID` is set (locally + Vercel). Continue.

---

## Phase 7 — Set up the Telegram bot

The template uses Telegram for owner alerts, deploy notifications, and approval flows (RPC sessions, agent workflows). Set it up now so those work later.

- Run the dedicated skill: **`/setup-telegram-bot`** — it creates the bot, captures the token + owner chat id, pushes them to Vercel, and registers the webhook. Follow it to completion.
- Optional follow-up the developer may want next: **`/setup-vercel-deploy-notifications`** (Vercel → Telegram deploy pings), which depends on the bot existing.

Gate: `/setup-telegram-bot` reports success (bot reachable, owner chat id set). Continue.

---

## Phase 8 — Done: the project is ready

Confirm and summarize:
- ✅ Identity configured (name / description / theme) and verified
- ✅ `.env.local` has the required secrets; `LOCAL_USER_ID` seeded (fresh, not the template author's)
- ✅ `yarn checks` green; app boots and the local user logs in
- ✅ Vercel linked, env pushed, a deployment is **Ready**; `appConfig.appUrl` points at this project's own domain (`yarn vercel-cli domain`)
- ✅ Production owner account exists + approved; `ADMIN_USER_ID` set (locally + Vercel)
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
| Core init, non-interactive (agent-driven) | `yarn init-project --name "X" --description "..." --theme "#1188ff" --no-vercel` |
| Seed the local dev user (idempotent, approved) | `yarn create-local-user` |
| Create an approved owner/admin user (any DB) | `yarn create-user --username <u> --password <pw> --admin` |
| Validate | `yarn checks`, `yarn dev` |
| Vercel link / env / deploys | `vercel link`, `yarn vercel-cli env:sync` (or `--dry-run`), `yarn vercel-cli list` |
| Remove an env var (where `npx vercel` is blocked) | `yarn vercel-cli env:rm --name X [--target production]` |
| Get the production domain / fix app URL | `yarn vercel-cli domain`, `yarn vercel-cli domain --set-app-url` |
| Telegram bot | `/setup-telegram-bot` |
| RPC (needed for the agent) | `/enable-rpc-calls` |
| Build the app's agent | `/build-app-agent` |
| Remove demo features | `/cleanup-template-demo` |
