/**
 * Hook for computing feature request health indicators
 */

import { useMemo } from 'react';
import type { FeatureRequestClient } from '@/apis/feature-requests/types';
import type { GitHubIssueDetails } from '@/apis/feature-requests/types';
import { computeFeatureRequestHealth } from '../utils/healthComputation';

/**
 * Compute health indicator for a feature request
 */
export function useFeatureRequestHealth(
    request: FeatureRequestClient,
    githubDetails?: GitHubIssueDetails
) {
    return useMemo(() => {
        return computeFeatureRequestHealth(request, githubDetails);
    }, [request.status, request.updatedAt, request.lastActivityAt, request.statusChangedAt, githubDetails]);
}
