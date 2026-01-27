/**
 * Playwright MCP Configuration
 *
 * Configuration for using Playwright MCP with the Claude Agent SDK
 * for local testing in headless mode.
 *
 * IMPORTANT: The @playwright/mcp package must be installed locally.
 * Using npx causes timeouts during MCP server startup.
 */

/**
 * MCP Server configuration for Playwright (headless mode)
 *
 * Uses locally installed @playwright/mcp package with --headless flag
 * to run browser automation without visible window.
 */
export const PLAYWRIGHT_MCP_CONFIG = {
    playwright: {
        command: 'node',
        args: ['./node_modules/@playwright/mcp/cli.js', '--headless'],
    },
};

/**
 * Playwright MCP tools (wildcard to allow all)
 *
 * Available tools include:
 * - browser_navigate: Navigate to URLs
 * - browser_snapshot: Capture page DOM/accessibility tree
 * - browser_click: Click elements
 * - browser_type: Type text into inputs
 * - browser_wait_for: Wait for elements/conditions
 * - browser_close: Close browser and cleanup
 */
export const PLAYWRIGHT_TOOLS = ['mcp__playwright__*'];
