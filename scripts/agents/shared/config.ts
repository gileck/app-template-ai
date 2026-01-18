/**
 * Agent Configuration
 *
 * This file contains configuration for the GitHub Projects integration agents.
 * - STATUSES and REVIEW_STATUSES are constants (same for all projects)
 * - config object contains project-specific settings (child repos modify this)
 */

// ============================================================
// STATUSES - Same for all projects (not configurable)
// ============================================================

/**
 * Main status values (GitHub Project board columns)
 */
export const STATUSES = {
    backlog: 'Backlog',
    readyForProductDesign: 'Ready for Product Design',
    productDesignReview: 'Product Design Review',
    readyForTechDesign: 'Ready for Technical Design',
    techDesignReview: 'Technical Design Review',
    readyForDev: 'Ready for development',
    prReview: 'PR Review',
    inReview: 'In review',
    done: 'Done',
} as const;

/**
 * Review status values (custom field for review phases)
 */
export const REVIEW_STATUSES = {
    waitingForReview: 'Waiting for Review',
    approved: 'Approved',
    requestChanges: 'Request Changes',
    rejected: 'Rejected',
} as const;

/**
 * Custom field name for review status
 */
export const REVIEW_STATUS_FIELD = 'Review Status';

// Type helpers
export type Status = (typeof STATUSES)[keyof typeof STATUSES];
export type ReviewStatus = (typeof REVIEW_STATUSES)[keyof typeof REVIEW_STATUSES];

// ============================================================
// PROJECT CONFIG - Child repos modify this section only
// ============================================================

export interface AgentConfig {
    github: {
        /** GitHub username or organization name */
        owner: string;
        /** Repository name */
        repo: string;
        /** GitHub Project number (from URL: github.com/users/{owner}/projects/{number}) */
        projectNumber: number;
        /** Whether the project is owned by a user or organization */
        ownerType: 'user' | 'org';
    };
    telegram: {
        /** Whether to send Telegram notifications */
        enabled: boolean;
    };
    claude: {
        /** Claude model to use */
        model: 'sonnet' | 'opus' | 'haiku';
        /** Maximum number of agent turns */
        maxTurns: number;
        /** Timeout in seconds for agent execution */
        timeoutSeconds: number;
    };
}

/**
 * Project configuration
 *
 * Child repos: modify this config object for your project.
 * The status values above should NOT be changed.
 */
export const config: AgentConfig = {
    github: {
        owner: 'gileck',
        repo: 'app-template-ai',
        projectNumber: 3,
        ownerType: 'user',
    },
    telegram: {
        enabled: true,
    },
    claude: {
        model: 'sonnet',
        maxTurns: 100,
        timeoutSeconds: 600,
    },
};

// ============================================================
// DERIVED VALUES
// ============================================================

/**
 * Get the GitHub repository URL
 */
export function getRepoUrl(): string {
    return `https://github.com/${config.github.owner}/${config.github.repo}`;
}

/**
 * Get the GitHub Project URL
 */
export function getProjectUrl(): string {
    const ownerPath = config.github.ownerType === 'user' ? 'users' : 'orgs';
    return `https://github.com/${ownerPath}/${config.github.owner}/projects/${config.github.projectNumber}`;
}

/**
 * Get issue URL
 */
export function getIssueUrl(issueNumber: number): string {
    return `${getRepoUrl()}/issues/${issueNumber}`;
}

/**
 * Get PR URL
 */
export function getPrUrl(prNumber: number): string {
    return `${getRepoUrl()}/pull/${prNumber}`;
}
