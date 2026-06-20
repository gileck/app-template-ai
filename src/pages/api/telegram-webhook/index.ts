/* eslint-disable restrict-api-routes/no-direct-api-routes */
/**
 * Telegram Webhook API Endpoint
 *
 * Handles callback queries from inline keyboard buttons in Telegram notifications.
 * Supported flows:
 *
 * 1. Login approval (admin-approved sign-in):
 *    - Callback: "approve_login:approvalId" - Approves a pending Telegram 2FA login
 *
 * 2. RPC connection approval:
 *    - Callback: "rpc_conn_approve:connectionId" - Approve a pending RPC connection
 *    - Callback: "rpc_conn_reject:connectionId" - Reject a pending RPC connection
 *
 * This is a direct API route because Telegram sends webhook requests directly to this URL.
 * It cannot go through the standard API architecture.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { timingSafeEqual } from 'crypto';
import { appConfig } from '@/app.config';
import { answerCallbackQuery, editMessageText, editMessageWithResult } from './telegram-api';
import { parseCallbackData, escapeHtml } from './utils';
import {
    handleLoginApproval,
    handleRpcConnectionApprove,
    handleRpcConnectionReject,
} from './handlers';
import type { TelegramCallbackQuery, TelegramUpdate } from './types';

/** Constant-time string compare (avoids leaking length-independent timing). */
function safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
}

/**
 * Every supported callback (login approval, RPC connect approve/reject) is an
 * owner-only action. Verify the tap came from the configured owner chat. This
 * is defense-in-depth on top of the secret-token check — the secret-token
 * proves the request came from Telegram; this proves it came from the OWNER.
 */
function isFromOwner(callbackQuery: TelegramCallbackQuery): boolean {
    const owner = appConfig.ownerTelegramChatId;
    if (!owner) return false;
    return String(callbackQuery.from?.id) === String(owner);
}

/**
 * Maximum time (ms) to wait for handler processing before returning a response.
 * Set below Vercel's serverless function timeout (default 60s for Pro, 10s for Hobby)
 * to ensure the user always gets a response and doesn't see a frozen loading state.
 */
const HANDLER_TIMEOUT_MS = 25_000;

/**
 * Run a handler function with a timeout. If the handler does not complete
 * within the timeout, a warning is logged but no error is thrown - the
 * response will be sent regardless. The handler continues running in the
 * remaining serverless function time.
 */
async function withTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    label: string
): Promise<{ result: T | null; timedOut: boolean }> {
    let timedOut = false;
    const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
            timedOut = true;
            console.warn(`[WEBHOOK:TIMEOUT] Handler "${label}" exceeded ${timeoutMs}ms timeout`);
            resolve(null);
        }, timeoutMs);
    });

    const result = await Promise.race([
        fn().then((r) => r),
        timeoutPromise,
    ]);

    return { result, timedOut };
}

/**
 * Process the callback query by routing to the appropriate handler.
 * Extracted from the main handler to enable timeout wrapping.
 */
