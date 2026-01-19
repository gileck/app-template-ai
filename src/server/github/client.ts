/**
 * Shared GitHub Client
 *
 * Core GitHub API utilities for Projects V2 integration.
 * Used by both server code and CLI agents.
 */

import { Octokit } from '@octokit/rest';

// ============================================================
// CONSTANTS
// ============================================================

export const REVIEW_STATUS_FIELD = 'Review Status';

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

export const REVIEW_STATUSES = {
    waitingForReview: 'Waiting for Review',
    approved: 'Approved',
    requestChanges: 'Request Changes',
    rejected: 'Rejected',
} as const;

// ============================================================
// TYPES
// ============================================================

export interface GitHubConfig {
    owner: string;
    repo: string;
    projectNumber: number;
    ownerType: 'user' | 'org';
}

export interface GitHubProjectStatus {
    status: string | null;
    reviewStatus: string | null;
    issueState: 'OPEN' | 'CLOSED' | null;
}

export interface ProjectFieldOption {
    id: string;
    name: string;
}

// ============================================================
// GITHUB CLIENT CLASS
// ============================================================

/**
 * GitHub Projects V2 Client
 *
 * Handles all interactions with GitHub Projects API.
 * Caches project and field information for efficiency.
 */
export class GitHubClient {
    private octokit: Octokit;
    private config: GitHubConfig;
    private projectId: string | null = null;
    private statusFieldId: string | null = null;
    private reviewStatusFieldId: string | null = null;
    private statusOptions: Map<string, string> = new Map();
    private reviewStatusOptions: Map<string, string> = new Map();
    private initialized = false;

