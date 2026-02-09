/* eslint-disable restrict-api-routes/no-direct-api-routes */
/**
 * Constants for Telegram Webhook
 */

import { STATUSES, REVIEW_STATUSES } from '@/server/project-management/config';
import type { ReviewAction } from './types';

/**
 * Telegram Bot API base URL
 */
export const TELEGRAM_API_URL = 'https://api.telegram.org/bot';

/**
 * Undo timeout in milliseconds (5 minutes)
 */
export const UNDO_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Status transitions when approved - move to next phase
 */
export const STATUS_TRANSITIONS: Record<string, string> = {
    [STATUSES.productDesign]: STATUSES.techDesign,
    [STATUSES.techDesign]: STATUSES.implementation,
    // Implementation → PR Review happens automatically when agent creates PR
    // PR Review doesn't auto-advance - PR needs manual merge → Done
};

/**
 * Map review actions to their status values
 */
export const ACTION_TO_REVIEW_STATUS: Record<ReviewAction, string> = {
    approve: REVIEW_STATUSES.approved,
    changes: REVIEW_STATUSES.requestChanges,
    reject: REVIEW_STATUSES.rejected,
};

/**
 * Human-readable labels for review actions
 */
export const ACTION_LABELS: Record<ReviewAction, string> = {
    approve: 'Approved',
    changes: 'Requested Changes',
    reject: 'Rejected',
};

/**
 * Emoji icons for review actions
 */
export const ACTION_EMOJIS: Record<ReviewAction, string> = {
    approve: '✅',
    changes: '📝',
    reject: '❌',
};

// Routing maps — single source of truth in workflow-service
export {
    FEATURE_ROUTING_STATUS_MAP,
    BUG_ROUTING_STATUS_MAP,
    ROUTING_DESTINATION_LABELS,
} from '@/server/workflow-service';
