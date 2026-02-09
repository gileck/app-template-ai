/**
 * Mock runAgent — returns canned structured output per workflow type.
 * Tracks all calls for test assertions.
 */

import type { AgentRunOptions, AgentRunResult, WorkflowName } from '@/agents/lib/types';

export const agentCalls: AgentRunOptions[] = [];

const CANNED_OUTPUTS: Record<string, unknown> = {
    'product-dev': {
        document: '# Product Development Document\n\nThis is the product development document for the feature.',
        comment: 'Overview: 1. Feature analyzed 2. Requirements documented',
    },
    'product-design': {
        design: '# Product Design\n\nThis is the product design for the feature.',
        comment: 'Overview: 1. UX flows designed 2. UI mockups created',
        needsClarification: false,
    },
    'tech-design': {
        design: '# Technical Design\n\nThis is the technical design for the feature.\n\n## Implementation Plan\n\n1. Create new module\n2. Add tests',
        comment: 'Plan: 1. Architecture defined 2. Implementation steps listed',
        needsClarification: false,
        phases: [
            { name: 'Phase 1', description: 'Core implementation', files: ['src/core.ts'], estimatedSize: 'S' },
        ],
    },
    'implementation': {
        prSummary: '## Changes\n\n- Added new feature module\n- Updated existing tests',
        comment: 'What I did: 1. Implemented the feature 2. Added tests',
    },
    'bug-investigation': {
        rootCauseFound: true,
        confidence: 'high',
        rootCauseAnalysis: 'The bug is caused by a null reference in the login handler.',
        fixOptions: [
            {
                id: 'opt1',
                title: 'Add null check to login handler',
                description: 'Add a simple null check before accessing user properties.',
                destination: 'implement',
                complexity: 'S',
                filesAffected: ['src/auth/login.ts'],
                isRecommended: true,
            },
        ],
        filesExamined: ['src/auth/login.ts', 'src/auth/types.ts'],
        summary: 'Null reference in login handler — simple fix available.',
        autoSubmit: true,
    },
    'pr-review': {
        decision: 'approved',
        summary: 'Code looks good. All changes are well-structured.',
        reviewText: '## Review\n\nAll changes look correct and follow project conventions.',
    },
};

export function mockRunAgent(options: AgentRunOptions): Promise<AgentRunResult> {
    agentCalls.push(options);

    const workflow = options.workflow as WorkflowName | undefined;
    const structuredOutput = workflow ? CANNED_OUTPUTS[workflow] : undefined;
    const content = structuredOutput ? JSON.stringify(structuredOutput) : 'Generated content';

    return Promise.resolve({
        success: true,
        content,
        filesExamined: [],
        usage: {
            inputTokens: 1000,
            outputTokens: 500,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
            totalCostUSD: 0.01,
        },
        durationSeconds: 5,
        structuredOutput,
    });
}

export function resetAgentCalls(): void {
    agentCalls.length = 0;
}
