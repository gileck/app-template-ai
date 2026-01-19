/**
 * GitHub Integration Module
 *
 * Shared GitHub API utilities for Projects V2 integration.
 */

export {
    GitHubClient,
    getGitHubClient,
    createGitHubClient,
    STATUSES,
    REVIEW_STATUSES,
    REVIEW_STATUS_FIELD,
    type GitHubConfig,
    type GitHubProjectStatus,
    type ProjectFieldOption,
} from './client';
