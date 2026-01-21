/**
 * Agent Library Factory
 *
 * Provides factory function for getting agent library adapters
 * based on configuration and workflow.
 */

import type { AgentLibraryAdapter, WorkflowName, AgentRunOptions, AgentRunResult } from './types';
import { getLibraryForWorkflow } from './config';

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
 * Singleton adapter instances
 */
const adapterInstances = new Map<string, AgentLibraryAdapter>();

/**
 * Register an adapter constructor
 */
export function registerAdapter(name: string, constructor: AdapterConstructor): void {
    adapterRegistry.set(name, constructor);
}

/**
 * Get or create an adapter instance
 */
async function getAdapterInstance(libraryName: string): Promise<AgentLibraryAdapter> {
    // Check if already instantiated
    if (adapterInstances.has(libraryName)) {
        return adapterInstances.get(libraryName)!;
    }

    // Get constructor from registry
    const Constructor = adapterRegistry.get(libraryName);
    if (!Constructor) {
        // Try to load adapter dynamically
        try {
            const adapterModule = await import(`./adapters/${libraryName}`);
            const adapter = adapterModule.default as AgentLibraryAdapter;

            // Initialize if needed
            if (!adapter.isInitialized()) {
                await adapter.init();
            }

            adapterInstances.set(libraryName, adapter);
            return adapter;
        } catch {
            throw new Error(
                `Unknown agent library: ${libraryName}. ` +
                `Available: ${Array.from(adapterRegistry.keys()).join(', ')}`
            );
        }
    }

    // Create new instance
    const adapter = new Constructor();

    // Initialize if needed
    if (!adapter.isInitialized()) {
        await adapter.init();
    }

    adapterInstances.set(libraryName, adapter);
    return adapter;
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
} from './parsing';
