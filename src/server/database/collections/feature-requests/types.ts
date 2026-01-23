import { ObjectId } from 'mongodb';

/**
 * Main workflow status for a feature request
 *
 * Supports both legacy statuses (for backward compatibility) and new workflow statuses.
 *
 * Legacy statuses (still supported):
 * - new: Not yet synced to GitHub
 * - in_progress: Synced to GitHub, check GitHub Project for detailed status
 * - done: Completed and merged
 * - rejected: Not going to implement
 *
 * New workflow statuses (for enhanced project management):
 * - backlog: Not yet prioritized or scheduled
 * - proposed: Submitted, awaiting approval
 * - approved: Approved for development
 * - waiting_for_review: Development complete, needs review
 * - blocked: Cannot proceed due to dependencies or issues
 */
export type FeatureRequestStatus =
    // Legacy statuses (backward compatible)
    | 'new'
    | 'in_progress'
    | 'done'
    | 'rejected'
    // New workflow statuses
    | 'backlog'
    | 'proposed'
    | 'approved'
    | 'waiting_for_review'
    | 'blocked';

/**
 * Review status within a design phase
 */
export type DesignReviewStatus =
    | 'not_started'      // Agent hasn't worked on it yet
    | 'in_progress'      // Agent is currently generating
    | 'pending_review'   // Waiting for admin approval
    | 'approved'         // Admin approved, can move to next phase
    | 'rejected';        // Admin rejected, agent can rework

/**
 * Priority level for feature requests
 */
export type FeatureRequestPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Design phase tracking (used for both product and tech design)
 */
export interface DesignPhase {
    content: string;                  // The design document (markdown)
    reviewStatus: DesignReviewStatus;
    adminComments?: string;           // Feedback when rejected
    iterations: number;               // How many times reworked
    generatedAt?: Date;
    approvedAt?: Date;
}

/**
 * Client-friendly design phase with string dates
 */
export interface DesignPhaseClient {
    content: string;
    reviewStatus: DesignReviewStatus;
    adminComments?: string;
    iterations: number;
    generatedAt?: string;
    approvedAt?: string;
}

/**
 * Comment in a feature request discussion
 */
export interface FeatureRequestComment {
    id: string;
    authorId: ObjectId;
    authorName: string;
    isAdmin: boolean;
    content: string;
    createdAt: Date;
}

/**
 * Client-friendly comment with string IDs and dates
 */
export interface FeatureRequestCommentClient {
    id: string;
    authorId: string;
    authorName: string;
    isAdmin: boolean;
    content: string;
    createdAt: string;
}

/**
 * Feature request document in the database
 */
export interface FeatureRequestDocument {
    _id: ObjectId;

    // Core fields (from user submission)
    title: string;
    description: string;
    page?: string;                    // Which page/area it relates to

    // Main workflow status
    status: FeatureRequestStatus;

    // Design phases with review workflow
    productDesign?: DesignPhase;
    techDesign?: DesignPhase;

    // User interaction
    needsUserInput: boolean;          // True when admin needs more info from user
    requestedBy: ObjectId;            // User who submitted
    requestedByName?: string;         // Username of who submitted
    comments: FeatureRequestComment[];

    // Admin-only fields
    adminNotes?: string;              // Internal notes (not shown to user)
    priority?: FeatureRequestPriority;

    // GitHub integration fields
    githubIssueUrl?: string;          // URL to the GitHub issue
    githubIssueNumber?: number;       // GitHub issue number
    githubProjectItemId?: string;     // GitHub Project item ID (for status updates)
    githubProjectStatus?: string;     // Current status in GitHub Project (e.g., "Product Design")
    githubReviewStatus?: string;      // Review Status in GitHub Project (e.g., "Waiting for Review")
    githubPrUrl?: string;             // URL to the pull request
    githubPrNumber?: number;          // GitHub PR number

    // Approval token for Telegram quick-approve link
    approvalToken?: string;           // Secure token for one-click approval

    // Health indicator tracking (optional - for new workflow features)
    lastActivityAt?: Date;            // Auto-updated on any change (for stale detection)
    statusChangedAt?: Date;           // Track time in current status (for review delay detection)

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Type for creating a new feature request
 */
export type FeatureRequestCreate = Omit<FeatureRequestDocument, '_id'>;

/**
 * Client-friendly feature request with string IDs and dates
 */
export interface FeatureRequestClient {
    _id: string;
    title: string;
    description: string;
    page?: string;
    status: FeatureRequestStatus;
    productDesign?: DesignPhaseClient;
    techDesign?: DesignPhaseClient;
    needsUserInput: boolean;
    requestedBy: string;
    requestedByName: string;
    comments: FeatureRequestCommentClient[];
    adminNotes?: string;
    priority?: FeatureRequestPriority;
    // GitHub integration fields
    githubIssueUrl?: string;
    githubIssueNumber?: number;
    githubProjectItemId?: string;
    githubProjectStatus?: string;
    githubReviewStatus?: string;
    githubPrUrl?: string;
    githubPrNumber?: number;
    lastActivityAt?: string;
    statusChangedAt?: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * Filters for querying feature requests
 */
export interface FeatureRequestFilters {
    status?: FeatureRequestStatus;
    priority?: FeatureRequestPriority;
    requestedBy?: ObjectId | string;
    startDate?: Date;
    endDate?: Date;
}

/**
 * Design phase type identifier
 */
export type DesignPhaseType = 'product' | 'tech';
