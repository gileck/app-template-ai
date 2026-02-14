/**
 * Workflow Utilities
 *
 * Shared formatting functions used across workflow components.
 */

export function formatDate(dateStr: string | null): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const ACTION_LABELS: Record<string, string> = {
    bug_approved: 'Bug approved',
    feature_approved: 'Feature approved',
    status_advanced: 'Status advanced',
    marked_done: 'Marked done',
    routed: 'Routed',
    pr_merged: 'PR merged',
    design_pr_merged: 'Design PR merged',
    final_pr_merged: 'Final PR merged',
    design_approved: 'Design approved',
    pr_changes_requested: 'PR changes requested',
    design_pr_changes_requested: 'Design PR changes requested',
    agent_completed: 'Agent completed',
    agent_started: 'Agent started',
    clarification_received: 'Clarification received',
    choose_recommended: 'Recommended option chosen',
    status_changed: 'Status changed',
    undo: 'Action undone',
    revert_initiated: 'Revert initiated',
    revert_merged: 'Revert merged',
    decision_routed: 'Decision routed',
    design_changes_requested: 'Design changes requested',
    design_rejected: 'Design rejected',
    workflow_item_created: 'Workflow item created',
};

export function formatAction(action: string): string {
    return ACTION_LABELS[action] ?? action.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

export function formatRelativeTime(timestamp: string): string {
    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
