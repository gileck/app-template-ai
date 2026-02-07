/**
 * Agent Decision Utilities
 *
 * Utilities for parsing decision comments, validating tokens, and routing.
 */

import crypto from 'crypto';
import type {
    DecisionOption,
    MetadataFieldConfig,
    DestinationOption,
    ParsedDecision,
    DecisionSelection,
} from './types';
import type { ProjectManagementAdapter } from '@/server/project-management';
import { STATUSES, REVIEW_STATUSES } from '@/server/project-management/config';

// ============================================================
// TOKEN UTILITIES
// ============================================================

/**
 * Generate a security token for a decision page.
 * Uses HMAC-SHA256 with a secret key, returns first 8 chars.
 */
export function generateDecisionToken(issueNumber: number): string {
    const secret = process.env.CLARIFICATION_SECRET || 'default-secret-change-me';
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(`decision:${issueNumber}`);
    return hmac.digest('hex').substring(0, 8);
}

/**
 * Validate a decision token.
 */
export function validateDecisionToken(issueNumber: number, token: string): boolean {
    const expected = generateDecisionToken(issueNumber);
    return token === expected;
}

// ============================================================
// ITEM VERIFICATION
// ============================================================

/**
 * Find a project item by issue number and verify it's in a state
 * that has Waiting for Review (any status that uses agent decisions).
 */
export async function findDecisionItem(
    adapter: ProjectManagementAdapter,
    issueNumber: number
): Promise<{ valid: boolean; error?: string; itemId?: string; status?: string }> {
    const items = await adapter.listItems({});
    const item = items.find(
        (i) => i.content?.type === 'Issue' && i.content?.number === issueNumber
    );

    if (!item) {
        return { valid: false, error: `Issue #${issueNumber} not found in project` };
    }

    if (item.reviewStatus !== REVIEW_STATUSES.waitingForReview) {
        return {
            valid: false,
            error: `Issue is not waiting for review (current: ${item.reviewStatus || 'empty'})`,
        };
    }

    return { valid: true, itemId: item.id, status: item.status ?? undefined };
}

// ============================================================
// DECISION COMMENT PARSING
// ============================================================

const DECISION_MARKER_PREFIX = '<!-- AGENT_DECISION_V1:';

/**
 * Check if a comment is an agent decision comment.
 */
export function isDecisionComment(body: string): boolean {
    return body.includes(DECISION_MARKER_PREFIX);
}

/**
 * Extract the agent ID from a decision comment.
 */
function extractAgentId(body: string): string | null {
    const match = body.match(/<!-- AGENT_DECISION_V1:(\S+?) -->/);
    return match?.[1] || null;
}

/**
 * Extract DECISION_META JSON from a comment body.
 */
function extractDecisionMeta(body: string): {
    type: string;
    metadataSchema: MetadataFieldConfig[];
    customDestinationOptions?: DestinationOption[];
} | null {
    const match = body.match(/<!-- DECISION_META:(.*?) -->/);
    if (!match?.[1]) return null;

    try {
        return JSON.parse(match[1]);
    } catch {
        return null;
    }
}

/**
 * Extract the context section from a decision comment.
 * Context is everything between "## Decision Context" and "### Options".
 */