    constructor(token: string, config: GitHubConfig) {
        this.octokit = new Octokit({ auth: token.replace(/^["']|["']$/g, '') });
        this.config = config;
    }

    /**
     * Initialize project data (fetches project ID and field options)
     */
    async init(): Promise<void> {
        if (this.initialized) return;

        await this.fetchProjectId();
        await this.fetchProjectFields();
        this.initialized = true;
    }

    /**
     * Ensure client is initialized before operations
     */
    private async ensureInitialized(): Promise<void> {
        if (!this.initialized) {
            await this.init();
        }
    }

    /**
     * Fetch project ID
     */
    private async fetchProjectId(): Promise<void> {
        const { owner, projectNumber, ownerType } = this.config;

        const query = ownerType === 'user'
            ? `query($login: String!, $number: Int!) {
                user(login: $login) {
                    projectV2(number: $number) { id title }
                }
            }`
            : `query($login: String!, $number: Int!) {
                organization(login: $login) {
                    projectV2(number: $number) { id title }
                }
            }`;

        const result = await this.octokit.graphql<{
            user?: { projectV2: { id: string; title: string } };
            organization?: { projectV2: { id: string; title: string } };
        }>(query, { login: owner, number: projectNumber });

        const project = ownerType === 'user'
            ? result.user?.projectV2
            : result.organization?.projectV2;

        if (!project) {
            throw new Error(`Project not found: ${owner}/projects/${projectNumber}`);
        }

        this.projectId = project.id;
    }

    /**
     * Fetch project fields and cache options
     */
    private async fetchProjectFields(): Promise<void> {
        const query = `query($projectId: ID!) {
            node(id: $projectId) {
                ... on ProjectV2 {
                    fields(first: 50) {
                        nodes {
                            ... on ProjectV2SingleSelectField {
                                id
                                name
                                options { id name }
                            }
                        }
                    }
                }
            }
        }`;

        const result = await this.octokit.graphql<{
            node: {
                fields: {
                    nodes: Array<{
                        id: string;
                        name: string;
                        options?: Array<{ id: string; name: string }>;
                    }>;
                };
            };
        }>(query, { projectId: this.projectId });

        for (const field of result.node.fields.nodes) {
            if (field.name === 'Status' && field.options) {
                this.statusFieldId = field.id;
                for (const opt of field.options) {
                    this.statusOptions.set(opt.name, opt.id);
                }
            }
            if (field.name === REVIEW_STATUS_FIELD && field.options) {
                this.reviewStatusFieldId = field.id;
                for (const opt of field.options) {
                    this.reviewStatusOptions.set(opt.name, opt.id);
                }
            }
        }

        if (!this.statusFieldId) {
            throw new Error('Status field not found in project');
        }
    }

    /**
     * Get available status options
     */
    async getStatusOptions(): Promise<string[]> {
        await this.ensureInitialized();
        return Array.from(this.statusOptions.keys());
    }

    /**
     * Get available review status options
     */
    async getReviewStatusOptions(): Promise<string[]> {
        await this.ensureInitialized();
        return Array.from(this.reviewStatusOptions.keys());
    }

    /**
     * Get project item status
     */
    async getProjectItemStatus(itemId: string): Promise<GitHubProjectStatus | null> {
        const query = `query($itemId: ID!) {
            node(id: $itemId) {
                ... on ProjectV2Item {
                    content {
                        ... on Issue { state }
                    }
                    fieldValues(first: 20) {
                        nodes {
                            ... on ProjectV2ItemFieldSingleSelectValue {
                                name
                                field {
                                    ... on ProjectV2SingleSelectField { name }
                                }
                            }
                        }
                    }
                }
            }
        }`;

        try {
            const result = await this.octokit.graphql<{
                node: {
                    content: { state?: string } | null;
                    fieldValues: {
                        nodes: Array<{
                            name?: string;
                            field?: { name: string };
                        }>;
                    };
                } | null;
            }>(query, { itemId });

            if (!result.node) return null;

            let status: string | null = null;
            let reviewStatus: string | null = null;

            for (const fv of result.node.fieldValues.nodes) {
                if (fv.field?.name === 'Status' && fv.name) {
                    status = fv.name;
                }
                if (fv.field?.name === REVIEW_STATUS_FIELD && fv.name) {
                    reviewStatus = fv.name;
                }
            }

            return {
                status,
                reviewStatus,
                issueState: (result.node.content?.state as 'OPEN' | 'CLOSED') || null,
            };
        } catch (error) {
            console.error('Failed to fetch project item status:', error);
            return null;
        }
    }

    /**
     * Update project item status
     */
    async updateProjectItemStatus(itemId: string, status: string): Promise<void> {
        await this.ensureInitialized();

        const optionId = this.statusOptions.get(status);
        if (!optionId) {
            throw new Error(`Unknown status: ${status}. Available: ${Array.from(this.statusOptions.keys()).join(', ')}`);
        }

        const mutation = `mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
            updateProjectV2ItemFieldValue(
                input: {
                    projectId: $projectId
                    itemId: $itemId
                    fieldId: $fieldId
                    value: { singleSelectOptionId: $optionId }
                }
            ) {
                projectV2Item { id }
            }
        }`;

        await this.octokit.graphql(mutation, {
            projectId: this.projectId,
            itemId,
            fieldId: this.statusFieldId,
            optionId,
        });
    }

    /**
     * Update project item review status
     */
    async updateProjectItemReviewStatus(itemId: string, reviewStatus: string): Promise<void> {
        await this.ensureInitialized();

        if (!this.reviewStatusFieldId) {
            throw new Error(`Review Status field "${REVIEW_STATUS_FIELD}" not found in project`);
        }

        const optionId = this.reviewStatusOptions.get(reviewStatus);
        if (!optionId) {
            throw new Error(`Unknown review status: ${reviewStatus}. Available: ${Array.from(this.reviewStatusOptions.keys()).join(', ')}`);
        }

        const mutation = `mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
            updateProjectV2ItemFieldValue(
                input: {
                    projectId: $projectId
                    itemId: $itemId
                    fieldId: $fieldId
                    value: { singleSelectOptionId: $optionId }
                }
            ) {
                projectV2Item { id }
            }
        }`;

        await this.octokit.graphql(mutation, {
            projectId: this.projectId,
            itemId,
            fieldId: this.reviewStatusFieldId,
            optionId,
        });
    }

    /**
     * Add issue to project
     */
    async addIssueToProject(issueNodeId: string): Promise<string> {
        await this.ensureInitialized();

        const mutation = `mutation($projectId: ID!, $contentId: ID!) {
            addProjectV2ItemById(
                input: { projectId: $projectId, contentId: $contentId }
            ) {
                item { id }
            }
        }`;

        const result = await this.octokit.graphql<{
            addProjectV2ItemById: { item: { id: string } };
        }>(mutation, {
            projectId: this.projectId,
            contentId: issueNodeId,
        });

        return result.addProjectV2ItemById.item.id;
    }

    /**
     * Create an issue
     */
    async createIssue(
        title: string,
        body: string,
        labels?: string[]
    ): Promise<{ number: number; nodeId: string; url: string }> {
        const { owner, repo } = this.config;

        const { data } = await this.octokit.issues.create({
            owner,
            repo,
            title,
            body,
            labels,
        });

        return {
            number: data.number,
            nodeId: data.node_id,
            url: data.html_url,
        };
    }

    /**
     * Update issue body
     */
    async updateIssueBody(issueNumber: number, body: string): Promise<void> {
        const { owner, repo } = this.config;

        await this.octokit.issues.update({
            owner,
            repo,
            issue_number: issueNumber,
            body,
        });
    }

    /**
     * Get issue comments
     */
    async getIssueComments(issueNumber: number): Promise<Array<{
        id: number;
        body: string;
        author: string;
        createdAt: string;
    }>> {
        const { owner, repo } = this.config;

        const { data } = await this.octokit.issues.listComments({
            owner,
            repo,
            issue_number: issueNumber,
            per_page: 100,
        });

        return data.map((comment) => ({
            id: comment.id,
            body: comment.body || '',
            author: comment.user?.login || 'unknown',
            createdAt: comment.created_at,
        }));
    }

    /**
     * Add comment to issue
     */
    async addIssueComment(issueNumber: number, body: string): Promise<number> {
        const { owner, repo } = this.config;

        const { data } = await this.octokit.issues.createComment({
            owner,
            repo,
            issue_number: issueNumber,
            body,
        });

        return data.id;
    }

    /**
     * Get project ID (for direct access if needed)
     */
    async getProjectId(): Promise<string> {
        await this.ensureInitialized();
        return this.projectId!;
    }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

let defaultClient: GitHubClient | null = null;

/**
 * Get the default GitHub client (singleton)
 * Uses environment variables for configuration
 */
export function getGitHubClient(): GitHubClient {
    if (!defaultClient) {
        const token = process.env.GITHUB_TOKEN;
        if (!token) {
            throw new Error('GITHUB_TOKEN environment variable is required');
        }

        const config: GitHubConfig = {
            owner: process.env.GITHUB_OWNER || 'gileck',
            repo: process.env.GITHUB_REPO || 'app-template-ai',
            projectNumber: parseInt(process.env.GITHUB_PROJECT_NUMBER || '3', 10),
            ownerType: (process.env.GITHUB_OWNER_TYPE || 'user') as 'user' | 'org',
        };

        defaultClient = new GitHubClient(token, config);
    }

    return defaultClient;
}

/**
 * Create a new GitHub client with custom config
 */
export function createGitHubClient(token: string, config: GitHubConfig): GitHubClient {
    return new GitHubClient(token, config);
}
