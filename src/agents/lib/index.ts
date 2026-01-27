/**
 * Agent Library Factory
 *
 * Provides factory function for getting agent library adapters
 * based on configuration and workflow.
 */

import type { AgentLibraryAdapter, WorkflowName, AgentRunOptions, AgentRunResult } from './types';
import { getLibraryForWorkflow } from './config';
import { getCurrentLogContext, logError, logInfo } from './logging';

// Import adapters directly
import claudeCodeSDKAdapter from './adapters/claude-code-sdk';
import geminiAdapter from './adapters/gemini';
import cursorAdapter from './adapters/cursor';
import openaiCodexAdapter from './adapters/openai-codex';

// Fallback library when primary library fails to initialize
const FALLBACK_LIBRARY = 'claude-code-sdk';

// Forward declarations for adapters (will be imported dynamically)
type AdapterConstructor = new () => AgentLibraryAdapter;

// ============================================================
// ADAPTER REGISTRY
// ============================================================

/**
 * Registry of available adapter constructors
 */
const adapterRegistry = new Map<string, AdapterConstructor>();

/**
 * Singleton adapter instances (pre-populated with imported adapters)
 */
const adapterInstances = new Map<string, AgentLibraryAdapter>([
    [claudeCodeSDKAdapter.name, claudeCodeSDKAdapter],
    [geminiAdapter.name, geminiAdapter],
    [cursorAdapter.name, cursorAdapter],
    [openaiCodexAdapter.name, openaiCodexAdapter],
]);

/**
 * Register an adapter constructor
 */
export function registerAdapter(name: string, constructor: AdapterConstructor): void {
    adapterRegistry.set(name, constructor);
}

/**
 * Try to initialize an adapter, returning success status
 */
async function tryInitAdapter(adapter: AgentLibraryAdapter): Promise<{ success: boolean; error?: string; wasAlreadyInitialized?: boolean }> {
    if (adapter.isInitialized()) {
        return { success: true, wasAlreadyInitialized: true };
    }

    try {
        await adapter.init();
        return { success: true, wasAlreadyInitialized: false };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { success: false, error: errorMessage };
    }
}

/**
 * Log successful adapter initialization
 */
function logAdapterInitSuccess(adapter: AgentLibraryAdapter, wasAlreadyInitialized: boolean): void {
    if (wasAlreadyInitialized) {
        // Don't log if already initialized (avoid duplicate logs)
        return;
    }
    console.log(`  ✓ Initialized agent library: ${adapter.name} (model: ${adapter.model})`);
}

/**
 * Log adapter initialization failure and fallback
 */
function logAdapterFallback(
    originalLibrary: string,
    fallbackLibrary: string,
    error: string
): void {
    const logCtx = getCurrentLogContext();

    // Console warning (always shown)
    console.warn(`\n  ⚠️  Failed to initialize ${originalLibrary}: ${error}`);
    console.warn(`  ⚠️  Falling back to ${fallbackLibrary}\n`);

    // Log to issue log if context is available
    if (logCtx) {
        logError(logCtx, `Library init failed: ${originalLibrary} - ${error}. Falling back to ${fallbackLibrary}`, false);
    }
}

/**
 * Get or create an adapter instance with fallback support
 */
