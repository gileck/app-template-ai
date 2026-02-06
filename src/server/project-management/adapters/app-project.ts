/**
 * App Project Adapter
 *
 * Implements ProjectManagementAdapter using MongoDB for workflow status tracking
 * and GitHubClient for all GitHub operations (issues, PRs, branches, files).
 *
 * Status fields (workflowStatus, workflowReviewStatus, implementationPhase)
 * are stored directly on FeatureRequestDocument and ReportDocument in MongoDB.
 * GitHub Issues, PRs, branches, and comments remain on GitHub via GitHubClient.
 */

import { GitHubClient } from '../github-client';
import { STATUSES, REVIEW_STATUSES, REVIEW_STATUS_FIELD, IMPLEMENTATION_PHASE_FIELD } from '../config';
import type {
    ProjectManagementAdapter,
    ProjectItem,
    ProjectItemContent,
    ProjectItemFieldValue,
    ProjectItemComment,
    PRReviewComment,
    CreateIssueResult,
    CreatePRResult,
    ProjectField,
    ListItemsOptions,
    GitHubIssueDetails,
} from '../types';
import type { Status, ReviewStatus } from '../config';
import { findFeatureRequestById, findByWorkflowStatus as findFeaturesByWorkflowStatus, updateWorkflowFields as updateFeatureWorkflowFields } from '@/server/database/collections/template/feature-requests/feature-requests';
import { findReportById, findByWorkflowStatus as findReportsByWorkflowStatus, updateWorkflowFields as updateReportWorkflowFields } from '@/server/database/collections/template/reports/reports';
import type { FeatureRequestDocument } from '@/server/database/collections/template/feature-requests/types';
import type { ReportDocument } from '@/server/database/collections/template/reports/types';
import { getProjectConfig } from '../config';

// ============================================================
// COMPOSITE ID HELPERS
// ============================================================

function buildCompositeId(type: 'feature' | 'report', mongoId: string): string {
    return `${type}:${mongoId}`;
}

function parseCompositeId(id: string): { type: 'feature' | 'report'; mongoId: string } {
    const colonIndex = id.indexOf(':');
    if (colonIndex === -1) {
        throw new Error(`Invalid composite ID (missing type prefix): ${id}`);
    }
    const type = id.substring(0, colonIndex);
    const mongoId = id.substring(colonIndex + 1);

    if (type !== 'feature' && type !== 'report') {
        throw new Error(`Invalid composite ID type: ${type}. Expected 'feature' or 'report'.`);
    }

    return { type, mongoId };
}

// ============================================================
// ADAPTER
// ============================================================

export class AppProjectAdapter implements ProjectManagementAdapter {
    private githubClient: GitHubClient;
    private _initialized = false;

    constructor() {
        this.githubClient = new GitHubClient(getProjectConfig());
    }

    // --------------------------------------------------------
    // Initialization
    // --------------------------------------------------------

    async init(): Promise<void> {
        if (this._initialized) return;
        await this.githubClient.init();
        this._initialized = true;
    }

    isInitialized(): boolean {
        return this._initialized;
    }

    // --------------------------------------------------------
    // Project Items (MongoDB-backed)
    // --------------------------------------------------------

    async listItems(options?: ListItemsOptions): Promise<ProjectItem[]> {
        const [features, reports] = await Promise.all([
            findFeaturesByWorkflowStatus(options?.status, options?.reviewStatus),
            findReportsByWorkflowStatus(options?.status, options?.reviewStatus),
        ]);

        const items: ProjectItem[] = [];

        for (const f of features) {
            items.push(this.featureToProjectItem(f));
        }

        for (const r of reports) {
            items.push(this.reportToProjectItem(r));
        }

        // Apply limit
        if (options?.limit && items.length > options.limit) {
            return items.slice(0, options.limit);
        }

        return items;
    }

