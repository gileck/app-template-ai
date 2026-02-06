/**
 * Workflow API Types
 *
 * Client-facing types for the workflow items list API.
 */

// ============================================================================
// Shared Types
// ============================================================================

export interface WorkflowItemContent {
    type: 'Issue' | 'DraftIssue' | 'PullRequest';
    number?: number;
    title: string;
    url?: string;
    state?: 'OPEN' | 'CLOSED';
    labels?: string[];
}

export interface WorkflowItem {
    id: string;
    status: string | null;
    reviewStatus: string | null;
    content: WorkflowItemContent | null;
    createdAt: string | null;
}

// ============================================================================
// API Request/Response
// ============================================================================

export type ListWorkflowItemsRequest = Record<string, never>;

export interface ListWorkflowItemsResponse {
    items?: WorkflowItem[];
    error?: string;
}
