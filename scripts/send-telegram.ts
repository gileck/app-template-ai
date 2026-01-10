#!/usr/bin/env npx ts-node
/**
 * Send Telegram Message Script
 *
 * Sends a message to the LOCAL_TELEGRAM_CHAT_ID.
 *
 * Usage:
 *   yarn send-telegram "Your message here"
 *   yarn send-telegram --cloud-proxy "Your message here"
 */

import 'dotenv/config';

const TELEGRAM_API_URL = 'https://api.telegram.org/bot';

function setupCloudProxy() {
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    if (proxyUrl) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { ProxyAgent, setGlobalDispatcher } = require('undici');
        setGlobalDispatcher(new ProxyAgent(proxyUrl));
    }
}

async function main() {
    // Check for --cloud-proxy flag
    const args = process.argv.slice(2);
    const cloudProxyIndex = args.indexOf('--cloud-proxy');
    const useCloudProxy = cloudProxyIndex !== -1;

    if (useCloudProxy) {
        args.splice(cloudProxyIndex, 1);
        setupCloudProxy();
    }

    let botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.LOCAL_TELEGRAM_CHAT_ID;
    const message = args.join(' ');

    // Strip quotes from token if present (cloud may add literal quotes)
    if (useCloudProxy && botToken) {
        botToken = botToken.replace(/^["']|["']$/g, '');
    }

    if (!botToken) {
        console.error('Error: TELEGRAM_BOT_TOKEN not found in .env');
        process.exit(1);
    }

    if (!chatId) {
        console.error('Error: LOCAL_TELEGRAM_CHAT_ID not found in .env');
        process.exit(1);
    }

    if (!message) {
        console.error('Usage: yarn send-telegram "Your message here"');
        process.exit(1);
    }

    try {
        const response = await fetch(`${TELEGRAM_API_URL}${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Failed to send message:', error);
            process.exit(1);
        }

        console.log('Message sent successfully');
    } catch (error) {
        console.error('Error sending message:', error);
        process.exit(1);
    }
}

main();
