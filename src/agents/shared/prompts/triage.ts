/**
 * Triage Agent Prompts
 *
 * Builds prompts for the triage agent that classifies workflow items
 * by domain and optionally suggests priority/size/complexity.
 */

import { SEED_DOMAINS } from '@/server/template/project-management/domains';

interface TriageItemContext {
    title: string;
    description?: string;
    issueBody?: string;
    type: string;
    hasPriority: boolean;
    hasSize: boolean;
    hasComplexity: boolean;
    existingDomains?: string[];
}

export function buildTriagePrompt(item: TriageItemContext): string {
    const seedList = SEED_DOMAINS.map(d => `- **${d.value}**: ${d.description}`).join('\n');

    const existing = item.existingDomains ?? [];
    const domainSection = existing.length > 0
        ? `## Existing Domains (prefer reusing these)\n\n${existing.map(d => `- ${d}`).join('\n')}\n\n## Seed Domain Suggestions\n\nIf none of the existing domains fit, consider these or create a new short lowercase label:\n\n${seedList}`
        : `## Domain Suggestions\n\nUse one of these if appropriate, or create a new short lowercase label:\n\n${seedList}`;

    const missingFields: string[] = [];
    if (!item.hasPriority) missingFields.push('priority (critical | high | medium | low)');
    if (!item.hasSize) missingFields.push('size (XS | S | M | L | XL)');
    if (!item.hasComplexity) missingFields.push('complexity (High | Medium | Low)');

    const missingFieldsInstruction = missingFields.length > 0
        ? `\n\nThe following fields are NOT yet set on this item. Please suggest values:\n${missingFields.map(f => `- ${f}`).join('\n')}`
        : '\n\nAll metadata fields (priority, size, complexity) are already set. Do NOT include them in your output.';

    return `You are a triage agent. Classify the following workflow item into a domain.

${domainSection}

## Item

- **Type:** ${item.type}
- **Title:** ${item.title}
${item.description ? `- **Description:** ${item.description}` : ''}
${item.issueBody ? `\n### Issue Body\n\n${item.issueBody}` : ''}
${missingFieldsInstruction}

## Instructions

1. Choose the single most appropriate domain. Strongly prefer reusing an existing domain if one fits.
2. Only create a new domain if none of the existing ones are appropriate. New domains should be short, lowercase, and descriptive (e.g., "testing", "docs", "notifications").
3. If metadata fields are missing, suggest reasonable values based on the item's scope.
4. Provide brief reasoning for your choices.

Return your response as structured JSON.`;
}
