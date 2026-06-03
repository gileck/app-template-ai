const isProduction = process.env.NODE_ENV === 'production';

export const appConfig = {
    appName: 'App Template AI',
    cacheType: isProduction ? 's3' : 's3',
    dbName: 'app_template_db',

    // The app's URL. ⚠️ The SOURCE OF TRUTH is `getAppUrl()`/`requireAppUrl()` in
    // `src/server/template/appUrl.ts` (template-owned + SYNCED) — all template
    // link-builders read it from there. This `appUrl` is a project-level mirror
    // for convenience only; this file is project-owned and NOT synced, so keep
    // its logic in step with appUrl.ts. Resolution:
    //   1. NEXT_PUBLIC_APP_URL  — explicit override (custom domain / pin).
    //   2. VERCEL_PROJECT_PRODUCTION_URL — Vercel auto, per-project correct
    //      (zero-config default on Vercel; prod AND preview).
    //   3. dev → http://localhost:3000.   4. else undefined (callers fail loud).
    // There is intentionally NO hardcoded fallback domain — that was the old bug
    // (projects silently inheriting app-template-ai.vercel.app).
    appUrl: process.env.NEXT_PUBLIC_APP_URL
        || (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
        || (isProduction ? undefined : 'http://localhost:3000'),

    // Telegram Chat IDs for different notification categories
    // Get these by running: yarn telegram-setup
    //
    // Defaults to OWNER_TELEGRAM_CHAT_ID env var, then falls back to ownerTelegramChatId
    // If not set, uses the hardcoded fallback below
    ownerTelegramChatId: process.env.OWNER_TELEGRAM_CHAT_ID,
};