async function getAdapterInstance(libraryName: string): Promise<AgentLibraryAdapter> {
    // Check if adapter exists in pre-populated instances
    if (adapterInstances.has(libraryName)) {
        const adapter = adapterInstances.get(libraryName)!;

        // Try to initialize
        const initResult = await tryInitAdapter(adapter);

        if (initResult.success) {
            logAdapterInitSuccess(adapter, initResult.wasAlreadyInitialized ?? false);
            return adapter;
        }

        // Init failed - try fallback if this isn't already the fallback
        if (libraryName !== FALLBACK_LIBRARY) {
            logAdapterFallback(libraryName, FALLBACK_LIBRARY, initResult.error!);
            return getAdapterInstance(FALLBACK_LIBRARY);
        }

        // Fallback also failed - this is fatal
        throw new Error(`Failed to initialize fallback library ${FALLBACK_LIBRARY}: ${initResult.error}`);
    }

    // Check if constructor exists in registry
    const Constructor = adapterRegistry.get(libraryName);
    if (Constructor) {
        // Create new instance
        const adapter = new Constructor();

        // Try to initialize
        const initResult = await tryInitAdapter(adapter);

        if (initResult.success) {
            logAdapterInitSuccess(adapter, initResult.wasAlreadyInitialized ?? false);
            adapterInstances.set(libraryName, adapter);
            return adapter;
        }

        // Init failed - try fallback if this isn't already the fallback
        if (libraryName !== FALLBACK_LIBRARY) {
            logAdapterFallback(libraryName, FALLBACK_LIBRARY, initResult.error!);
            return getAdapterInstance(FALLBACK_LIBRARY);
        }

        // Fallback also failed - this is fatal
        throw new Error(`Failed to initialize fallback library ${FALLBACK_LIBRARY}: ${initResult.error}`);
    }

    // Adapter not found
    const available = Array.from(adapterInstances.keys()).concat(Array.from(adapterRegistry.keys()));
    throw new Error(
        `Unknown agent library: ${libraryName}. ` +
        `Available: ${available.join(', ')}`
    );
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Get the agent library adapter for a specific workflow
 *
 * @param workflow - Workflow name (optional)
 * @returns Agent library adapter
 */
export async function getAgentLibrary(workflow?: WorkflowName): Promise<AgentLibraryAdapter> {
    const libraryName = getLibraryForWorkflow(workflow);
    return getAdapterInstance(libraryName);
}

/**
 * Run an agent using the appropriate library for the workflow
 *
 * This is the main entry point for running agents with the abstraction layer.
 *
 * For implementation workflows with libraries that support plan mode (claude-code-sdk, cursor),
 * this function internally runs a Plan subagent before the main implementation to create a
 * detailed implementation plan. This is fully encapsulated - callers don't need to know
 * about the two-step process.
 *
 * @param options - Agent run options
 * @returns Agent run result
 */
export async function runAgent(options: AgentRunOptions): Promise<AgentRunResult> {
    const library = await getAgentLibrary(options.workflow);

    // For implementation workflow with libraries that support plan mode, run Plan subagent first
    // This creates a detailed implementation plan before the main implementation
    const supportsPlanMode = library.capabilities.planMode ||
        library.name === 'claude-code-sdk'; // claude-code-sdk has implicit plan support via read-only mode

    if (options.workflow === 'implementation' && supportsPlanMode && options.allowWrite) {
        const planResult = await runImplementationPlanSubagent(library, options);
        if (planResult.plan) {
            // Augment the prompt with the detailed implementation plan
            const enhancedPrompt = `${options.prompt}

---

## Detailed Implementation Plan (from codebase exploration)

The following plan was created by exploring the codebase. Follow these steps to implement the feature:

${planResult.plan}

---

Follow the plan above while implementing. Adjust as needed based on actual code you encounter.`;
            return library.run({ ...options, prompt: enhancedPrompt });
        }
        // If plan generation failed, proceed without it
        console.log('  ⚠️ Plan subagent did not generate a plan, proceeding without it');
    }

    return library.run(options);
}

/**
 * Run a Plan subagent to create a detailed implementation plan
 *
 * This is an internal function used by runAgent for implementation workflows.
 * It uses the library's plan mode if supported (cursor --mode=plan), or falls
 * back to read-only tools (claude-code-sdk) to explore the codebase and
 * generate a step-by-step implementation plan.
 *
 * @param library - The agent library adapter
 * @param options - Original agent run options
 * @returns Plan result with the generated plan
 */
async function runImplementationPlanSubagent(
    library: AgentLibraryAdapter,
    options: AgentRunOptions
): Promise<{ plan: string | null; error?: string }> {
    const usesPlanMode = library.capabilities.planMode === true;
    const planMechanism = usesPlanMode ? '--mode=plan' : 'read-only tools';

    console.log(`  📋 Running Plan subagent (${library.name}, ${planMechanism})...`);

    // Log to issue log if context is available
    const logCtx = getCurrentLogContext();
    if (logCtx) {
        logInfo(logCtx, `Plan Subagent started (library: ${library.name}, mechanism: ${planMechanism})`, '📋');
    }

    const planPrompt = `You are a technical planning agent. Your task is to create a detailed, step-by-step implementation plan.

## Context

You will be implementing a feature or fixing a bug. The following information describes what needs to be done:

${options.prompt}

---

## Your Task

1. **Explore the codebase** to understand:
   - Existing patterns and conventions
   - Files that will need to be created or modified
   - Dependencies and imports needed
   - Test patterns if tests are required

2. **Create a detailed implementation plan** with numbered steps:
   - Each step should be specific and actionable
   - Include exact file paths where changes are needed
   - Describe what code to add/modify at each location
   - Order steps so dependencies are created before they're used
   - Include a final step to run yarn checks

## Output Format

Output ONLY the implementation plan as a numbered list. Do not include any other text.

Example:
1. Create types file at \`src/apis/feature/types.ts\` with FeatureParams and FeatureResponse interfaces
2. Create handler at \`src/apis/feature/handlers/get.ts\` that queries the database
3. Add API route at \`src/pages/api/process/feature_get.ts\` connecting to the handler
4. Create React hook at \`src/client/features/feature/useFeature.ts\` that calls the API
5. Export hook from \`src/client/features/feature/index.ts\`
6. Add component at \`src/client/routes/Feature/index.tsx\` that uses the hook
7. Add route in \`src/client/routes/index.ts\`
8. Run yarn checks to verify no errors

Now explore the codebase and create the implementation plan.`;

    try {
        // Use planMode if library supports it (cursor), otherwise use read-only tools (claude-code-sdk)
        const result = await library.run({
            prompt: planPrompt,
            // For libraries with plan mode (cursor): use planMode flag
            // For libraries without (claude-code-sdk): use read-only tools
            ...(usesPlanMode
                ? { planMode: true }
                : { allowedTools: ['Read', 'Glob', 'Grep', 'WebFetch'] }
            ),
            allowWrite: false,
            stream: false,
            verbose: false,
            timeout: 120, // 2 minutes for planning
            progressLabel: 'Creating implementation plan',
        });

        if (result.success && result.content) {
            console.log('  ✅ Plan subagent completed');
            if (logCtx) {
                logInfo(logCtx, `Plan Subagent completed successfully (${result.durationSeconds}s)`, '✅');
            }
            return { plan: result.content };
        }

        const errorMsg = result.error || 'No plan generated';
        if (logCtx) {
            logInfo(logCtx, `Plan Subagent completed without plan: ${errorMsg}`, '⚠️');
        }
        return { plan: null, error: errorMsg };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn(`  ⚠️ Plan subagent failed: ${errorMsg}`);
        if (logCtx) {
            logError(logCtx, `Plan Subagent failed: ${errorMsg}`, false);
        }
        return { plan: null, error: errorMsg };
    }
}

/**
 * Get the model name for a specific workflow
 *
 * @param workflow - Workflow name (optional)
 * @returns Model name used by the library for this workflow
 */
export async function getModelForWorkflow(workflow?: WorkflowName): Promise<string> {
    const library = await getAgentLibrary(workflow);
    return library.model;
}

/**
 * Dispose all adapter instances
 */
export async function disposeAllAdapters(): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const adapter of adapterInstances.values()) {
        promises.push(adapter.dispose());
    }

    await Promise.all(promises);
    adapterInstances.clear();
}

