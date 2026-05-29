/* eslint-disable restrict-api-routes/no-direct-api-routes */
/**
 * Handlers for undo operations
 */

import { STATUSES, COMMIT_MESSAGE_MARKER, getIssueUrl } from '@/server/template/project-management/config';
import { parseCommitMessageComment } from '@/agents/lib/commitMessage';
import { getCommitMessage } from '@/agents/lib/workflow-db';
import { sendNotificationToOwner } from '@/server/template/telegram';
import {
    logExternalError,
    logExists,
} from '@/agents/lib/logging';
import {
    atomicUndoRequestChanges,
    atomicUndoDesignChanges,
    atomicUndoDesignReview,
} from '@/server/database/collections/template/workflow-items/workflow-items';
import { editMessageText } from '../telegram-api';
import { escapeHtml } from '../utils';
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
        // Validate undo window first
        const UNDO_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
        if (Date.now() - timestamp > UNDO_WINDOW_MS) {
            console.warn(`[LOG:UNDO] Undo window expired for PR #${prNumber}, issue #${issueNumber}`);
            return { success: false, error: 'Undo window expired (5 minutes)' };
        }

        // Atomic operation: check state and clear reviewStatus in a single DB operation
        // This prevents race conditions between concurrent undo requests
        const updatedItem = await atomicUndoRequestChanges(issueNumber, STATUSES.prReview);

        if (!updatedItem) {
            // Already undone by concurrent request or state doesn't match
            console.log(`[LOG:UNDO] Undo already performed for PR #${prNumber}, issue #${issueNumber}`);
            return { success: true };
        }

        // Log the action
        if (logExists(issueNumber)) {
            const { logWebhookAction } = await import('@/agents/lib/logging');
            logWebhookAction(issueNumber, 'undo_request_changes', `Undid request changes for PR #${prNumber}`, {
                prNumber,
                restoredStatus: STATUSES.prReview,
            });
        }

        // Log history
        const { logHistory } = await import('@/server/template/workflow-service/utils');
        void logHistory(issueNumber, 'undo', 'Undo: restored previous status', 'admin');

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
        const { getProjectConfig } = await import('@/server/template/project-management/config');
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

        // Try DB first for commit message
        let commitMessage = await getCommitMessage(issueNumber, prNumber);

        // Fallback to PR comment parsing
        if (!commitMessage) {
            commitMessage = { title: pr.title, body: pr.body || '' };
            for (const comment of comments) {
                if (comment.body?.includes(COMMIT_MESSAGE_MARKER)) {
                    const parsed = parseCommitMessageComment(comment.body);
                    if (parsed) {
                        commitMessage = parsed;
                        break;
                    }
                }
            }
        }

        const { notifyPRReadyToMerge } = await import('@/agents/shared/notifications');
        await notifyPRReadyToMerge(
            updatedItem.title || `Issue #${issueNumber}`,
            issueNumber,
            prNumber,
            commitMessage,
            'feature'
        );

        console.log(`Telegram webhook: undid request changes for PR #${prNumber}, issue #${issueNumber}`);
        return { success: true };
    } catch (error) {
        console.error(`[LOG:UNDO] Error handling undo request changes for PR #${prNumber}, issue #${issueNumber}:`, error);
        if (logExists(issueNumber)) {
            logExternalError(issueNumber, 'telegram', error instanceof Error ? error : new Error(String(error)));
        }
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
        // Validate undo window first
        const UNDO_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
        if (Date.now() - timestamp > UNDO_WINDOW_MS) {
            console.warn(`[LOG:UNDO] Undo window expired for design PR #${prNumber}, issue #${issueNumber}`);
            return { success: false, error: 'Undo window expired (5 minutes)' };
        }

        // Atomic operation: check state and clear reviewStatus in a single DB operation
        // This prevents race conditions between concurrent undo requests
        const updatedItem = await atomicUndoDesignChanges(issueNumber);

        if (!updatedItem) {
            // Already undone by concurrent request
            console.log(`[LOG:UNDO] Undo already performed for design PR #${prNumber}, issue #${issueNumber}`);
            return { success: true };
        }

        // Log the action
        if (logExists(issueNumber)) {
            const { logWebhookAction } = await import('@/agents/lib/logging');
            logWebhookAction(
                issueNumber,
                'undo_design_changes',
                `Undid request changes for ${designType === 'product-dev' ? 'Product Development' : designType === 'product' ? 'Product Design' : 'Technical Design'} PR #${prNumber}`,
                { prNumber, designType }
            );
        }

        // Log history
        const { logHistory } = await import('@/server/template/workflow-service/utils');
        void logHistory(issueNumber, 'undo', 'Undo: restored previous status', 'admin');

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
                `📊 Status: ${updatedItem.status}`,
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
            updatedItem.title || `Issue #${issueNumber}`,
            issueNumber,
            prNumber,
            false,
            'feature'
        );

        console.log(`Telegram webhook: undid design changes for ${designType} PR #${prNumber}, issue #${issueNumber}`);
        return { success: true };
    } catch (error) {
        console.error(`[LOG:UNDO] Error handling undo design changes for PR #${prNumber}, issue #${issueNumber}:`, error);
        if (logExists(issueNumber)) {
            logExternalError(issueNumber, 'telegram', error instanceof Error ? error : new Error(String(error)));
        }
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
        // Validate undo window first
        const UNDO_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
        if (Date.now() - timestamp > UNDO_WINDOW_MS) {
            console.warn(`[LOG:UNDO] Undo window expired for design review, issue #${issueNumber}`);
            return { success: false, error: 'Undo window expired (5 minutes)' };
        }

        // Atomic operation: check state and clear reviewStatus in a single DB operation
        // This prevents race conditions between concurrent undo requests
        const updatedItem = await atomicUndoDesignReview(issueNumber);

        if (!updatedItem) {
            // Already undone by concurrent request
            console.log(`[LOG:UNDO] Undo already performed for design review, issue #${issueNumber}`);
            return { success: true };
        }

        // Log the action
        if (logExists(issueNumber)) {
            const { logWebhookAction } = await import('@/agents/lib/logging');
            logWebhookAction(
                issueNumber,
                'undo_design_review',
                `Undid ${originalAction} for design review`,
                { originalAction, status: updatedItem.status }
            );
        }

        // Log history
        const { logHistory } = await import('@/server/template/workflow-service/utils');
        void logHistory(issueNumber, 'undo', 'Undo: restored previous status', 'admin');

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
                `📊 Status: ${updatedItem.status}`,
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
            `<b>🔄 Review Restored</b>\n\n📋 ${escapeHtml(updatedItem.title || `Issue #${issueNumber}`)}\n🔗 Issue #${issueNumber}\n📊 Status: ${updatedItem.status}\n\nReady for review again.`,
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
        console.error(`[LOG:UNDO] Error handling undo design review for issue #${issueNumber}:`, error);
        if (logExists(issueNumber)) {
            logExternalError(issueNumber, 'telegram', error instanceof Error ? error : new Error(String(error)));
        }
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}