    async getItem(itemId: string): Promise<ProjectItem | null> {
        const { type, mongoId } = parseCompositeId(itemId);

        if (type === 'feature') {
            const doc = await findFeatureRequestById(mongoId);
            if (!doc) return null;
            return this.featureToProjectItem(doc);
        } else {
            const doc = await findReportById(mongoId);
            if (!doc) return null;
            return this.reportToProjectItem(doc);
        }
    }

    // --------------------------------------------------------
    // Status Management (MongoDB-backed)
    // --------------------------------------------------------

    async getAvailableStatuses(): Promise<string[]> {
        return Object.values(STATUSES);
    }

    async getAvailableReviewStatuses(): Promise<string[]> {
        return Object.values(REVIEW_STATUSES);
    }

    hasReviewStatusField(): boolean {
        return true;
    }

    async updateItemStatus(itemId: string, status: string): Promise<void> {
        const { type, mongoId } = parseCompositeId(itemId);
        const updateFn = type === 'feature' ? updateFeatureWorkflowFields : updateReportWorkflowFields;
        await updateFn(mongoId, { workflowStatus: status });
    }

    async updateItemReviewStatus(itemId: string, reviewStatus: string): Promise<void> {
        const { type, mongoId } = parseCompositeId(itemId);
        const updateFn = type === 'feature' ? updateFeatureWorkflowFields : updateReportWorkflowFields;
        await updateFn(mongoId, { workflowReviewStatus: reviewStatus });
    }

    async clearItemReviewStatus(itemId: string): Promise<void> {
        const { type, mongoId } = parseCompositeId(itemId);
        const updateFn = type === 'feature' ? updateFeatureWorkflowFields : updateReportWorkflowFields;
        await updateFn(mongoId, { workflowReviewStatus: null });
    }

    // --------------------------------------------------------
    // Implementation Phase (MongoDB-backed)
    // --------------------------------------------------------

    hasImplementationPhaseField(): boolean {
        return true;
    }

    async getImplementationPhase(itemId: string): Promise<string | null> {
        const { type, mongoId } = parseCompositeId(itemId);

        if (type === 'feature') {
            const doc = await findFeatureRequestById(mongoId);
            return doc?.implementationPhase || null;
        } else {
            const doc = await findReportById(mongoId);
            return doc?.implementationPhase || null;
        }
    }

    async setImplementationPhase(itemId: string, value: string): Promise<void> {
        const { type, mongoId } = parseCompositeId(itemId);
        const updateFn = type === 'feature' ? updateFeatureWorkflowFields : updateReportWorkflowFields;
        await updateFn(mongoId, { implementationPhase: value });
    }

    async clearImplementationPhase(itemId: string): Promise<void> {
        const { type, mongoId } = parseCompositeId(itemId);
        const updateFn = type === 'feature' ? updateFeatureWorkflowFields : updateReportWorkflowFields;
        await updateFn(mongoId, { implementationPhase: null });
    }

    // --------------------------------------------------------
    // Issues (delegates to GitHubClient, except addIssueToProject)
    // --------------------------------------------------------

    async createIssue(title: string, body: string, labels?: string[]): Promise<CreateIssueResult> {
        return this.githubClient.createIssue(title, body, labels);
    }

    async updateIssueBody(issueNumber: number, body: string): Promise<void> {
        return this.githubClient.updateIssueBody(issueNumber, body);
    }

    async addIssueComment(issueNumber: number, body: string): Promise<number> {
        return this.githubClient.addIssueComment(issueNumber, body);
    }

    async getIssueComments(issueNumber: number): Promise<ProjectItemComment[]> {
        return this.githubClient.getIssueComments(issueNumber);
    }

    async getIssueDetails(issueNumber: number): Promise<GitHubIssueDetails | null> {
        return this.githubClient.getIssueDetails(issueNumber);
    }

    async addIssueToProject(
        _issueNodeId: string,
        context?: { type: 'feature' | 'report'; mongoId: string }
    ): Promise<string> {
        if (!context) {
            throw new Error('AppProjectAdapter.addIssueToProject requires context (type + mongoId)');
        }
        // Return composite key as the projectItemId
        return buildCompositeId(context.type, context.mongoId);
    }

