/**
 * Submit Decision Handler
 *
 * Posts the admin's decision selection as a GitHub comment and routes
 * the item to the appropriate next phase.
 */

import type { SubmitDecisionRequest, SubmitDecisionResponse } from '../types';
import {
    validateDecisionToken,
    isDecisionComment,
    parseDecision,
    formatDecisionSelectionComment,
    findDecisionItem,
    resolveRouting,
} from '../utils';
import { getProjectManagementAdapter } from '@/server/project-management';

/**
 * Submit a decision selection.
 *
 * 1. Validates the token
 * 2. Verifies the issue is in the correct state
 * 3. Determines routing via config
 * 4. Posts the decision comment
 * 5. Updates status to route to the selected destination
 * 6. Clears review status for next phase
 */
export async function submitDecision(
    params: SubmitDecisionRequest
): Promise<SubmitDecisionResponse> {
    const { issueNumber, token, selection } = params;

    // Validate token
    if (!validateDecisionToken(issueNumber, token)) {
        return { error: 'Invalid or expired token' };
    }

    // Validate selection
    if (!selection || !selection.selectedOptionId) {
        return { error: 'No option selected' };
    }

    // If custom solution, validate required fields
    if (selection.selectedOptionId === 'custom') {
        if (!selection.customSolution?.trim()) {
            return { error: 'Custom solution text is required' };
        }
    }

    try {
        // Initialize adapter
        const adapter = getProjectManagementAdapter();
        await adapter.init();

        // Verify the issue is ready
        const verification = await findDecisionItem(adapter, issueNumber);
        if (!verification.valid || !verification.itemId) {
            return { error: verification.error };
        }

        // Get the decision comment to extract options
        const comments = await adapter.getIssueComments(issueNumber);

        let decisionCommentBody = null;
        for (let i = comments.length - 1; i >= 0; i--) {
            if (isDecisionComment(comments[i].body)) {
                decisionCommentBody = comments[i].body;
                break;
            }
        }

        if (!decisionCommentBody) {
            return { error: 'Could not find decision comment' };
        }

        const issueDetails = await adapter.getIssueDetails(issueNumber);
        const decision = parseDecision(
            decisionCommentBody,
            issueNumber,
            issueDetails?.title || `Issue #${issueNumber}`
        );

        if (!decision) {
            return { error: 'Could not parse decision' };
        }

        // Validate selected option exists (unless custom)
        if (selection.selectedOptionId !== 'custom') {
            const selectedOption = decision.options.find(
                o => o.id === selection.selectedOptionId
            );
            if (!selectedOption) {
                return { error: `Option ${selection.selectedOptionId} not found` };
            }
        }

        // Determine routing
        const routing = resolveRouting(decision.decisionType, selection, decision.options);
        if (!routing) {
            return { error: `Could not determine routing for decision type: ${decision.decisionType}` };
        }

        // Format and post the selection comment
        const selectionComment = formatDecisionSelectionComment(
            selection,
            decision.options,
            routing.destinationValue,
            routing.label
        );

        await adapter.addIssueComment(issueNumber, selectionComment);
        console.log(`  Posted decision selection comment on issue #${issueNumber}`);

        // Update status to route to the destination
        await adapter.updateItemStatus(verification.itemId, routing.status);
        console.log(`  Status updated to: ${routing.status}`);

        // Clear review status for next phase
        await adapter.clearItemReviewStatus(verification.itemId);
        console.log('  Review status cleared');

        return {
            success: true,
            routedTo: routing.destinationValue,
            routedToLabel: routing.label,
        };
    } catch (error) {
        console.error('Error submitting decision:', error);
        return {
            error: error instanceof Error ? error.message : 'Failed to submit decision',
        };
    }
}
