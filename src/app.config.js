const isProduction = process.env.NODE_ENV === 'production';

export const appConfig = {
    appName: 'App Template AI',
    cacheType: isProduction ? 's3' : 's3',
    dbName: 'app_template_db',

    // Telegram Chat IDs for different notification categories
    // Get these by running: yarn telegram-setup
    //
    // Defaults to AGENT_TELEGRAM_CHAT_ID env var, then falls back to ownerTelegramChatId
    // If not set, uses the hardcoded fallback below
    ownerTelegramChatId: process.env.AGENT_TELEGRAM_CHAT_ID ||
                          process.env.ownerTelegramChatId ||
                          '-5197577462'  // Fallback for legacy setups
};
