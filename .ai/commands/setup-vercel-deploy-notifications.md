---
description: Configure Vercel webhook → Telegram deployment notifications for the current project
---

# Setup Vercel → Telegram Deployment Notifications

Wire Vercel's deployment webhook to this project's `/api/vercel-webhook` handler so every deployment (CLI, dashboard, git push) posts to Telegram. The handler is already shipped in the template — this skill is just the per-project config checklist.

Catches every deploy — `vercel --prod` from your laptop, one-click "Redeploy" from the Vercel dashboard, branch previews without a PR, and standard git-push deploys. This is the canonical deploy-notification path; the previous `.github/workflows/deploy-notify.yml` flow was retired in favor of it.

---

## Prerequisites

1. **The project is already deployed to Vercel** at least once. You need the project URL.
2. **A Telegram bot exists** for this app. If not, run `yarn telegram-setup` first — it creates the bot, captures `TELEGRAM_BOT_TOKEN`, and walks you through getting chat IDs.
3. **`ownerTelegramChatId` is set** in `src/app.config.js` (the fallback chat). If you want the deploy notifications routed to a separate chat, also set `VERCEL_TELEGRAM_CHAT_ID` (preferred over the owner chat).

---

## Step 1: Create the Vercel webhook

1. Open the Vercel dashboard → your project → **Settings** → **Webhooks** (or `https://vercel.com/<team>/<project>/settings/webhooks`).
2. Click **Create**.
3. **URL**: `https://<your-deployed-domain>/api/vercel-webhook` — use the stable production domain, not a deployment-specific URL.
4. **Events**: select these only (others spam without value):
   - `deployment.created`
   - `deployment.succeeded` (some teams see this as `deployment.ready` — select both if present)
   - `deployment.error`
   - `deployment.canceled` (optional)
5. **Project scope**: select the current project only — not "All projects" — so you don't get duplicate messages if you have multiple projects from this template.
6. Click **Create** — Vercel reveals the webhook **secret** once. Copy it now; you cannot view it again.

---

## Step 2: Set the secret on Vercel

The handler reads `VERCEL_WEBHOOK_SECRET` to verify the HMAC signature on every incoming request.

```bash
yarn vercel-cli env:add VERCEL_WEBHOOK_SECRET "<paste-secret>"
```

Or via the Vercel dashboard → **Settings** → **Environment Variables** → add for both **Production** and **Preview** scopes. Skip Development — webhooks only hit deployed URLs.

After adding, redeploy production once so the new env var takes effect (Vercel does not auto-redeploy on env-var changes).

---

## Step 3: (Optional) Route to a dedicated chat

By default, deploy notifications go to `ownerTelegramChatId` (the app's general admin chat). To route them to a separate "deployments" chat instead:

1. Get the chat ID with `yarn telegram-setup` (re-run it; it lists all chats your bot is in).
2. Set the env var on Vercel:
   ```bash
   yarn vercel-cli env:add VERCEL_TELEGRAM_CHAT_ID "<chat-id>"
   ```
3. Redeploy.

If `VERCEL_TELEGRAM_CHAT_ID` is set, the handler uses it; otherwise it falls back to `ownerTelegramChatId` from `app.config.js`.

---

## Step 4: Verify

Trigger a deployment to confirm the wiring:

```bash
vercel --prod      # or push a commit / click Redeploy in the dashboard
```

You should see two messages in Telegram:

1. `🚀 Production deployment started — <project>` (from `deployment.created`)
2. `✅ Production deployment live — <project>` (from `deployment.succeeded` / `deployment.ready`)

If nothing arrives, debug with:

- `yarn vercel-cli logs --deployment <dpl_id>` — look for `[vercel-webhook]` log lines (invalid signature, missing chat ID, etc.).
- Vercel dashboard → Webhooks → click the webhook → **Deliveries** tab — shows every POST attempt, the response status, and the body Vercel sent. A 401 means the secret is wrong; a 5xx means the handler crashed.

---

## What lives where

| Piece | Location |
|---|---|
| Webhook handler | `src/pages/api/vercel-webhook.ts` (template, synced) |
| Telegram send | `sendTelegramNotification` in `src/server/template/telegram` |
| Bot token | `TELEGRAM_BOT_TOKEN` env var (set by `yarn telegram-setup`) |
| Signing secret | `VERCEL_WEBHOOK_SECRET` env var (set per Step 2) |
| Target chat | `VERCEL_TELEGRAM_CHAT_ID` env var, else `appConfig.ownerTelegramChatId` |

---

## Quick Checklist

- [ ] Vercel webhook created with the 4 deployment events
- [ ] Secret copied from Vercel dashboard
- [ ] `VERCEL_WEBHOOK_SECRET` set on Vercel (Production + Preview)
- [ ] Redeployed after env change
- [ ] Test deploy produced both started + live messages
