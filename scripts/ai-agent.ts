/**
 * AI Agent Abstraction
 * 
 * Provides a simple API for AI-powered code analysis.
 * Currently uses cursor-agent CLI, but can be replaced with other agents.
 * 
 * All methods are designed to fail gracefully - they return null on any error
 * rather than throwing exceptions.
 */

import { exec, execSync } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ============================================================
// CONFIGURATION
// ============================================================
// Available models (cursor-agent --help for full list):
// - auto: Fastest, lets cursor choose the best model (~9s)
// - gemini-3-flash: Google's fastest (~28s due to overhead)
// - sonnet-4.5: Claude's latest
const DEFAULT_MODEL = 'auto';  // 'auto' is fastest for short prompts
const DEFAULT_TIMEOUT_MS = 15000;  // 15 seconds (auto model is faster)
// ============================================================

interface AgentOptions {
    timeoutMs?: number;
    maxLength?: number;
    model?: string;
}

// Cache the availability check
let agentAvailable: boolean | null = null;

/**
 * Check if cursor-agent CLI is available
 */
export function isAgentAvailable(): boolean {
    if (agentAvailable !== null) {
        return agentAvailable;
    }
    try {
        execSync('which cursor-agent', { stdio: 'pipe', timeout: 2000 });
        agentAvailable = true;
        return true;
    } catch {
        agentAvailable = false;
        return false;
    }
}

/**
 * Escape a string for use in shell commands
 */
function escapeShellArg(arg: string): string {
    // Replace single quotes with escaped version and wrap in single quotes
    return `'${arg.replace(/'/g, "'\\''")}'`;
}

/**
 * Run cursor-agent with a prompt and return the response.
 * Returns null if agent is unavailable, times out, or crashes.
 * Uses async exec for true parallel execution with Promise.all.
 */
export async function askAgent(
    prompt: string,
    options: AgentOptions = {}
): Promise<string | null> {
    const {
        timeoutMs = DEFAULT_TIMEOUT_MS,
        maxLength = 200,
        model = DEFAULT_MODEL
    } = options;

    try {
        // Check if agent exists first
        if (!isAgentAvailable()) {
            return null;
        }

        // Build command with properly escaped prompt
        const cmd = `cursor-agent -p --model ${model} --output-format text ${escapeShellArg(prompt)}`;

        // Use async exec for true parallel execution
        const { stdout } = await execAsync(cmd, {
            encoding: 'utf-8',
            timeout: timeoutMs,
            maxBuffer: 1024 * 1024, // 1MB buffer
        });

        if (stdout && stdout.trim()) {
            let result = stdout.trim();
            if (result.length > maxLength) {
                result = result.slice(0, maxLength - 3) + '...';
            }
            return result;
        }

        return null;
    } catch {
        // Silently fail - agent might have timed out or crashed
        return null;
    }
}

/**
 * Generate a short description of changes in a diff.
 * Returns null if unable to generate description.
 */
export async function describeChanges(
    diff: string,
    context?: string
): Promise<string | null> {
    if (!diff.trim()) {
        return null;
    }

    // Truncate diff to keep prompt small and fast
    const maxDiffLength = 1000;
    const truncatedDiff = diff.length > maxDiffLength
        ? diff.slice(0, maxDiffLength) + '\n...(truncated)'
        : diff;

    // Keep prompt minimal for speed
    const prompt = `What does this code change do? Answer in 1 short sentence (max 12 words).
${truncatedDiff}`;

    return askAgent(prompt, { timeoutMs: 30000, maxLength: 150 });
}

/**
 * Generate descriptions for both sides of a conflict.
 */
export async function describeConflict(
    templateDiff: string,
    localDiff: string,
    filePath: string
): Promise<{ template: string | null; local: string | null }> {
    // Run both in parallel for speed
    const [templateDesc, localDesc] = await Promise.all([
        describeChanges(templateDiff, `Template changes to ${filePath}`),
        describeChanges(localDiff, `Local changes to ${filePath}`),
    ]);

    return {
        template: templateDesc,
        local: localDesc,
    };
}
