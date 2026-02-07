const isProduction = process.env.NODE_ENV === 'production';

export const appConfig = {
    appName: 'App Template AI',
    cacheType: isProduction ? 's3' : 's3',
    dbName: 'app_template_db',

    // Production URL for the app (used for clarification links in Telegram)
    // Override via NEXT_PUBLIC_APP_URL env var
    // Falls back to Vercel URL when deployed, otherwise uses this default
    appUrl: process.env.NEXT_PUBLIC_APP_URL ||
            process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` ||
            process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}` ||
            'https://app-template-ai.vercel.app',

    // Telegram Chat IDs for different notification categories
    // Get these by running: yarn telegram-setup
    //
    // Defaults to OWNER_TELEGRAM_CHAT_ID env var, then falls back to ownerTelegramChatId
    // If not set, uses the hardcoded fallback below
    ownerTelegramChatId: process.env.OWNER_TELEGRAM_CHAT_ID 
                          
};
