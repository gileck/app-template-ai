/**
 * Workflow Service — Undo
 *
 * Time-windowed undo for status/review changes.
 */

import {
    logWebhookAction,
    logExists,
} from '@/agents/lib/logging';
import { getInitializedAdapter, findItemByIssueNumber, syncWorkflowStatus, logHistory } from './utils';
import { DEFAULT_UNDO_WINDOW_MS } from './constants';
import type { UndoResult, UndoOptions } from './types';

/**
 * Undo a status/review change within the undo time window.
 *
 * 1. Validates undo window
 * 2. Checks idempotency
 * 3. Restores status and/or review status
 * 4. Syncs to DB
 * 5. Logs
 *
 * @param issueNumber - GitHub issue number
 * @param restoreStatus - Status to restore (or null to keep current)
 * @param restoreReviewStatus - Review status to restore: string to set, null/undefined to clear
 * @param options - Must include timestamp; optionally override undo window
 */
export async function undoStatusChange(
    issueNumber: number,
    restoreStatus: string | null,
    restoreReviewStatus: string | null | undefined,
    options: UndoOptions
): Promise<UndoResult> {
    const { timestamp, undoWindowMs } = options;
    const windowMs = undoWindowMs ?? DEFAULT_UNDO_WINDOW_MS;

    // Validate undo window
    if (Date.now() - timestamp > windowMs) {
        if (logExists(issueNumber)) {
            logWebhookAction(issueNumber, 'undo_expired', 'Undo window expired', {
                issueNumber,
                timestamp,
            });
        }
        return { success: false, expired: true, error: 'Undo window expired (5 minutes)' };
    }

    const item = await findItemByIssueNumber(issueNumber);
    if (!item) {
        return { success: false, error: `Issue #${issueNumber} not found in project` };
    }

    // Idempotency check: detect if the undo was already performed
    // This prevents race conditions when multiple concurrent requests attempt to undo the same action
    const isAlreadyUndone = (() => {
        // If we're restoring a specific status, check if it's already set correctly
        if (restoreStatus) {
            // For undo request changes: check if status is already prReview AND reviewStatus is clear
            if (item.status === restoreStatus && !item.reviewStatus) {
                return true;
            }
        } else {
            // If not restoring status, we're just clearing review status
            // Check if reviewStatus is already cleared
            if (restoreReviewStatus === null && !item.reviewStatus) {
                return true;
            }
            // If setting a specific review status, check if it's already set
            if (restoreReviewStatus !== null && restoreReviewStatus !== undefined) {
                if (item.reviewStatus === restoreReviewStatus) {
                    return true;
                }
            }
        }
        return false;
    })();

    if (isAlreadyUndone) {
        if (logExists(issueNumber)) {
            logWebhookAction(issueNumber, 'undo_already_done', 'Undo already performed', {
                issueNumber,
                currentStatus: item.status,
                currentReviewStatus: item.reviewStatus,
            });
        }
        return { success: true, alreadyDone: true, itemId: item.itemId };
    }

    const adapter = await getInitializedAdapter();

    // Restore status if provided
    if (restoreStatus) {
        await adapter.updateItemStatus(item.itemId, restoreStatus);
        await syncWorkflowStatus(issueNumber, restoreStatus);
    }

    // Restore or clear review status
    // restoreReviewStatus === null means "clear it"
    // restoreReviewStatus === undefined means "don't touch"
    if (restoreReviewStatus === null) {
        if (adapter.hasReviewStatusField()) {
            await adapter.clearItemReviewStatus(item.itemId);
        }
    } else if (restoreReviewStatus !== undefined) {
        if (adapter.hasReviewStatusField()) {
            await adapter.updateItemReviewStatus(item.itemId, restoreReviewStatus);
        }
    }

    // Log
    if (logExists(issueNumber)) {
        logWebhookAction(
            issueNumber,
            options.logAction || 'undo',
            options.logDescription || `Undo: restored status`,
            {
                issueNumber,
                restoreStatus,
                restoreReviewStatus,
                ...options.logMetadata,
            }
        );
    }

    void logHistory(issueNumber, 'undo', 'Undo: restored previous status', 'admin');

    return { success: true, itemId: item.itemId };
}