async function processCallbackQuery(
    botToken: string,
    callback_query: TelegramUpdate['callback_query'] & { data: string },
    parsed: ReturnType<typeof parseCallbackData>,
): Promise<void> {
    const { action, parts } = parsed;
    const callbackData = callback_query.data;

    // All supported actions are owner-only. Reject taps from anyone else (and
    // refuse outright if the owner chat isn't configured) before mutating state.
    const OWNER_ONLY_ACTIONS = ['approve_login', 'rpc_conn_approve', 'rpc_conn_reject'];
    if (OWNER_ONLY_ACTIONS.includes(action) && !isFromOwner(callback_query)) {
        console.warn('[telegram-webhook] Rejected non-owner callback', {
            action,
            fromId: callback_query.from?.id,
            ownerConfigured: !!appConfig.ownerTelegramChatId,
        });
        await answerCallbackQuery(botToken, callback_query.id, 'Not authorized');
        return;
    }

    if (action === 'approve_login' && parts.length === 2) {
        const approvalId = parsed.getString(1);
        if (!approvalId) {
            await answerCallbackQuery(botToken, callback_query.id, 'Invalid login approval');
            return;
        }

        const result = await handleLoginApproval(botToken, callback_query, approvalId);
        await answerCallbackQuery(
            botToken,
            callback_query.id,
            result.success ? '✅ Login approved' : (result.error || 'Unable to approve login')
        );
        return;
    }

    if (action === 'rpc_conn_approve' && parts.length === 2) {
        const connectionId = parsed.getString(1);
        if (!connectionId) {
            await answerCallbackQuery(botToken, callback_query.id, 'Invalid connection id');
            return;
        }
        const result = await handleRpcConnectionApprove(botToken, callback_query, connectionId);
        await answerCallbackQuery(
            botToken,
            callback_query.id,
            result.success ? '✅ RPC connection approved' : (result.error || 'Unable to approve')
        );
        return;
    }

    if (action === 'rpc_conn_reject' && parts.length === 2) {
        const connectionId = parsed.getString(1);
        if (!connectionId) {
            await answerCallbackQuery(botToken, callback_query.id, 'Invalid connection id');
            return;
        }
        const result = await handleRpcConnectionReject(botToken, callback_query, connectionId);
        await answerCallbackQuery(
            botToken,
            callback_query.id,
            result.success ? '🛑 RPC connection rejected' : (result.error || 'Unable to reject')
        );
        return;
    }

    // Unknown action
    console.error('Telegram webhook: Unknown action received', {
        callbackData,
        action,
        parts,
        partsLength: parts.length,
        callbackQueryId: callback_query.id,
        userId: callback_query.from.id,
        username: callback_query.from.username,
        messageId: callback_query.message?.message_id,
        timestamp: new Date().toISOString(),
    });

    await answerCallbackQuery(
        botToken,
        callback_query.id,
        `⚠️ Unknown action: ${callbackData.length > 50 ? `${callbackData.slice(0, 50)}...` : callbackData}`
    );

    if (callback_query.message) {
        const originalText = callback_query.message.text || '';
        const errorMarkerPlainText = '⚠️ Unknown Action';

        if (originalText.includes(errorMarkerPlainText)) {
            return;
        }

        const errorDetails = [
            '',
            '━━━━━━━━━━━━━━━━━━━━',
            '⚠️ <b>Unknown Action</b>',
            '',
            `Received callback: <code>${escapeHtml(callbackData)}</code>`,
            `Action parsed: <code>${escapeHtml(action)}</code>`,
            '',
            'This action is not recognized by the webhook handler.',
            'Please try again or contact support if the issue persists.',
        ].join('\n');

        try {
            await editMessageText(
                botToken,
                callback_query.message.chat.id,
                callback_query.message.message_id,
                escapeHtml(originalText) + errorDetails,
                'HTML'
            );
        } catch (editError) {
            console.error('Failed to edit message for unknown action:', {
                error: editError instanceof Error ? editError.message : editError,
                callbackData,
            });
        }
    }
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Only accept POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
        console.error('Telegram webhook: missing TELEGRAM_BOT_TOKEN');
        return res.status(500).json({ error: 'Bot token not configured' });
    }

    // Authenticate the request actually came from Telegram. Telegram echoes the
    // `secret_token` set at setWebhook time in this header on every callback.
    // Without it, anyone who knows the public URL could POST forged callbacks
    // (e.g. self-approving an RPC connection or login).
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (expectedSecret) {
        const presented = req.headers['x-telegram-bot-api-secret-token'];
        const presentedStr = Array.isArray(presented) ? presented[0] : presented;
        if (!presentedStr || !safeEqual(presentedStr, expectedSecret)) {
            console.warn('[telegram-webhook] Rejected request: invalid or missing secret token');
            return res.status(401).json({ error: 'Unauthorized' });
        }
    } else if (process.env.NODE_ENV === 'production') {
        // Fail closed in production: an unauthenticated webhook defeats the RPC
        // connection gate and login 2FA. Configure TELEGRAM_WEBHOOK_SECRET and
        // re-run the webhook setup.
        console.error('[telegram-webhook] TELEGRAM_WEBHOOK_SECRET not configured — refusing callbacks in production');
        return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    const update: TelegramUpdate = req.body;

    // Only handle callback queries (button clicks)
    if (!update.callback_query) {
        return res.status(200).json({ ok: true });
    }

    const { callback_query } = update;
    const callbackData = callback_query.data;

    if (!callbackData) {
        await answerCallbackQuery(botToken, callback_query.id, 'Invalid callback');
        return res.status(200).json({ ok: true });
    }

    // Parse callback data with defensive parsing
    const parsed = parseCallbackData(callbackData);
    const callbackWithData = callback_query as typeof callback_query & { data: string };

    try {
        // Run the handler with a timeout to ensure we always respond to Telegram
        // within a reasonable time, preventing frozen loading states.
        const { timedOut } = await withTimeout(
            () => processCallbackQuery(botToken, callbackWithData, parsed),
            HANDLER_TIMEOUT_MS,
            parsed.action
        );

        if (timedOut) {
            console.warn(`[WEBHOOK:TIMEOUT] Action "${parsed.action}" timed out after ${HANDLER_TIMEOUT_MS}ms, returning response to Telegram`);
        }

        return res.status(200).json({ ok: true });
    } catch (error) {
        console.error('Telegram webhook error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        try {
            await answerCallbackQuery(
                botToken,
                callback_query.id,
                `❌ Error: ${errorMessage.slice(0, 150)}`
            );

            if (callback_query.message) {
                await editMessageWithResult(
                    botToken,
                    callback_query.message.chat.id,
                    callback_query.message.message_id,
                    callback_query.message.text || '',
                    false,
                    errorMessage.slice(0, 200)
                );
            }
        } catch (notifyError) {
            console.error('Telegram webhook: failed to notify user of error:', notifyError);
        }

        return res.status(200).json({ ok: true });
    }
}
