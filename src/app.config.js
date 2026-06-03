const isProduction = process.env.NODE_ENV === 'production';

export const appConfig = {
    appName: 'App Template AI',
    cacheType: isProduction ? 's3' : 's3',
    dbName: 'app_template_db',

    // The app's URL. Resolution order:
    //   1. NEXT_PUBLIC_APP_URL  — explicit override (custom domain / testing).
    //   2. VERCEL_PROJECT_PRODUCTION_URL — auto-provided by Vercel, per-PROJECT
    //      correct (its own stable production domain, incl. custom domains). This
    //      is the zero-config default on Vercel, so every project "just works".
    //   3. dev → http://localhost:3000.
    //   4. otherwise undefined — callers then fail loudly via requireAppUrl()
    //      rather than silently using a wrong domain (only happens off Vercel
    //      with nothing configured).
    // NOTE: there is intentionally NO hardcoded fallback domain — that was the
    // old bug (projects silently inheriting app-template-ai.vercel.app).
    // Read via getAppUrl()/requireAppUrl() from `@/server/template/appUrl`.
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
