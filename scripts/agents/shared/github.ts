/**
 * GitHub API Utilities
 *
 * Provides GraphQL and REST API helpers for interacting with GitHub Projects V2.
 */

import { Octokit } from '@octokit/rest';
import { config, STATUSES, REVIEW_STATUSES, REVIEW_STATUS_FIELD, getIssueUrl, getPrUrl } from './config';
import type {
    ProjectField,
    ProjectFieldOption,
    ProjectItem,
    ProjectItemContent,
    ProjectItemFieldValue,
    GitHubComment,
    PRReviewComment,
} from './types';

// ============================================================
// INITIALIZATION
// ============================================================

let octokit: Octokit | null = null;
let projectId: string | null = null;
let statusFieldId: string | null = null;
let reviewStatusFieldId: string | null = null;
let statusOptions: Map<string, string> = new Map();
let reviewStatusOptions: Map<string, string> = new Map();

/**
 * Initialize the GitHub client and cache project/field IDs
 */
export async function initGitHub(): Promise<void> {
    const token = getGitHubToken();
    octokit = new Octokit({ auth: token });

    // Fetch and cache project info
    await fetchProjectInfo();
}

/**
 * Get GitHub token from environment
 */
function getGitHubToken(): string {
    let token = process.env.GITHUB_TOKEN;

    if (!token) {
        throw new Error('GITHUB_TOKEN environment variable is required');
    }

    // Strip quotes that may be added in cloud environments
    token = token.replace(/^["']|["']$/g, '');

    return token;
}

/**
 * Get the initialized Octokit instance
 */
function getOctokit(): Octokit {
    if (!octokit) {
        throw new Error('GitHub client not initialized. Call initGitHub() first.');
    }
    return octokit;
}

// ============================================================
// GRAPHQL QUERIES
// ============================================================

/**
 * Fetch project ID and field information
 */
async function fetchProjectInfo(): Promise<void> {
    const oc = getOctokit();
    const { owner, projectNumber, ownerType } = config.github;

    // Query to get project ID
    const projectQuery =
        ownerType === 'user'
            ? `query($login: String!, $number: Int!) {
          user(login: $login) {
            projectV2(number: $number) {
              id
              title
            }
          }
        }`
            : `query($login: String!, $number: Int!) {
          organization(login: $login) {
            projectV2(number: $number) {
              id
              title
            }
          }
        }`;

    const projectResult = await oc.graphql<{
        user?: { projectV2: { id: string; title: string } };
        organization?: { projectV2: { id: string; title: string } };
    }>(projectQuery, {
        login: owner,
        number: projectNumber,
    });

    const project = ownerType === 'user' ? projectResult.user?.projectV2 : projectResult.organization?.projectV2;

    if (!project) {
        throw new Error(`Project not found: ${owner}/projects/${projectNumber}`);
    }

    projectId = project.id;
    console.log(`  Connected to project: ${project.title}`);

    // Fetch fields
    await fetchProjectFields();
}

/**
 * Fetch project fields and cache field IDs
 */
async function fetchProjectFields(): Promise<void> {
    const oc = getOctokit();

    const fieldsQuery = `query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          fields(first: 50) {
            nodes {
              ... on ProjectV2Field {
                id
                name
                dataType
              }
              ... on ProjectV2SingleSelectField {
                id
                name
                options {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }`;

    const result = await oc.graphql<{
        node: {
            fields: {
                nodes: Array<{
                    id: string;
                    name: string;
                    dataType?: string;
                    options?: Array<{ id: string; name: string }>;
                }>;
            };
        };
    }>(fieldsQuery, {
        projectId: projectId,
    });

    for (const field of result.node.fields.nodes) {
        // Find Status field
        if (field.name === 'Status' && field.options) {
            statusFieldId = field.id;
            for (const option of field.options) {
                statusOptions.set(option.name, option.id);
            }
        }

        // Find Review Status field
        if (field.name === REVIEW_STATUS_FIELD && field.options) {
            reviewStatusFieldId = field.id;
            for (const option of field.options) {
                reviewStatusOptions.set(option.name, option.id);
            }
        }
    }

    if (!statusFieldId) {
        throw new Error('Status field not found in project');
    }

    console.log(`  Found ${statusOptions.size} status options, ${reviewStatusOptions.size} review status options`);
}

/**
 * Get all project fields
 */
export async function getProjectFields(): Promise<ProjectField[]> {
    const oc = getOctokit();

    const query = `query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          fields(first: 50) {
            nodes {
              ... on ProjectV2Field {
                id
                name
                dataType
              }
              ... on ProjectV2SingleSelectField {
                id
                name
                options {
                  id
                  name
                  description
                  color
                }
              }
            }
          }
        }
      }
    }`;

    const result = await oc.graphql<{
        node: {
            fields: {
                nodes: Array<{
                    id: string;
                    name: string;
                    dataType?: string;
                    options?: ProjectFieldOption[];
                }>;
            };
        };
    }>(query, {
        projectId: projectId,
    });

    return result.node.fields.nodes.map((field) => ({
        id: field.id,
        name: field.name,
        dataType: field.dataType || 'SINGLE_SELECT',
        options: field.options,
    }));
}

/**
 * List project items with optional status filter
 */
export async function listProjectItems(
    statusFilter?: string,
    reviewStatusFilter?: string,
    limit: number = 50
): Promise<ProjectItem[]> {
    const oc = getOctokit();

    const query = `query($projectId: ID!, $first: Int!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          items(first: $first) {
            nodes {
              id
              content {
                ... on Issue {
                  id
                  number
                  title
                  body
                  url
                  state
                  labels(first: 10) {
                    nodes {
                      name
                    }
                  }
                  repository {
                    owner {
                      login
                    }
                    name
                  }
                }
                ... on DraftIssue {
                  id
                  title
                  body
                }
                ... on PullRequest {
                  id
                  number
                  title
                  body
                  url
                  state
                  repository {
                    owner {
                      login
                    }
                    name
                  }
                }
              }
              fieldValues(first: 20) {
                nodes {
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    name
                    optionId
                    field {
                      ... on ProjectV2SingleSelectField {
                        id
                        name
                      }
                    }
                  }
                  ... on ProjectV2ItemFieldTextValue {
                    text
                    field {
                      ... on ProjectV2Field {
                        id
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }`;

    const result = await oc.graphql<{
        node: {
            items: {
                nodes: Array<{
                    id: string;
                    content: {
                        id: string;
                        number?: number;
                        title: string;
                        body: string;
                        url?: string;
                        state?: string;
                        labels?: { nodes: Array<{ name: string }> };
                        repository?: { owner: { login: string }; name: string };
                    } | null;
                    fieldValues: {
                        nodes: Array<{
                            name?: string;
                            text?: string;
                            optionId?: string;
                            field?: { id: string; name: string };
                        }>;
                    };
                }>;
            };
        };
    }>(query, {
        projectId: projectId,
        first: limit,
    });

    const items: ProjectItem[] = [];

    for (const node of result.node.items.nodes) {
        let status: string | null = null;
        let reviewStatus: string | null = null;
        const fieldValues: ProjectItemFieldValue[] = [];

        for (const fv of node.fieldValues.nodes) {
            if (fv.field?.name === 'Status' && fv.name) {
                status = fv.name;
            }
            if (fv.field?.name === REVIEW_STATUS_FIELD && fv.name) {
                reviewStatus = fv.name;
            }
            if (fv.field) {
                fieldValues.push({
                    fieldId: fv.field.id,
                    fieldName: fv.field.name,
                    value: fv.name || fv.text || null,
                    optionId: fv.optionId,
                });
            }
        }

        // Apply filters
        if (statusFilter && status !== statusFilter) continue;
        if (reviewStatusFilter && reviewStatus !== reviewStatusFilter) continue;

        let content: ProjectItemContent | null = null;
        if (node.content) {
            const c = node.content;
            content = {
                type: c.url?.includes('/pull/') ? 'PullRequest' : c.number ? 'Issue' : 'DraftIssue',
                id: c.id,
                number: c.number,
                title: c.title,
                body: c.body,
                url: c.url,
                state: c.state as 'OPEN' | 'CLOSED' | undefined,
                labels: c.labels?.nodes.map((l) => l.name),
                repoOwner: c.repository?.owner.login,
                repoName: c.repository?.name,
            };
        }

        items.push({
            id: node.id,
            status: status as ProjectItem['status'],
            reviewStatus: reviewStatus as ProjectItem['reviewStatus'],
            content,
            fieldValues,
        });
    }

    return items;
}

/**
 * Get a single project item by ID
 */
export async function getProjectItem(itemId: string): Promise<ProjectItem | null> {
    const oc = getOctokit();

    const query = `query($itemId: ID!) {
      node(id: $itemId) {
        ... on ProjectV2Item {
          id
          content {
            ... on Issue {
              id
              number
              title
              body
              url
              state
              labels(first: 10) {
                nodes {
                  name
                }
              }
              repository {
                owner {
                  login
                }
                name
              }
            }
            ... on DraftIssue {
              id
              title
              body
            }
          }
          fieldValues(first: 20) {
            nodes {
              ... on ProjectV2ItemFieldSingleSelectValue {
                name
                optionId
                field {
                  ... on ProjectV2SingleSelectField {
                    id
                    name
                  }
                }
              }
              ... on ProjectV2ItemFieldTextValue {
                text
                field {
                  ... on ProjectV2Field {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      }
    }`;

    const result = await oc.graphql<{
        node: {
            id: string;
            content: {
                id: string;
                number?: number;
                title: string;
                body: string;
                url?: string;
                state?: string;
                labels?: { nodes: Array<{ name: string }> };
                repository?: { owner: { login: string }; name: string };
            } | null;
            fieldValues: {
                nodes: Array<{
                    name?: string;
                    text?: string;
                    optionId?: string;
                    field?: { id: string; name: string };
                }>;
            };
        } | null;
    }>(query, {
        itemId,
    });

    if (!result.node) return null;

    const node = result.node;
    let status: string | null = null;
    let reviewStatus: string | null = null;
    const fieldValues: ProjectItemFieldValue[] = [];

    for (const fv of node.fieldValues.nodes) {
        if (fv.field?.name === 'Status' && fv.name) {
            status = fv.name;
        }
        if (fv.field?.name === REVIEW_STATUS_FIELD && fv.name) {
            reviewStatus = fv.name;
        }
        if (fv.field) {
            fieldValues.push({
                fieldId: fv.field.id,
                fieldName: fv.field.name,
                value: fv.name || fv.text || null,
                optionId: fv.optionId,
            });
        }
    }

    let content: ProjectItemContent | null = null;
    if (node.content) {
        const c = node.content;
        content = {
            type: c.number ? 'Issue' : 'DraftIssue',
            id: c.id,
            number: c.number,
            title: c.title,
            body: c.body,
            url: c.url,
            state: c.state as 'OPEN' | 'CLOSED' | undefined,
            labels: c.labels?.nodes.map((l) => l.name),
            repoOwner: c.repository?.owner.login,
            repoName: c.repository?.name,
        };
    }

    return {
        id: node.id,
        status: status as ProjectItem['status'],
        reviewStatus: reviewStatus as ProjectItem['reviewStatus'],
        content,
        fieldValues,
    };
}

// ============================================================
// GRAPHQL MUTATIONS
// ============================================================

/**
 * Update project item status
 */
export async function updateProjectItemStatus(itemId: string, status: string): Promise<void> {
    const oc = getOctokit();

    const optionId = statusOptions.get(status);
    if (!optionId) {
        throw new Error(`Unknown status: ${status}. Available: ${Array.from(statusOptions.keys()).join(', ')}`);
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
        projectV2Item {
          id
        }
      }
    }`;

    await oc.graphql(mutation, {
        projectId,
        itemId,
        fieldId: statusFieldId,
        optionId,
    });
}

/**
 * Update project item review status
 */
export async function updateProjectItemReviewStatus(itemId: string, reviewStatus: string): Promise<void> {
    const oc = getOctokit();

    if (!reviewStatusFieldId) {
        throw new Error(`Review Status field "${REVIEW_STATUS_FIELD}" not found in project`);
    }

    const optionId = reviewStatusOptions.get(reviewStatus);
    if (!optionId) {
        throw new Error(
            `Unknown review status: ${reviewStatus}. Available: ${Array.from(reviewStatusOptions.keys()).join(', ')}`
        );
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
        projectV2Item {
          id
        }
      }
    }`;

    await oc.graphql(mutation, {
        projectId,
        itemId,
        fieldId: reviewStatusFieldId,
        optionId,
    });
}

/**
 * Add an issue to the project
 */
export async function addIssueToProject(issueNodeId: string): Promise<string> {
    const oc = getOctokit();

    const mutation = `mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(
        input: {
          projectId: $projectId
          contentId: $contentId
        }
      ) {
        item {
          id
        }
      }
    }`;

    const result = await oc.graphql<{
        addProjectV2ItemById: { item: { id: string } };
    }>(mutation, {
        projectId,
        contentId: issueNodeId,
    });

    return result.addProjectV2ItemById.item.id;
}

// ============================================================
// REST API HELPERS
// ============================================================

/**
 * Create a new issue
 */
export async function createIssue(
    title: string,
    body: string,
    labels?: string[]
): Promise<{ number: number; nodeId: string; url: string }> {
    const oc = getOctokit();
    const { owner, repo } = config.github;

    const { data } = await oc.issues.create({
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
export async function updateIssueBody(issueNumber: number, body: string): Promise<void> {
    const oc = getOctokit();
    const { owner, repo } = config.github;

    await oc.issues.update({
        owner,
        repo,
        issue_number: issueNumber,
        body,
    });
}

/**
 * Get issue comments
 */
export async function getIssueComments(issueNumber: number): Promise<GitHubComment[]> {
    const oc = getOctokit();
    const { owner, repo } = config.github;

    const { data } = await oc.issues.listComments({
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
        updatedAt: comment.updated_at,
    }));
}

/**
 * Add a comment to an issue
 */
export async function addIssueComment(issueNumber: number, body: string): Promise<number> {
    const oc = getOctokit();
    const { owner, repo } = config.github;

    const { data } = await oc.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body,
    });

    return data.id;
}

/**
 * Create a pull request
 */
export async function createPullRequest(
    head: string,
    base: string,
    title: string,
    body: string
): Promise<{ number: number; url: string }> {
    const oc = getOctokit();
    const { owner, repo } = config.github;

    const { data } = await oc.pulls.create({
        owner,
        repo,
        head,
        base,
        title,
        body,
    });

    return {
        number: data.number,
        url: data.html_url,
    };
}

/**
 * Get PR review comments
 */
export async function getPRReviewComments(prNumber: number): Promise<PRReviewComment[]> {
    const oc = getOctokit();
    const { owner, repo } = config.github;

    const { data } = await oc.pulls.listReviewComments({
        owner,
        repo,
        pull_number: prNumber,
        per_page: 100,
    });

    return data.map((comment) => ({
        id: comment.id,
        body: comment.body,
        author: comment.user?.login || 'unknown',
        path: comment.path,
        line: comment.line || undefined,
        createdAt: comment.created_at,
    }));
}

/**
 * Add a comment to a PR
 */
export async function addPRComment(prNumber: number, body: string): Promise<number> {
    const oc = getOctokit();
    const { owner, repo } = config.github;

    // PR comments are actually issue comments
    const { data } = await oc.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body,
    });

    return data.id;
}