    async findIssueCommentByMarker(issueNumber: number, marker: string): Promise<{
        id: number;
        body: string;
    } | null> {
        return this.githubClient.findIssueCommentByMarker(issueNumber, marker);
    }

    async updateIssueComment(issueNumber: number, commentId: number, body: string): Promise<void> {
        return this.githubClient.updateIssueComment(issueNumber, commentId, body);
    }

    // --------------------------------------------------------
    // Pull Requests (delegates to GitHubClient)
    // --------------------------------------------------------

    async createPullRequest(
        head: string,
        base: string,
        title: string,
        body: string,
        reviewers?: string[]
    ): Promise<CreatePRResult> {
        return this.githubClient.createPullRequest(head, base, title, body, reviewers);
    }

    async getPRReviewComments(prNumber: number): Promise<PRReviewComment[]> {
        return this.githubClient.getPRReviewComments(prNumber);
    }

    async getPRComments(prNumber: number): Promise<ProjectItemComment[]> {
        return this.githubClient.getPRComments(prNumber);
    }

    async getPRFiles(prNumber: number): Promise<string[]> {
        return this.githubClient.getPRFiles(prNumber);
    }

    async addPRComment(prNumber: number, body: string): Promise<number> {
        return this.githubClient.addPRComment(prNumber, body);
    }

    async requestPRReviewers(prNumber: number, reviewers: string[]): Promise<void> {
        return this.githubClient.requestPRReviewers(prNumber, reviewers);
    }

    async submitPRReview(
        prNumber: number,
        event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT',
        body: string
    ): Promise<void> {
        return this.githubClient.submitPRReview(prNumber, event, body);
    }

    async getPRDetails(prNumber: number): Promise<{ state: 'open' | 'closed'; merged: boolean; headBranch: string } | null> {
        return this.githubClient.getPRDetails(prNumber);
    }

    async mergePullRequest(
        prNumber: number,
        commitTitle: string,
        commitMessage: string
    ): Promise<string> {
        return this.githubClient.mergePullRequest(prNumber, commitTitle, commitMessage);
    }

    async getMergeCommitSha(prNumber: number): Promise<string | null> {
        return this.githubClient.getMergeCommitSha(prNumber);
    }

    async createRevertPR(
        mergeCommitSha: string,
        originalPrNumber: number,
        issueNumber: number
    ): Promise<{ prNumber: number; url: string } | null> {
        return this.githubClient.createRevertPR(mergeCommitSha, originalPrNumber, issueNumber);
    }

    async findPRCommentByMarker(prNumber: number, marker: string): Promise<{
        id: number;
        body: string;
    } | null> {
        return this.githubClient.findPRCommentByMarker(prNumber, marker);
    }

    async updatePRComment(prNumber: number, commentId: number, body: string): Promise<void> {
        return this.githubClient.updatePRComment(prNumber, commentId, body);
    }

    async getPRInfo(prNumber: number): Promise<{
        title: string;
        body: string;
        additions: number;
        deletions: number;
        changedFiles: number;
        commits: number;
    } | null> {
        return this.githubClient.getPRInfo(prNumber);
    }

    async findOpenPRForIssue(issueNumber: number): Promise<{ prNumber: number; branchName: string } | null> {
        return this.githubClient.findOpenPRForIssue(issueNumber);
    }

    // --------------------------------------------------------
    // Branches (delegates to GitHubClient)
    // --------------------------------------------------------

    async getDefaultBranch(): Promise<string> {
        return this.githubClient.getDefaultBranch();
    }

    async createBranch(branchName: string, baseBranch?: string): Promise<void> {
        return this.githubClient.createBranch(branchName, baseBranch);
    }

    async branchExists(branchName: string): Promise<boolean> {
        return this.githubClient.branchExists(branchName);
    }

    async deleteBranch(branchName: string): Promise<void> {
        return this.githubClient.deleteBranch(branchName);
    }

    // --------------------------------------------------------
    // Project Fields (static definitions)
    // --------------------------------------------------------

