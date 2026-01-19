/**
 * Prompt Templates for Agent Scripts
 *
 * Contains prompt templates for:
 * - Product Design generation
 * - Technical Design generation
 * - Implementation
 * - Feedback handling (revisions)
 */

import type { ProjectItemContent } from '@/server/project-management';
import type { GitHubComment } from './types';

// ============================================================
// PRODUCT DESIGN PROMPTS
// ============================================================

/**
 * Build prompt for generating a new product design
 */
export function buildProductDesignPrompt(issue: ProjectItemContent, comments?: GitHubComment[]): string {
    const commentsSection = comments && comments.length > 0
        ? `\n## Comments on Issue\n\nThe following comments have been added to the issue. Consider them as additional context:\n\n${comments.map((c) => `**${c.author}** (${c.createdAt}):\n${c.body}`).join('\n\n---\n\n')}\n`
        : '';

    return `You are creating a Product Design document for a GitHub issue. Your task is to:
1. Understand the feature from the issue description
2. Explore the codebase to understand existing patterns and architecture
3. Create a Product Design document

IMPORTANT: You are in READ-ONLY mode. Do NOT make any changes to files. Only use Read, Glob, Grep, and WebFetch tools.

## Issue Details

**Title:** ${issue.title}
**Number:** #${issue.number || 'Draft'}
**Labels:** ${issue.labels?.join(', ') || 'None'}

**Description:**
${issue.body || 'No description provided'}
${commentsSection}
## Your Task

Create a Product Design document. The size of your output should match the complexity of the feature - simple features get simple designs, complex features get detailed designs.

**Required sections:**
1. **Size Estimate** - S (small, few hours) / M (medium, 1-2 days) / L (large, multiple days)
2. **Overview** - Brief summary of what this feature does and why it's needed
3. **UI/UX Design** - How the feature will look and behave
   - Describe the interface elements
   - User flow and interactions
   - Include error handling and loading states naturally within the flow
   - Consider mobile/responsive needs if relevant

**Optional sections (include only when relevant):**
- **User Stories** - Only for features where multiple user types or complex workflows need clarification
- **Edge Cases** - Only for features with non-obvious edge cases that need explicit design decisions

## Research Strategy

Before writing the design, explore the codebase:
1. Read \`src/client/routes/index.ts\` to understand the routing structure
2. If a page is mentioned, find and read that component
3. Look at similar existing features for patterns
4. Check relevant types in \`src/apis/\` if the feature needs API work

## Output Format

Your final output MUST be a Product Design document in markdown format, wrapped in a \`\`\`markdown code block.

Keep it concise. A small feature might only need a few paragraphs. A large feature needs more detail.

Example for a SMALL feature (S):

\`\`\`markdown
# Product Design: Add logout button

**Size: S**

## Overview
Add a logout button to the user menu dropdown. When clicked, clears the session and redirects to the login page.

## UI/UX Design
- Add "Logout" item at the bottom of the existing user dropdown menu
- Shows loading spinner while logging out
- On success: redirect to /login
- On error: show toast notification
\`\`\`

Example for a MEDIUM/LARGE feature:

\`\`\`markdown
# Product Design: [Feature Title]

**Size: M** (or L)

## Overview
[1-2 paragraph summary]

## User Stories (if needed)
- As a user, I want to...
- As an admin, I want to...

## UI/UX Design

### Layout
[Description of the interface]

### User Flow
1. User navigates to...
2. User clicks...
3. System shows loading state...
4. On success/error...

### Mobile Considerations
[Only if relevant]

## Edge Cases (if needed)
[Only non-obvious cases that need design decisions]
\`\`\`

Now explore the codebase and create the Product Design document.`;
}

/**
 * Build prompt for revising product design based on feedback
 */
export function buildProductDesignRevisionPrompt(
    issue: ProjectItemContent,
    existingDesign: string,
    feedbackComments: GitHubComment[]
): string {
    const feedbackSection = feedbackComments
        .map((c) => `**${c.author}** (${c.createdAt}):\n${c.body}`)
        .join('\n\n---\n\n');

    return `You are revising a Product Design document based on admin feedback.

IMPORTANT: You are in READ-ONLY mode. Do NOT make any changes to files. Only use Read, Glob, Grep, and WebFetch tools.

## Issue Details

**Title:** ${issue.title}
**Number:** #${issue.number || 'Draft'}

**Original Description:**
${issue.body || 'No description provided'}

## Existing Product Design

${existingDesign}

## Admin Feedback

The admin has requested changes. Please address ALL of the following feedback:

${feedbackSection}

## Your Task

1. Carefully read and understand all feedback comments
2. Research any areas mentioned in the feedback
3. Revise the Product Design to address ALL feedback points
4. Keep the output size proportional to the feature complexity

## Output Format

Your final output MUST be the COMPLETE revised Product Design document in markdown format, wrapped in a \`\`\`markdown code block.

Do NOT output just the changes - output the entire revised document. Keep it concise.

Now revise the Product Design based on the feedback.`;
}

// ============================================================
// TECHNICAL DESIGN PROMPTS
// ============================================================

