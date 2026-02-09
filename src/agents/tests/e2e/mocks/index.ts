/**
 * E2E Mock Registration
 *
 * Barrel export for all mocks.
 */

export { MockProjectAdapter } from './mock-project-adapter';
export { MockGitAdapter } from './mock-git-adapter';
export { mockRunAgent, agentCalls, resetAgentCalls } from './mock-run-agent';
export {
    capturedNotifications,
    resetNotifications,
} from './mock-notifications';
export * as mockNotifications from './mock-notifications';
export { resetDesignFiles } from './mock-design-files';
export * as mockDesignFiles from './mock-design-files';
