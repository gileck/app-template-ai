/* eslint-disable restrict-api-routes/no-direct-api-routes */
/**
 * Telegram Webhook API Endpoint
 *
 * Handles callback queries from inline keyboard buttons in Telegram notifications.
 * Updates GitHub Project review status based on button clicks.
 *
 * This is a direct API route because Telegram sends webhook requests directly to this URL.
 * It cannot go through the standard API architecture.
 *
 * Callback data format: "action:issueNumber" (e.g., "approve:123")
 * Actions: approve, changes, reject
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getProjectManagementAdapter } from '@/server/project-management';
import { STATUSES, REVIEW_STATUSES } from '@/server/project-management/config';

/**
 * Status transitions when approved - move to next phase
 */
const STATUS_TRANSITIONS: Record<string, string> = {
    [STATUSES.productDesign]: STATUSES.techDesign,
    [STATUSES.techDesign]: STATUSES.implementation,
    // Implementation doesn't auto-advance - PR needs manual merge
};

const TELEGRAM_API_URL = 'https://api.telegram.org/bot';

interface TelegramCallbackQuery {
    id: string;
    from: {
        id: number;
        username?: string;
    };
    message?: {
        message_id: number;
        chat: {
            id: number;
        };
        text?: string;
    };
    data?: string;
}

interface TelegramUpdate {
    update_id: number;
    callback_query?: TelegramCallbackQuery;
}

type ReviewAction = 'approve' | 'changes' | 'reject';

const ACTION_TO_REVIEW_STATUS: Record<ReviewAction, string> = {
    approve: REVIEW_STATUSES.approved,
    changes: REVIEW_STATUSES.requestChanges,
    reject: REVIEW_STATUSES.rejected,
};

const ACTION_LABELS: Record<ReviewAction, string> = {
    approve: 'Approved',
    changes: 'Requested Changes',
    reject: 'Rejected',
};

const ACTION_EMOJIS: Record<ReviewAction, string> = {
    approve: '✅',
    changes: '📝',
    reject: '❌',
};

/**
 * Answer a callback query (acknowledge button click)
 */
async function answerCallbackQuery(
    botToken: string,
    callbackQueryId: string,
    text: string
): Promise<void> {
    await fetch(`${TELEGRAM_API_URL}${botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            callback_query_id: callbackQueryId,
            text,
        }),
    });
}

/**
 * Edit the original message to show the action taken
 */
async function editMessageTextWithExtra(
    botToken: string,
    chatId: number,
    messageId: number,
    originalText: string,
    action: ReviewAction,
    extraInfo: string = ''
): Promise<void> {
    const emoji = ACTION_EMOJIS[action];
    const label = ACTION_LABELS[action];

    // Append the action to the original message
    const newText = `${originalText}\n\n${emoji} <b>${label}</b>${extraInfo}`;

    await fetch(`${TELEGRAM_API_URL}${botToken}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: newText,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            // Remove the inline keyboard after action
            reply_markup: { inline_keyboard: [] },
        }),
    });
}

/**
 * Find project item by issue number
 */
async function findItemByIssueNumber(
    adapter: Awaited<ReturnType<typeof getProjectManagementAdapter>>,
    issueNumber: number
): Promise<{ itemId: string; title: string; status: string | null } | null> {
    const items = await adapter.listItems({});

    for (const item of items) {
        if (item.content?.number === issueNumber) {
            return {
                itemId: item.id,
                title: item.content.title,
                status: item.status,
            };
        }
    }

    return null;
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

    // Parse callback data: "action:issueNumber"
    const [action, issueNumberStr] = callbackData.split(':');
    const issueNumber = parseInt(issueNumberStr, 10);

    if (!action || !issueNumber || !['approve', 'changes', 'reject'].includes(action)) {
        await answerCallbackQuery(botToken, callback_query.id, 'Invalid action');
        return res.status(200).json({ ok: true });
    }

    const reviewAction = action as ReviewAction;
    const reviewStatus = ACTION_TO_REVIEW_STATUS[reviewAction];

    try {
        // Initialize the adapter
        const adapter = getProjectManagementAdapter();
        await adapter.init();

        // Find the project item by issue number
        const item = await findItemByIssueNumber(adapter, issueNumber);

        if (!item) {
            await answerCallbackQuery(
                botToken,
                callback_query.id,
                `Issue #${issueNumber} not found in project`
            );
            return res.status(200).json({ ok: true });
        }

        // Update the review status
        await adapter.updateItemReviewStatus(item.itemId, reviewStatus);

        let advancedTo: string | null = null;
        let finalStatus = item.status;
        let finalReviewStatus = reviewStatus;

        // If approved, also auto-advance to next phase
        if (reviewAction === 'approve' && item.status) {
            const nextStatus = STATUS_TRANSITIONS[item.status];
            if (nextStatus) {
                await adapter.updateItemStatus(item.itemId, nextStatus);
                // Clear review status for next phase
                await adapter.updateItemReviewStatus(item.itemId, '');
                advancedTo = nextStatus;
                finalStatus = nextStatus;
                finalReviewStatus = '';
                console.log(`Telegram webhook: auto-advanced to ${nextStatus}`);
            }
        }

        // Build detailed status message for the edited message
        let statusDetails = '';
        if (reviewAction === 'approve') {
            if (advancedTo) {
                statusDetails = `\n\n✅ <b>Success!</b>\n📊 Status: ${advancedTo}\n📋 Review Status: (ready for agent)`;
            } else {
                // Implementation phase - no auto-advance
                statusDetails = `\n\n✅ <b>Success!</b>\n📊 Status: ${finalStatus}\n📋 Review Status: ${finalReviewStatus}\n\n💡 Merge the PR to complete.`;
            }
        } else if (reviewAction === 'changes') {
            statusDetails = `\n\n📝 <b>Changes Requested</b>\n📊 Status: ${finalStatus}\n📋 Review Status: ${finalReviewStatus}\n\n💡 Add comments on the issue, then run agents.`;
        } else if (reviewAction === 'reject') {
            statusDetails = `\n\n❌ <b>Rejected</b>\n📊 Status: ${finalStatus}\n📋 Review Status: ${finalReviewStatus}`;
        }

        // Acknowledge the button click (toast notification)
        const toastMessage = advancedTo
            ? `✅ Approved → ${advancedTo}`
            : `${ACTION_EMOJIS[reviewAction]} ${ACTION_LABELS[reviewAction]}`;
        await answerCallbackQuery(botToken, callback_query.id, toastMessage);

        // Edit the message to show the action taken with full details
        if (callback_query.message) {
            await editMessageTextWithExtra(
                botToken,
                callback_query.message.chat.id,
                callback_query.message.message_id,
                callback_query.message.text || '',
                reviewAction,
                statusDetails
            );
        }

        console.log(
            `Telegram webhook: ${reviewAction} issue #${issueNumber} (item ${item.itemId})`
        );

        return res.status(200).json({ ok: true });
    } catch (error) {
        console.error('Telegram webhook error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Show error toast
        await answerCallbackQuery(
            botToken,
            callback_query.id,
            `❌ Error: ${errorMessage.slice(0, 150)}`
        );

        // Edit message to show error
        if (callback_query.message) {
            const errorDetails = `\n\n❌ <b>Error</b>\n${errorMessage.slice(0, 200)}`;
            await editMessageTextWithExtra(
                botToken,
                callback_query.message.chat.id,
                callback_query.message.message_id,
                callback_query.message.text || '',
                'reject', // Use reject emoji for error
                errorDetails
            );
        }

        return res.status(200).json({ ok: true });
    }
}
