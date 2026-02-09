/* eslint-disable restrict-api-routes/no-direct-api-routes */
/**
 * Handler for clarification received action
 */

import { REVIEW_STATUSES } from '@/server/project-management/config';
import {
    logExternalError,
    logExists,
} from '@/agents/lib/logging';
import {
    updateReviewStatus,
    findItemByIssueNumber,
} from '@/server/workflow-service';
import { editMessageText } from '../telegram-api';
import { escapeHtml } from '../utils';
import type { TelegramCallbackQuery, HandlerResult } from '../types';

/**
 * Handle "Clarification Received" button click
 * Callback format: "clarified:issueNumber"
 */
export async function handleClarificationReceived(
    botToken: string,
    callbackQuery: TelegramCallbackQuery,
    issueNumber: number
): Promise<HandlerResult> {
    try {
        // Find project item by issue number
        const item = await findItemByIssueNumber(issueNumber);

        if (!item) {
            console.warn(`[LOG:CLARIFICATION] Item not found in GitHub Projects: issue #${issueNumber}`);
            return { success: false, error: 'Item not found in GitHub Projects' };
        }

        // Verify current status
        if (item.reviewStatus !== REVIEW_STATUSES.waitingForClarification) {
            console.warn(`[LOG:CLARIFICATION] Issue #${issueNumber} not waiting for clarification (current: ${item.reviewStatus || 'none'})`);
            return {
                success: false,
                error: `Item is not waiting for clarification (current: ${item.reviewStatus || 'none'})`
            };
        }

        // Update review status to "Clarification Received"
        await updateReviewStatus(issueNumber, REVIEW_STATUSES.clarificationReceived, {
            logAction: 'clarification_received',
            logDescription: 'Clarification received from admin',
            logMetadata: { reviewStatus: REVIEW_STATUSES.clarificationReceived },
        });

        // Edit message to show action taken
        if (callbackQuery.message) {
            const originalText = callbackQuery.message.text || '';
            const statusUpdate = [
                '',
                '━━━━━━━━━━━━━━━━━━━━',
                '✅ <b>Status Updated</b>',
                '📊 Review Status: Clarification Received',
                '🤖 Agent will continue work on next run',
            ].join('\n');

            await editMessageText(
                botToken,
                callbackQuery.message.chat.id,
                callbackQuery.message.message_id,
                escapeHtml(originalText) + statusUpdate,
                'HTML'
            );
        }

        console.log(`Telegram webhook: clarification received for issue #${issueNumber} (item ${item.itemId})`);
        return { success: true };
    } catch (error) {
        console.error(`[LOG:CLARIFICATION] Error handling clarification for issue #${issueNumber}:`, error);
        if (logExists(issueNumber)) {
            logExternalError(issueNumber, 'telegram', error instanceof Error ? error : new Error(String(error)));
        }
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}
