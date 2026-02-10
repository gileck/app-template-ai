/**
 * Workflow Action Availability
 *
 * Pure function that determines which actions are available
 * for a given workflow item based on its current state.
 */

import type { WorkflowItem, WorkflowActionType } from '@/apis/template/workflow/types';

export interface AvailableAction {
    action: WorkflowActionType;
    label: string;
    variant: 'default' | 'destructive' | 'outline' | 'secondary';
    needsConfirmation?: boolean;
    confirmMessage?: string;
}

/**
 * Get available actions for a workflow item based on its current status and review status.
 */
export function getAvailableActions(item: WorkflowItem): AvailableAction[] {
    const actions: AvailableAction[] = [];
    const { status, reviewStatus, prData } = item;

    if (!status) return actions;

    const designPhases = [
        'Product Development',
        'Product Design',
        'Bug Investigation',
        'Technical Design',
    ];

    // Design review actions (approve/changes/reject)
    if (designPhases.includes(status) && reviewStatus === 'Waiting for Review') {
        actions.push({
            action: 'review-approve',
            label: 'Approve',
            variant: 'default',
        });
        actions.push({
            action: 'review-changes',
            label: 'Request Changes',
            variant: 'outline',
            needsConfirmation: true,
            confirmMessage: 'Request changes on this design? The agent will need to revise.',
        });
        actions.push({
            action: 'review-reject',
            label: 'Reject',
            variant: 'destructive',
            needsConfirmation: true,
            confirmMessage: 'Reject this item? This will stop further progress.',
        });

        // Choose Recommended (only for Bug Investigation with pending decision)
        if (status === 'Bug Investigation' && prData?.hasPendingDecision) {
            actions.push({
                action: 'choose-recommended',
                label: 'Choose Recommended',
                variant: 'secondary',
            });
        }
    }

    // Request changes on implementation PR
    if (status === 'PR Review' && reviewStatus === 'Waiting for Review' && prData?.currentPrNumber) {
        actions.push({
            action: 'request-changes-pr',
            label: 'Request Changes on PR',
            variant: 'outline',
            needsConfirmation: true,
            confirmMessage: 'Request changes on the implementation PR? The implementor will need to revise.',
        });
    }

    // Clarification received
    if (reviewStatus === 'Waiting for Clarification') {
        actions.push({
            action: 'clarification-received',
            label: 'Clarification Received',
            variant: 'default',
        });
    }

    // Mark done (any active item, not already done)
    if (status !== 'Done') {
        actions.push({
            action: 'mark-done',
            label: 'Mark Done',
            variant: 'outline',
            needsConfirmation: true,
            confirmMessage: 'Mark this item as Done? This will close the workflow.',
        });
    }

    return actions;
}