// ============================================================
// RE-EXPORTS
// ============================================================

// Re-export types
export type {
    AgentLibraryAdapter,
    AgentLibraryCapabilities,
    AgentLibraryConfig,
    AgentRunOptions,
    AgentRunResult,
    WorkflowName,
} from './types';

// Re-export configuration functions
export {
    getAgentLibraryConfig,
    getLibraryForWorkflow,
    loadAgentLibraryConfig,
    clearConfigCache,
} from './config';

// Re-export parsing functions
export {
    extractMarkdown,
    extractJSON,
    extractReview,
    parseReviewDecision,
    extractOriginalDescription,
    extractProductDesign,
    extractTechDesign,
    buildUpdatedIssueBody,
    DESIGN_MARKERS,
    // Phase extraction for multi-PR workflow (fallback - prefer phases.ts functions)
    extractPhasesFromTechDesign,
    parsePhaseString,
    isLargeFeature,
    type ParsedPhase,
} from './parsing';

// Re-export phase serialization/deserialization (primary method for multi-PR workflow)
export {
    formatPhasesToComment,
    parsePhasesFromComment,
    parsePhasesFromMarkdown,
    hasPhaseComment,
    getPhaseCommentMarker,
} from './phases';

// Re-export commit message utilities (for PR merge flow)
export {
    generateCommitMessage,
    formatCommitMessageComment,
    parseCommitMessageComment,
    type PRInfo,
    type CommitMessageResult,
    type PhaseInfo,
} from './commitMessage';

// Re-export artifact comment utilities (for design document workflow)
export {
    ARTIFACT_COMMENT_MARKER,
    type DesignArtifact,
    type ArtifactComment,
    type ImplementationStatus,
    type ImplementationArtifact,
    type ImplementationPhaseArtifact,
    getDesignDocPath,
    getDesignDocLink,
    generateDesignBranchName,
    findArtifactComment,
    hasArtifactComment,
    parseArtifactComment,
    getProductDesignPath,
    getTechDesignPath,
    formatArtifactComment,
    saveArtifactComment,
    updateDesignArtifact,
    ensureArtifactComment,
    updateImplementationArtifact,
    updateImplementationPhaseArtifact,
    initializeImplementationPhases,
} from './artifacts';

// Re-export design file utilities
export {
    getDesignDocFullPath,
    getDesignDocRelativePath,
    getIssueDesignDir,
    writeDesignDoc,
    readDesignDoc,
    designDocExists,
    deleteDesignDoc,
    deleteIssueDesignDir,
} from './design-files';