/**
 * Build prompt for generating a new technical design
 */
export function buildTechDesignPrompt(issue: ProjectItemContent, productDesign: string | null, comments?: GitHubComment[]): string {
    const productDesignSection = productDesign
        ? `## Approved Product Design

${productDesign}`
        : `## Note
No product design phase for this item (internal/technical work). Base your technical design on the issue description.`;

    const commentsSection = comments && comments.length > 0
        ? `\n## Comments on Issue\n\nThe following comments have been added to the issue. Consider them as additional context:\n\n${comments.map((c) => `**${c.author}** (${c.createdAt}):\n${c.body}`).join('\n\n---\n\n')}\n`
        : '';

    return `You are creating a Technical Design document for a GitHub issue.${productDesign ? ' The Product Design has been approved, and now you need to define the technical implementation.' : ' This is internal/technical work that skipped the product design phase.'}

IMPORTANT: You are in READ-ONLY mode. Do NOT make any changes to files. Only use Read, Glob, Grep, and WebFetch tools.

## Issue Details

**Title:** ${issue.title}
**Number:** #${issue.number || 'Draft'}

**Original Description:**
${issue.body || 'No description provided'}
${commentsSection}
${productDesignSection}

## Your Task

Create a Technical Design document. The size of your output should match the complexity of the feature - simple features get simple designs, complex features get detailed designs.

**Required sections:**
1. **Size & Complexity** - Effort (S/M/L) and complexity (Low/Medium/High)
2. **Overview** - Brief technical approach (1-2 sentences for small features)
3. **Files to Create/Modify** - List of files with brief description of changes

**Optional sections (include only when relevant):**
- **Data Model** - Only if new collections or schema changes needed
- **API Changes** - Only if new endpoints or modifications needed
- **State Management** - Only if non-trivial state handling needed
- **Implementation Notes** - Only for complex logic that needs explanation

## Research Strategy

Explore the codebase:
1. Read existing similar features to understand patterns
2. Check \`src/apis/\` for API patterns
3. Check \`src/server/database/collections/\` for database patterns
4. Look at \`src/client/routes/\` for component patterns

## Output Format

Your final output MUST be a Technical Design document in markdown format, wrapped in a \`\`\`markdown code block.

Keep it concise. A small feature might only need a short list of files. A large feature needs more detail.

Example for a SMALL feature (S):

\`\`\`markdown
# Technical Design: Add logout button

**Size: S** | **Complexity: Low**

## Overview
Add logout menu item that calls existing auth API and redirects.

## Files to Modify
| File | Changes |
|------|---------|
| \`src/client/components/UserMenu.tsx\` | Add logout menu item with onClick handler |
| \`src/client/features/auth/hooks.ts\` | Add useLogout hook (calls auth/logout API) |
\`\`\`

Example for a MEDIUM/LARGE feature:

\`\`\`markdown
# Technical Design: [Feature Title]

**Size: M** | **Complexity: Medium**

## Overview
[Brief technical approach]

## Files to Create
| File | Purpose |
|------|---------|
| \`src/apis/feature-name/types.ts\` | Types |
| \`src/apis/feature-name/handlers/create.ts\` | Create handler |
| \`src/client/routes/FeatureName/index.tsx\` | Main component |

## Files to Modify
| File | Changes |
|------|---------|
| \`src/client/routes/index.ts\` | Add route |

## Data Model (if needed)
\`\`\`typescript
interface FeatureDocument {
  _id: ObjectId;
  // fields...
}
\`\`\`

## API Endpoints (if needed)
- \`feature-name/create\` - POST - Creates new feature item
- \`feature-name/list\` - GET - Lists user's items

## Implementation Notes (if needed)
[Only for complex logic]
\`\`\`

Now explore the codebase and create the Technical Design document.`;
}

/**
 * Build prompt for revising technical design based on feedback
 */
export function buildTechDesignRevisionPrompt(
    issue: ProjectItemContent,
    productDesign: string | null,
    existingTechDesign: string,
    feedbackComments: GitHubComment[]
): string {
    const feedbackSection = feedbackComments
        .map((c) => `**${c.author}** (${c.createdAt}):\n${c.body}`)
        .join('\n\n---\n\n');

    const productDesignSection = productDesign
        ? `## Approved Product Design

${productDesign}

`
        : '';

    return `You are revising a Technical Design document based on admin feedback.

IMPORTANT: You are in READ-ONLY mode. Do NOT make any changes to files. Only use Read, Glob, Grep, and WebFetch tools.

## Issue Details

**Title:** ${issue.title}
**Number:** #${issue.number || 'Draft'}

${productDesignSection}## Existing Technical Design

${existingTechDesign}

## Admin Feedback

The admin has requested changes. Please address ALL of the following feedback:

${feedbackSection}

## Your Task

1. Carefully read and understand all feedback comments
2. Research any areas mentioned in the feedback
3. Revise the Technical Design to address ALL feedback points
4. Keep the output size proportional to the feature complexity

## Output Format

Your final output MUST be the COMPLETE revised Technical Design document in markdown format, wrapped in a \`\`\`markdown code block.

Do NOT output just the changes - output the entire revised document. Keep it concise.

Now revise the Technical Design based on the feedback.`;
}