function extractContext(content: string): string {
    const contextMatch = content.match(/## Decision Context\s*\n([\s\S]*?)(?=### Options|$)/);
    return contextMatch?.[1]?.trim() || '';
}

/**
 * Parse decision options from comment content.
 */
function parseOptions(content: string, metadataSchema: MetadataFieldConfig[]): DecisionOption[] {
    const options: DecisionOption[] = [];

    // Pattern: "#### opt1: Title" or "#### opt1: Title ⭐ **Recommended**"
    const optionRegex = /####\s+(opt\d+):\s+(.+?)(\s+⭐\s+\*\*Recommended\*\*)?\s*\n([\s\S]*?)(?=####\s+opt\d+:|###\s+|$)/g;

    let match;
    while ((match = optionRegex.exec(content)) !== null) {
        const id = match[1];
        const title = match[2].trim();
        const isRecommended = !!match[3];
        const optionContent = match[4].trim();

        // Parse metadata fields based on schema
        const metadata: Record<string, string | string[]> = {};

        for (const field of metadataSchema) {
            const fieldRegex = new RegExp(`\\*\\*${escapeRegex(field.label)}:\\*\\*\\s*([^\\n]+)`);
            const fieldMatch = optionContent.match(fieldRegex);
            if (fieldMatch) {
                const rawValue = fieldMatch[1].trim();
                if (field.type === 'file-list') {
                    // Parse comma-separated file list, strip backticks
                    if (rawValue !== 'TBD' && rawValue !== '') {
                        metadata[field.key] = rawValue.split(',').map(f => f.trim().replace(/`/g, ''));
                    } else {
                        metadata[field.key] = [];
                    }
                } else {
                    metadata[field.key] = rawValue;
                }
            }
        }

        // Extract description (everything not in parsed metadata fields)
        let description = optionContent;
        for (const field of metadataSchema) {
            description = description.replace(
                new RegExp(`- \\*\\*${escapeRegex(field.label)}:\\*\\*[^\\n]+\\n?`, 'g'),
                ''
            );
        }
        description = description.trim();

        options.push({
            id,
            title,
            description,
            isRecommended,
            metadata,
        });
    }

    return options;
}

/**
 * Parse a full decision from a comment body.
 */
export function parseDecision(
    body: string,
    issueNumber: number,
    issueTitle: string
): ParsedDecision | null {
    if (!isDecisionComment(body)) {
        return null;
    }

    const agentId = extractAgentId(body) || 'unknown';
    const meta = extractDecisionMeta(body);
    if (!meta) {
        return null;
    }

    // Remove markers and agent prefix for content parsing
    let content = body
        .replace(/<!-- AGENT_DECISION_V1:\S+? -->\n?/, '')
        .replace(/<!-- DECISION_META:.*? -->\n?/, '')
        .trim();

    // Remove agent prefix if present (e.g., "🔍 **[Bug Investigator Agent]**\n\n")
    content = content.replace(/^[^\n]*\*\*\[.*?Agent\]\*\*\s*\n+/, '');

    const context = extractContext(content);
    const options = parseOptions(content, meta.metadataSchema);

    if (options.length === 0) {
        return null;
    }

    return {
        issueNumber,
        issueTitle,
        decisionType: meta.type,
        agentId,
        context,
        options,
        metadataSchema: meta.metadataSchema,
        customDestinationOptions: meta.customDestinationOptions,
    };
}

// ============================================================
// DECISION COMMENT FORMATTING
// ============================================================

/**
 * Format a decision comment for posting to GitHub.
 * Produces both machine-readable markers and human-readable markdown.
 */
export function formatDecisionComment(
    agentId: string,
    decisionType: string,
    context: string,
    options: DecisionOption[],
    metadataSchema: MetadataFieldConfig[],
    customDestinationOptions?: DestinationOption[]
): string {
    const metaJson = JSON.stringify({
        type: decisionType,
        metadataSchema,
        ...(customDestinationOptions ? { customDestinationOptions } : {}),
    });

    let comment = `<!-- AGENT_DECISION_V1:${agentId} -->
<!-- DECISION_META:${metaJson} -->

## Decision Context

${context}

### Options

`;

    for (const option of options) {
        const recommendedBadge = option.isRecommended ? ' ⭐ **Recommended**' : '';
        comment += `#### ${option.id}: ${option.title}${recommendedBadge}\n\n`;

        // Add metadata fields in schema order
        for (const field of metadataSchema) {
            const value = option.metadata[field.key];
            if (value !== undefined) {
                if (Array.isArray(value)) {
                    const formatted = value.length > 0 ? value.map(v => `\`${v}\``).join(', ') : 'TBD';
                    comment += `- **${field.label}:** ${formatted}\n`;
                } else {
                    comment += `- **${field.label}:** ${value}\n`;
                }
            }
        }
        comment += '\n';

        if (option.description) {
            comment += `${option.description}\n\n`;
        }
    }

    comment += `---
_Please choose an option in the Telegram notification, or add a comment with feedback._`;

    return comment;
}

/**
 * Format a selection comment posted after an admin picks an option.
 */
export function formatDecisionSelectionComment(
    selection: DecisionSelection,
    options: DecisionOption[],
    routedTo: string,
    routedToLabel: string
): string {
    let comment = `## ✅ Decision Made\n\n`;

    if (selection.selectedOptionId === 'custom') {
        comment += `**Selected:** Custom Solution
**Routed to:** ${routedToLabel}

**Custom Solution:**
${selection.customSolution}
`;
    } else {
        const selectedOption = options.find(o => o.id === selection.selectedOptionId);
        if (selectedOption) {
            comment += `**Selected:** ${selectedOption.id}: ${selectedOption.title}
**Routed to:** ${routedToLabel}
`;
        }
    }

    if (selection.notes) {
        comment += `
**Additional Notes:**
${selection.notes}
`;
    }

    comment += `
---
_The item will now proceed to the ${routedToLabel} phase._`;

    return comment;
}

// ============================================================
// ROUTING CONFIGURATION
// ============================================================

interface RoutingRule {
    /** Map of destination values to { status, label } */
    destinations: Record<string, { status: string; label: string }>;
    /** Default destination if option doesn't specify one */
    defaultDestination: string;
    /** Metadata key that determines destination (e.g. "destination") */
    destinationKey: string;
}

/**
 * Routing configuration per decision type.
 * Maps decisionType -> routing rules.
 */
export const DECISION_ROUTING_CONFIG: Record<string, RoutingRule> = {
    'bug-fix': {
        destinationKey: 'destination',
        defaultDestination: 'tech-design',
        destinations: {
            'implement': { status: STATUSES.implementation, label: 'Implementation' },
            'Direct Implementation': { status: STATUSES.implementation, label: 'Implementation' },
            'tech-design': { status: STATUSES.techDesign, label: 'Technical Design' },
            'Technical Design': { status: STATUSES.techDesign, label: 'Technical Design' },
        },
    },
    'tech-design': {
        destinationKey: 'destination',
        defaultDestination: 'implement',
        destinations: {
            'implement': { status: STATUSES.implementation, label: 'Implementation' },
        },
    },
    'implementation': {
        destinationKey: 'destination',
        defaultDestination: 'implement',
        destinations: {
            'implement': { status: STATUSES.implementation, label: 'Implementation' },
        },
    },
};

/**
 * Determine routing for a decision selection.
 */
export function resolveRouting(
    decisionType: string,
    selection: DecisionSelection,
    options: DecisionOption[]
): { status: string; label: string; destinationValue: string } | null {
    const config = DECISION_ROUTING_CONFIG[decisionType];
    if (!config) {
        return null;
    }

    let destinationValue: string;

    if (selection.selectedOptionId === 'custom') {
        destinationValue = selection.customDestination || config.defaultDestination;
    } else {
        const selectedOption = options.find(o => o.id === selection.selectedOptionId);
        if (!selectedOption) {
            return null;
        }
        const rawDest = selectedOption.metadata[config.destinationKey];
        destinationValue = (typeof rawDest === 'string' ? rawDest : '') || config.defaultDestination;
    }

    const dest = config.destinations[destinationValue];
    if (!dest) {
        // Try the default
        const defaultDest = config.destinations[config.defaultDestination];
        if (!defaultDest) return null;
        return { ...defaultDest, destinationValue: config.defaultDestination };
    }

    return { ...dest, destinationValue };
}

// ============================================================
// HELPERS
// ============================================================

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
