const isProduction = process.env.NODE_ENV === 'production';

export const appConfig = {
    appName: 'App Template AI',
    cacheType: isProduction ? 's3' : 's3',
    dbName: 'app_template_db',
    // Telegram chat ID for app owner notifications (signups, errors, alerts)
    // Get this by running: yarn telegram-setup
    ownerTelegramChatId: '-5197577462'
};
