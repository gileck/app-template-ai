/**
 * Workflow Service Types
 *
 * Shared types used across all workflow service functions.
 */

export type ItemType = 'feature' | 'bug';
export type RoutingDestination = 'product-dev' | 'product-design' | 'tech-design' | 'implementation' | 'backlog';

export interface WorkflowItemRef {
    id: string;
    type: ItemType;
}

export interface ApproveOptions {
    initialRoute?: RoutingDestination;
    initialStatusOverride?: string;
}

export interface ApproveResult {
    success: boolean;
    error?: string;
    issueNumber?: number;
    issueUrl?: string;
    projectItemId?: string;
    needsRouting: boolean;
    title?: string;
}

export interface RouteResult {
    success: boolean;
    error?: string;
    targetStatus?: string;
    targetLabel?: string;
}

export interface DeleteOptions {
    force?: boolean;
}

export interface DeleteResult {
    success: boolean;
    error?: string;
    title?: string;
}
