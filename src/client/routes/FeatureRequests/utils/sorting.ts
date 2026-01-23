/**
 * Sorting Utility
 *
 * Sorting functions for different sort modes.
 */

import type { FeatureRequestClient } from '@/apis/feature-requests/types';
import { ATTENTION_SORT_ORDER, PRIORITY_SORT_ORDER, type SortMode } from '../constants';

/**
 * Sort feature requests by attention priority
 * (blocked → waiting_for_review → in_progress → approved → proposed → new → backlog → done → rejected)
 */
export function sortByAttention(requests: FeatureRequestClient[]): FeatureRequestClient[] {
    return [...requests].sort((a, b) => {
        const orderA = ATTENTION_SORT_ORDER[a.status] || 999;
        const orderB = ATTENTION_SORT_ORDER[b.status] || 999;
        return orderA - orderB;
    });
}

/**
 * Sort feature requests by priority
 * (critical → high → medium → low → no priority)
 */
export function sortByPriority(requests: FeatureRequestClient[]): FeatureRequestClient[] {
    return [...requests].sort((a, b) => {
        const orderA = a.priority ? PRIORITY_SORT_ORDER[a.priority] : 999;
        const orderB = b.priority ? PRIORITY_SORT_ORDER[b.priority] : 999;
        return orderA - orderB;
    });
}

/**
 * Sort feature requests by creation date (newest first)
 */
export function sortByDateNewest(requests: FeatureRequestClient[]): FeatureRequestClient[] {
    return [...requests].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

/**
 * Sort feature requests by creation date (oldest first)
 */
export function sortByDateOldest(requests: FeatureRequestClient[]): FeatureRequestClient[] {
    return [...requests].sort((a, b) => {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
}

/**
 * Sort feature requests by title (A-Z)
 */
export function sortByTitleAZ(requests: FeatureRequestClient[]): FeatureRequestClient[] {
    return [...requests].sort((a, b) => {
        return a.title.localeCompare(b.title);
    });
}

/**
 * Sort feature requests based on the selected sort mode
 */
export function sortFeatureRequests(
    requests: FeatureRequestClient[],
    sortMode: SortMode
): FeatureRequestClient[] {
    switch (sortMode) {
        case 'attention':
            return sortByAttention(requests);
        case 'priority':
            return sortByPriority(requests);
        case 'date_newest':
            return sortByDateNewest(requests);
        case 'date_oldest':
            return sortByDateOldest(requests);
        case 'title_az':
            return sortByTitleAZ(requests);
        default:
            return requests;
    }
}
