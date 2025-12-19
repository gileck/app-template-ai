/**
 * AI Agent Abstraction
 * 
 * Provides a simple API for AI-powered code analysis.
 * Currently uses cursor-agent CLI, but can be replaced with other agents.
 * 
 * All methods are designed to fail gracefully - they return null on any error
 * rather than throwing exceptions.
 */

import { execSync, spawn } from 'child_process';

// ============================================================
// CONFIGURATION
// ============================================================
// Fast models for quick descriptions (updated Dec 2025):
// - gemini-3-flash: Google's fastest (released Dec 17, 2025)
// - gemini-2.5-flash: Previous generation
// - gpt-4o-mini: OpenAI's fast/cheap model
// - claude-3-5-haiku: Anthropic's fastest
const DEFAULT_MODEL = 'gemini-3-flash';
const DEFAULT_TIMEOUT_MS = 10000;  // 10 seconds
// ============================================================

interface AgentOptions {
    timeoutMs?: number;
    maxLength?: number;
    model?: string;
}

/**
 * Check if cursor-agent CLI is available
 */
export function isAgentAvailable(): boolean {
    try {
        execSync('which cursor-agent', { stdio: 'pipe', timeout: 2000 });
        return true;
    } catch {
        return false;
    }
}

/**
 * Run cursor-agent with a prompt and return the response.
 * Returns null if agent is unavailable, times out, or crashes.
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

    return new Promise((resolve) => {
        try {
            // Check if agent exists first
            if (!isAgentAvailable()) {
                resolve(null);
                return;
            }

            let output = '';
            let resolved = false;

            const proc = spawn('cursor-agent', [
                '-p', prompt,
                '--model', model,
                '--output-format', 'text'
            ], {
                stdio: ['pipe', 'pipe', 'pipe'],
                timeout: timeoutMs,
            });

            // Set timeout
            const timer = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    proc.kill('SIGTERM');
                    resolve(null);
                }
            }, timeoutMs);

            proc.stdout?.on('data', (data) => {
                output += data.toString();
            });

            proc.on('close', (code) => {
                clearTimeout(timer);
                if (!resolved) {
                    resolved = true;
                    if (code === 0 && output.trim()) {
                        // Truncate if too long
                        let result = output.trim();
                        if (result.length > maxLength) {
                            result = result.slice(0, maxLength - 3) + '...';
                        }
                        resolve(result);
                    } else {
                        resolve(null);
                    }
                }
            });

            proc.on('error', () => {
                clearTimeout(timer);
                if (!resolved) {
                    resolved = true;
                    resolve(null);
                }
            });
        } catch {
            resolve(null);
        }
    });
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

    // Truncate diff if too long to avoid overwhelming the agent
    const maxDiffLength = 2000;
    const truncatedDiff = diff.length > maxDiffLength
        ? diff.slice(0, maxDiffLength) + '\n... (truncated)'
        : diff;

    const prompt = `Describe in ONE short sentence (max 15 words) what this code change does. Be specific and technical. No fluff.
${context ? `Context: ${context}\n` : ''}
Diff:
${truncatedDiff}

One sentence description:`;

    return askAgent(prompt, { timeoutMs: 10000, maxLength: 150 });
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