/**
 * Get the default branch of the repository
 */
export async function getDefaultBranch(): Promise<string> {
    const oc = getOctokit();
    const { owner, repo } = config.github;

    const { data } = await oc.repos.get({ owner, repo });
    return data.default_branch;
}

/**
 * Create a new branch from the default branch
 */
export async function createBranch(branchName: string): Promise<void> {
    const oc = getOctokit();
    const { owner, repo } = config.github;

    // Get the default branch's SHA
    const defaultBranch = await getDefaultBranch();
    const { data: refData } = await oc.git.getRef({
        owner,
        repo,
        ref: `heads/${defaultBranch}`,
    });

    // Create the new branch
    await oc.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: refData.object.sha,
    });
}

/**
 * Check if a branch exists
 */
export async function branchExists(branchName: string): Promise<boolean> {
    const oc = getOctokit();
    const { owner, repo } = config.github;

    try {
        await oc.git.getRef({
            owner,
            repo,
            ref: `heads/${branchName}`,
        });
        return true;
    } catch {
        return false;
    }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Get the cached project ID
 */
export function getProjectId(): string {
    if (!projectId) {
        throw new Error('Project not initialized. Call initGitHub() first.');
    }
    return projectId;
}

/**
 * Check if the Review Status field exists
 */
export function hasReviewStatusField(): boolean {
    return reviewStatusFieldId !== null;
}

/**
 * Get available status options
 */
export function getStatusOptions(): string[] {
    return Array.from(statusOptions.keys());
}

/**
 * Get available review status options
 */
export function getReviewStatusOptions(): string[] {
    return Array.from(reviewStatusOptions.keys());
}
