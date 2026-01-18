/**
 * Prompt Templates for Agent Scripts
 *
 * Contains prompt templates for:
 * - Product Design generation
 * - Technical Design generation
 * - Implementation
 * - Feedback handling (revisions)
 */

import type { ProjectItemContent, GitHubComment } from './types';

// ============================================================
// PRODUCT DESIGN PROMPTS
// ============================================================

/**
 * Build prompt for generating a new product design
 */
export function buildProductDesignPrompt(issue: ProjectItemContent): string {
    return `You are creating a Product Design document for a GitHub issue. Your task is to:
1. Understand the feature from the issue description
2. Explore the codebase to understand existing patterns and architecture
3. Create a comprehensive Product Design document

IMPORTANT: You are in READ-ONLY mode. Do NOT make any changes to files. Only use Read, Glob, Grep, and WebFetch tools.

## Issue Details

**Title:** ${issue.title}
**Number:** #${issue.number || 'Draft'}
**Labels:** ${issue.labels?.join(', ') || 'None'}

**Description:**
${issue.body || 'No description provided'}

## Your Task

Create a Product Design document that covers:

1. **Overview** - Brief summary of what this feature does and why it's needed
2. **User Stories** - Who uses this and what they want to achieve
   - Format: "As a [user type], I want to [action] so that [benefit]"
3. **UI/UX Design** - How the feature will look and behave
   - Describe the interface elements
   - User flow and interactions
   - Consider mobile/responsive needs
4. **Edge Cases** - What happens when things go wrong?
   - Empty states
   - Error handling
   - Loading states
   - Permission/auth considerations
5. **Success Criteria** - How do we know this feature is complete?
   - Measurable outcomes
   - Acceptance criteria

## Research Strategy

Before writing the design, explore the codebase:
1. Read \`src/client/routes/index.ts\` to understand the routing structure
2. If a page is mentioned, find and read that component
3. Look at similar existing features for patterns
4. Check relevant types in \`src/apis/\` if the feature needs API work

## Output Format

Your final output MUST be a complete Product Design document in markdown format, wrapped in a \`\`\`markdown code block.

The document should be professional, clear, and actionable.

Example structure:

\`\`\`markdown
# Product Design: [Feature Title]

## Overview
[1-2 paragraph summary]

## User Stories

### Primary User
- As a user, I want to...

### Admin (if applicable)
- As an admin, I want to...

## UI/UX Design

### Layout
[Description of the interface]

### User Flow
1. User navigates to...
2. User clicks...
3. System shows...

### Mobile Considerations
[Responsive design notes]

## Edge Cases

### Empty State
[What to show when there's no data]

### Error Handling
[How to handle failures]

### Loading States
[What to show while loading]

## Success Criteria
- [ ] User can...
- [ ] System handles...
- [ ] Feature integrates with...
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
4. Ensure the revised design is complete and self-contained

## Output Format

Your final output MUST be the COMPLETE revised Product Design document in markdown format, wrapped in a \`\`\`markdown code block.

Do NOT output just the changes - output the entire revised document.

Now revise the Product Design based on the feedback.`;
}

// ============================================================
// TECHNICAL DESIGN PROMPTS
// ============================================================

/**
 * Build prompt for generating a new technical design
 */