// ============================================================
// IMPLEMENTATION PROMPTS
// ============================================================

/**
 * Build prompt for implementing a feature
 */
export function buildImplementationPrompt(
    issue: ProjectItemContent,
    productDesign: string | null,
    techDesign: string | null,
    branchName: string,
    comments?: GitHubComment[]
): string {
    let designContext = '';
    let implementationSource = '';

    if (techDesign && productDesign) {
        designContext = `## Approved Product Design

${productDesign}

## Approved Technical Design

${techDesign}`;
        implementationSource = 'the Technical Design document';
    } else if (techDesign) {
        designContext = `## Approved Technical Design

${techDesign}

Note: No product design phase for this item (internal/technical work).`;
        implementationSource = 'the Technical Design document';
    } else if (productDesign) {
        designContext = `## Approved Product Design

${productDesign}

Note: No technical design phase for this item. Implement based on the product design.`;
        implementationSource = 'the Product Design document';
    } else {
        designContext = `Note: No design documents for this item (simple fix/change). Implement based on the issue description.`;
        implementationSource = 'the issue description';
    }

    const commentsSection = comments && comments.length > 0
        ? `\n## Comments on Issue\n\nThe following comments have been added to the issue. Consider them as additional context:\n\n${comments.map((c) => `**${c.author}** (${c.createdAt}):\n${c.body}`).join('\n\n---\n\n')}\n`
        : '';

    return `You are implementing a feature${techDesign || productDesign ? ' based on approved design documents' : ''}.

IMPORTANT: You are in WRITE mode. You CAN and SHOULD create and modify files to implement this feature.

## Issue Details

**Title:** ${issue.title}
**Number:** #${issue.number || 'Draft'}
**Branch:** ${branchName}

**Original Description:**
${issue.body || 'No description provided'}
${commentsSection}
${designContext}

## Your Task

Implement the feature as specified in ${implementationSource}:

1. Create all new files listed in "Files to Create"
2. Modify all files listed in "Files to Modify"
3. Follow the Implementation Order specified
4. Ensure code follows existing patterns in the codebase
5. Add necessary imports and exports
6. Do NOT write tests unless specifically requested

## Implementation Guidelines

- Follow the existing code patterns in the codebase
- Use TypeScript with proper types
- Follow the project's ESLint rules
- Keep components small and focused
- Use existing UI components from shadcn/ui
- Use semantic color tokens (bg-background, not bg-white)
- For state management, use React Query for server state and Zustand for client state

## Important Notes

- Read existing similar code before implementing
- Use the exact file paths specified in the Technical Design
- Ensure all imports are correct
- Do not add features or improvements beyond what's specified
- If something is unclear, make a reasonable assumption and note it

## Output

After implementing, provide a brief summary of:
1. Files created
2. Files modified
3. Any assumptions made
4. Any issues encountered

Begin implementing the feature now.`;
}

/**
 * Build prompt for addressing PR review feedback
 */
export function buildPRRevisionPrompt(
    issue: ProjectItemContent,
    productDesign: string | null,
    techDesign: string | null,
    feedbackComments: GitHubComment[],
    prReviewComments: Array<{ path?: string; line?: number; body: string; author: string }>
): string {
    const issueComments = feedbackComments
        .map((c) => `**${c.author}**:\n${c.body}`)
        .join('\n\n---\n\n');

    const reviewComments = prReviewComments
        .map((c) => {
            const location = c.path ? `\`${c.path}\`${c.line ? `:${c.line}` : ''}` : 'General';
            return `**${c.author}** on ${location}:\n${c.body}`;
        })
        .join('\n\n---\n\n');

    let contextSection = '## Context\n\n';
    if (productDesign) {
        contextSection += `### Product Design\n${productDesign}\n\n`;
    }
    if (techDesign) {
        contextSection += `### Technical Design\n${techDesign}\n\n`;
    }
    if (!productDesign && !techDesign) {
        contextSection += `*No design documents (simple fix/change)*\n\n`;
    }

    return `You are addressing PR review feedback for a feature implementation.

IMPORTANT: You are in WRITE mode. You CAN and SHOULD modify files to address the feedback.

## Issue Details

**Title:** ${issue.title}
**Number:** #${issue.number || 'Draft'}

${contextSection}

## Review Feedback

### Issue Comments
${issueComments || 'No issue comments'}

### PR Review Comments
${reviewComments || 'No PR review comments'}

## Your Task

1. Carefully read ALL feedback comments
2. Address each piece of feedback
3. Make the necessary code changes
4. Ensure changes don't break existing functionality

## Guidelines

- Address ALL feedback points
- Keep changes focused on the feedback
- Don't add extra features or refactoring
- Test your changes make sense in context

## Output

After making changes, provide a brief summary of:
1. What feedback was addressed
2. What changes were made
3. Any feedback that couldn't be addressed and why

Begin addressing the feedback now.`;
}
