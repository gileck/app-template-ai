/**
 * Agent Library Factory
 *
 * Provides factory function for getting agent library adapters
 * based on configuration and workflow.
 */

import type { AgentLibraryAdapter, WorkflowName, AgentRunOptions, AgentRunResult } from './types';
import { getLibraryForWorkflow } from './config';
import { getCurrentLogContext, logError } from './logging';

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
 * @param options - Agent run options
 * @returns Agent run result
 */
export async function runAgent(options: AgentRunOptions): Promise<AgentRunResult> {
    const library = await getAgentLibrary(options.workflow);
    return library.run(options);
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