    async getProjectFields(): Promise<ProjectField[]> {
        return [
            {
                id: 'status',
                name: 'Status',
                dataType: 'SINGLE_SELECT',
                options: Object.values(STATUSES).map((name, i) => ({
                    id: `status-${i}`,
                    name,
                })),
            },
            {
                id: 'review-status',
                name: REVIEW_STATUS_FIELD,
                dataType: 'SINGLE_SELECT',
                options: Object.values(REVIEW_STATUSES).map((name, i) => ({
                    id: `review-${i}`,
                    name,
                })),
            },
            {
                id: 'implementation-phase',
                name: IMPLEMENTATION_PHASE_FIELD,
                dataType: 'TEXT',
            },
        ];
    }

    // --------------------------------------------------------
    // File Operations (delegates to GitHubClient)
    // --------------------------------------------------------

    async createOrUpdateFileContents(path: string, content: string, message: string): Promise<void> {
        return this.githubClient.createOrUpdateFileContents(path, content, message);
    }

    // ============================================================
    // PRIVATE: Document → ProjectItem Conversion
    // ============================================================

    private featureToProjectItem(doc: FeatureRequestDocument): ProjectItem {
        const mongoId = doc._id.toHexString();
        const compositeId = buildCompositeId('feature', mongoId);
        const { owner, repo } = getProjectConfig().github;

        const fieldValues: ProjectItemFieldValue[] = [];
        if (doc.workflowStatus) {
            fieldValues.push({ fieldId: 'status', fieldName: 'Status', value: doc.workflowStatus });
        }
        if (doc.workflowReviewStatus) {
            fieldValues.push({ fieldId: 'review-status', fieldName: REVIEW_STATUS_FIELD, value: doc.workflowReviewStatus });
        }
        if (doc.implementationPhase) {
            fieldValues.push({ fieldId: 'implementation-phase', fieldName: IMPLEMENTATION_PHASE_FIELD, value: doc.implementationPhase });
        }

        const content: ProjectItemContent = {
            type: 'Issue',
            id: compositeId,
            number: doc.githubIssueNumber,
            title: doc.githubIssueTitle || doc.title,
            body: `${doc.title}\n\n${doc.description}`,
            url: doc.githubIssueUrl,
            state: 'OPEN',
            labels: ['feature'],
            repoOwner: owner,
            repoName: repo,
        };

        return {
            id: compositeId,
            status: (doc.workflowStatus as Status) || null,
            reviewStatus: (doc.workflowReviewStatus as ReviewStatus) || null,
            content,
            fieldValues,
        };
    }

    private reportToProjectItem(doc: ReportDocument): ProjectItem {
        const mongoId = doc._id.toHexString();
        const compositeId = buildCompositeId('report', mongoId);
        const { owner, repo } = getProjectConfig().github;

        const fieldValues: ProjectItemFieldValue[] = [];
        if (doc.workflowStatus) {
            fieldValues.push({ fieldId: 'status', fieldName: 'Status', value: doc.workflowStatus });
        }
        if (doc.workflowReviewStatus) {
            fieldValues.push({ fieldId: 'review-status', fieldName: REVIEW_STATUS_FIELD, value: doc.workflowReviewStatus });
        }
        if (doc.implementationPhase) {
            fieldValues.push({ fieldId: 'implementation-phase', fieldName: IMPLEMENTATION_PHASE_FIELD, value: doc.implementationPhase });
        }

        const content: ProjectItemContent = {
            type: 'Issue',
            id: compositeId,
            number: doc.githubIssueNumber,
            title: doc.githubIssueTitle || doc.description || doc.errorMessage || 'Bug Report',
            body: `${doc.description || ''}\n\n${doc.errorMessage || ''}`.trim(),
            url: doc.githubIssueUrl,
            state: 'OPEN',
            labels: ['bug'],
            repoOwner: owner,
            repoName: repo,
        };

        return {
            id: compositeId,
            status: (doc.workflowStatus as Status) || null,
            reviewStatus: (doc.workflowReviewStatus as ReviewStatus) || null,
            content,
            fieldValues,
        };
    }
}
