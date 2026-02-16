/**
 * Triage Agent Prompts
 *
 * Builds prompts for the triage agent that classifies workflow items
 * by domain and optionally suggests priority/size/complexity.
 */

import { DOMAINS } from '@/server/template/project-management/domains';

interface TriageItemContext {
    title: string;
    description?: string;
    issueBody?: string;
    type: string;
    hasPriority: boolean;
    hasSize: boolean;
    hasComplexity: boolean;
}

export function buildTriagePrompt(item: TriageItemContext): string {
    const domainList = DOMAINS.map(d => `- **${d.value}**: ${d.description}`).join('\n');

    const missingFields: string[] = [];
    if (!item.hasPriority) missingFields.push('priority (critical | high | medium | low)');
    if (!item.hasSize) missingFields.push('size (XS | S | M | L | XL)');
    if (!item.hasComplexity) missingFields.push('complexity (High | Medium | Low)');

    const missingFieldsInstruction = missingFields.length > 0
        ? `\n\nThe following fields are NOT yet set on this item. Please suggest values:\n${missingFields.map(f => `- ${f}`).join('\n')}`
        : '\n\nAll metadata fields (priority, size, complexity) are already set. Do NOT include them in your output.';

    return `You are a triage agent. Classify the following workflow item into a domain.

## Valid Domains

${domainList}

## Item

- **Type:** ${item.type}
- **Title:** ${item.title}
${item.description ? `- **Description:** ${item.description}` : ''}
${item.issueBody ? `\n### Issue Body\n\n${item.issueBody}` : ''}
${missingFieldsInstruction}

## Instructions

1. Choose the single most appropriate domain for this item based on its title and description.
2. If metadata fields are missing, suggest reasonable values based on the item's scope.
3. Provide brief reasoning for your choices.

Return your response as structured JSON.`;
}
