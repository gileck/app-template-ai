/* eslint-disable restrict-api-routes/no-direct-api-routes */
/**
 * Handlers for undo operations
 */

import { getProjectManagementAdapter } from '@/server/project-management';
import { STATUSES, COMMIT_MESSAGE_MARKER, getIssueUrl } from '@/server/project-management/config';
import { parseCommitMessageComment } from '@/agents/lib/commitMessage';
import { sendNotificationToOwner } from '@/server/telegram';
import {
    logWebhookAction,
    logExists,
} from '@/agents/lib/logging';
import { editMessageText } from '../telegram-api';
import { escapeHtml, findItemByIssueNumber, isUndoValid } from '../utils';
import type { TelegramCallbackQuery, DesignType, HandlerResult } from '../types';

/**
 * Handle undo for implementation PR request changes
 * Callback format: "u_rc:issueNumber:prNumber:timestamp"
 */
export async function handleUndoRequestChanges(
    botToken: string,
    callbackQuery: TelegramCallbackQuery,
    issueNumber: number,
    prNumber: number,
    timestamp: number
): Promise<HandlerResult> {
    try {
        if (!isUndoValid(timestamp)) {
            return { success: false, error: 'Undo window expired (5 minutes)' };
        }

        const adapter = getProjectManagementAdapter();
        await adapter.init();

        const item = await findItemByIssueNumber(adapter, issueNumber);
        if (!item) {
            return { success: false, error: `Issue #${issueNumber} not found in project.` };
        }

        await adapter.updateItemStatus(item.itemId, STATUSES.prReview);
        await adapter.clearItemReviewStatus(item.itemId);

        if (logExists(issueNumber)) {
            logWebhookAction(issueNumber, 'undo_request_changes', `Undid request changes for PR #${prNumber}`, {
                prNumber,
                restoredStatus: STATUSES.prReview,
            });
        }

        if (callbackQuery.message) {
            const originalText = callbackQuery.message.text || '';
            const cleanedText = originalText
                .replace(/\n*<i>Changed your mind\?.*<\/i>/g, '')
                .replace(/\n*Changed your mind\?.*5 minutes\./g, '');

            const undoConfirmation = [
                '',
                '━━━━━━━━━━━━━━━━━━━━',
                '↩️ <b>Undone!</b>',
                '',
                `📊 Status restored to: ${STATUSES.prReview}`,
                '📋 Review Status: (cleared)',
                '',
                'Re-sending PR Ready notification...',
            ].join('\n');

            await editMessageText(
                botToken,
                callbackQuery.message.chat.id,
                callbackQuery.message.message_id,
                escapeHtml(cleanedText) + undoConfirmation,
                'HTML'
            );
        }

        // Re-send the PR Ready notification
        const { Octokit } = await import('@octokit/rest');
        const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
        const { getProjectConfig } = await import('@/server/project-management/config');
        const projectConfig = getProjectConfig();
        const { owner, repo } = projectConfig.github;

        const { data: pr } = await octokit.pulls.get({
            owner,
            repo,
            pull_number: prNumber,
        });

        const { data: comments } = await octokit.issues.listComments({
            owner,
            repo,
            issue_number: prNumber,
        });

        let commitMessage = { title: pr.title, body: pr.body || '' };
        for (const comment of comments) {
            if (comment.body?.includes(COMMIT_MESSAGE_MARKER)) {
                const parsed = parseCommitMessageComment(comment.body);
                if (parsed) {
                    commitMessage = parsed;
                    break;
                }
            }
        }

        const { notifyPRReadyToMerge } = await import('@/agents/shared/notifications');
        await notifyPRReadyToMerge(
            item.title,
            issueNumber,
            prNumber,
            commitMessage,
            'feature'
        );

        console.log(`Telegram webhook: undid request changes for PR #${prNumber}, issue #${issueNumber}`);
        return { success: true };
    } catch (error) {
        console.error('Error handling undo request changes:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

/**
 * Handle undo for design PR request changes
 * Callback format: "u_dc:prNumber:issueNumber:designType:timestamp"
 */
export async function handleUndoDesignChanges(
    botToken: string,
    callbackQuery: TelegramCallbackQuery,
    prNumber: number,
    issueNumber: number,
    designType: DesignType,
    timestamp: number
): Promise<HandlerResult> {
    try {
        if (!isUndoValid(timestamp)) {
            return { success: false, error: 'Undo window expired (5 minutes)' };
        }

        const adapter = getProjectManagementAdapter();
        await adapter.init();

        const item = await findItemByIssueNumber(adapter, issueNumber);
        if (!item) {
            return { success: false, error: `Issue #${issueNumber} not found in project.` };
        }

        await adapter.clearItemReviewStatus(item.itemId);

        const designLabel = designType === 'product-dev'
            ? 'Product Development'
            : designType === 'product'
                ? 'Product Design'
                : 'Technical Design';

        if (logExists(issueNumber)) {
            logWebhookAction(issueNumber, 'undo_design_changes', `Undid request changes for ${designLabel} PR #${prNumber}`, {
                prNumber,
                designType,
            });
        }

        if (callbackQuery.message) {
            const originalText = callbackQuery.message.text || '';
            const cleanedText = originalText
                .replace(/\n*<i>Changed your mind\?.*<\/i>/g, '')
                .replace(/\n*Changed your mind\?.*5 minutes\./g, '');

            const undoConfirmation = [
                '',
                '━━━━━━━━━━━━━━━━━━━━',
                '↩️ <b>Undone!</b>',
                '',
                `📊 Status: ${item.status}`,
                '📋 Review Status: (cleared)',
                '',
                'Re-sending Design PR Ready notification...',
            ].join('\n');

            await editMessageText(
                botToken,
                callbackQuery.message.chat.id,
                callbackQuery.message.message_id,
                escapeHtml(cleanedText) + undoConfirmation,
                'HTML'
            );
        }

        const { notifyDesignPRReady } = await import('@/agents/shared/notifications');
        await notifyDesignPRReady(
            designType,
            item.title,
            issueNumber,
            prNumber,
            false,
            'feature'
        );

        console.log(`Telegram webhook: undid design changes for ${designType} PR #${prNumber}, issue #${issueNumber}`);
        return { success: true };
    } catch (error) {
        console.error('Error handling undo design changes:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

/**
 * Handle undo for design review (changes/reject)
 * Callback format: "u_dr:issueNumber:action:previousStatus:timestamp"
 */
export async function handleUndoDesignReview(
    botToken: string,
    callbackQuery: TelegramCallbackQuery,
    issueNumber: number,
    originalAction: 'changes' | 'reject',
    _previousStatus: string,
    timestamp: number
): Promise<HandlerResult> {
    try {
        if (!isUndoValid(timestamp)) {
            return { success: false, error: 'Undo window expired (5 minutes)' };
        }

        const adapter = getProjectManagementAdapter();
        await adapter.init();

        const item = await findItemByIssueNumber(adapter, issueNumber);
        if (!item) {
            return { success: false, error: `Issue #${issueNumber} not found in project.` };
        }

        await adapter.clearItemReviewStatus(item.itemId);

        if (logExists(issueNumber)) {
            logWebhookAction(issueNumber, 'undo_design_review', `Undid ${originalAction} for design review`, {
                issueNumber,
                originalAction,
                status: item.status,
            });
        }

        if (callbackQuery.message) {
            const originalText = callbackQuery.message.text || '';
            const cleanedText = originalText
                .replace(/\n*<i>Changed your mind\?.*<\/i>/g, '')
                .replace(/\n*Changed your mind\?.*5 minutes\./g, '');

            const undoConfirmation = [
                '',
                '━━━━━━━━━━━━━━━━━━━━',
                '↩️ <b>Undone!</b>',
                '',
                `📊 Status: ${item.status}`,
                '📋 Review Status: (cleared)',
                '',
                'Re-sending review notification...',
            ].join('\n');

            await editMessageText(
                botToken,
                callbackQuery.message.chat.id,
                callbackQuery.message.message_id,
                escapeHtml(cleanedText) + undoConfirmation,
                'HTML'
            );
        }

        const issueUrl = getIssueUrl(issueNumber);

        await sendNotificationToOwner(
            `<b>🔄 Review Restored</b>\n\n📋 ${escapeHtml(item.title)}\n🔗 Issue #${issueNumber}\n📊 Status: ${item.status}\n\nReady for review again.`,
            {
                parseMode: 'HTML',
                inlineKeyboard: [
                    [
                        { text: '📋 View Issue', url: issueUrl },
                    ],
                    [
                        { text: '✅ Approve', callback_data: `approve:${issueNumber}` },
                        { text: '📝 Request Changes', callback_data: `changes:${issueNumber}` },
                        { text: '❌ Reject', callback_data: `reject:${issueNumber}` },
                    ],
                ],
            }
        );

        console.log(`Telegram webhook: undid ${originalAction} for issue #${issueNumber}`);
        return { success: true };
    } catch (error) {
        console.error('Error handling undo design review:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}