export function buildTechDesignPrompt(issue: ProjectItemContent, productDesign: string): string {
    return `You are creating a Technical Design document for a GitHub issue. The Product Design has been approved, and now you need to define the technical implementation.

IMPORTANT: You are in READ-ONLY mode. Do NOT make any changes to files. Only use Read, Glob, Grep, and WebFetch tools.

## Issue Details

**Title:** ${issue.title}
**Number:** #${issue.number || 'Draft'}

**Original Description:**
${issue.body || 'No description provided'}

## Approved Product Design

${productDesign}

## Your Task

Create a Technical Design document that covers:

1. **Architecture Overview** - High-level approach
2. **Files to Create/Modify** - Specific files and what changes
3. **Data Model** - Database schema changes (if any)
4. **API Changes** - New endpoints or modifications
5. **State Management** - Client-side state considerations
6. **Migration/Compatibility** - Any migration needs
7. **Testing Strategy** - How to test this feature

## Research Strategy

Explore the codebase thoroughly:
1. Read existing similar features to understand patterns
2. Check \`src/apis/\` for API patterns
3. Check \`src/server/database/collections/\` for database patterns
4. Look at \`src/client/routes/\` for component patterns
5. Review hooks and stores patterns

## Output Format

Your final output MUST be a complete Technical Design document in markdown format, wrapped in a \`\`\`markdown code block.

Example structure:

\`\`\`markdown
# Technical Design: [Feature Title]

## Architecture Overview
[High-level approach and key decisions]

## Files to Create

### New Files
| File | Purpose |
|------|---------|
| \`src/apis/feature-name/...\` | API layer |
| \`src/client/routes/FeatureName/...\` | UI components |

### Files to Modify
| File | Changes |
|------|---------|
| \`src/client/routes/index.ts\` | Add new route |
| \`src/client/components/NavLinks.tsx\` | Add nav item |

## Data Model

### New Collection (if applicable)
\`\`\`typescript
interface FeatureDocument {
  _id: ObjectId;
  // fields...
}
\`\`\`

## API Endpoints

### Create Feature
- **Endpoint:** \`feature-name/create\`
- **Method:** POST
- **Auth:** Required
- **Request:** \`{ title: string, ... }\`
- **Response:** \`{ feature: Feature }\`

## State Management

### Server State (React Query)
- Query key: \`['features']\`
- Mutations with optimistic updates

### Client State (Zustand)
[If applicable]

## Implementation Order
1. Database layer
2. API layer
3. Client hooks
4. UI components
5. Navigation updates

## Testing Strategy
- Unit tests for...
- Integration tests for...
\`\`\`

Now explore the codebase and create the Technical Design document.`;
}

/**
 * Build prompt for revising technical design based on feedback
 */
export function buildTechDesignRevisionPrompt(
    issue: ProjectItemContent,
    productDesign: string,
    existingTechDesign: string,
    feedbackComments: GitHubComment[]
): string {
    const feedbackSection = feedbackComments
        .map((c) => `**${c.author}** (${c.createdAt}):\n${c.body}`)
        .join('\n\n---\n\n');

    return `You are revising a Technical Design document based on admin feedback.

IMPORTANT: You are in READ-ONLY mode. Do NOT make any changes to files. Only use Read, Glob, Grep, and WebFetch tools.

## Issue Details

**Title:** ${issue.title}
**Number:** #${issue.number || 'Draft'}

## Approved Product Design

${productDesign}

## Existing Technical Design

${existingTechDesign}

## Admin Feedback

The admin has requested changes. Please address ALL of the following feedback:

${feedbackSection}

## Your Task

1. Carefully read and understand all feedback comments
2. Research any areas mentioned in the feedback
3. Revise the Technical Design to address ALL feedback points
4. Ensure the revised design is complete and self-contained

## Output Format

Your final output MUST be the COMPLETE revised Technical Design document in markdown format, wrapped in a \`\`\`markdown code block.

Do NOT output just the changes - output the entire revised document.

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
    productDesign: string,
    techDesign: string,
    branchName: string
): string {
    return `You are implementing a feature based on approved Product and Technical Design documents.

IMPORTANT: You are in WRITE mode. You CAN and SHOULD create and modify files to implement this feature.

## Issue Details

**Title:** ${issue.title}
**Number:** #${issue.number || 'Draft'}
**Branch:** ${branchName}

**Original Description:**
${issue.body || 'No description provided'}

## Approved Product Design

${productDesign}

## Approved Technical Design

${techDesign}

## Your Task

Implement the feature as specified in the Technical Design document:

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
    productDesign: string,
    techDesign: string,
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

    return `You are addressing PR review feedback for a feature implementation.

IMPORTANT: You are in WRITE mode. You CAN and SHOULD modify files to address the feedback.

## Issue Details

**Title:** ${issue.title}
**Number:** #${issue.number || 'Draft'}

## Context

### Product Design
${productDesign}

### Technical Design
${techDesign}

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
