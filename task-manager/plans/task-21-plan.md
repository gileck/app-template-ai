# Plan: Integrate Plan Subagent into Agent Workflow

## Overview

Add implementation planning capabilities to the agent workflow:
1. **Tech Design Agent**: Add high-level "Implementation Plan" section to output (all libraries)
2. **Implementor Agent**: Claude-code lib internally uses Plan subagent before implementing (encapsulated)

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Plan location | Tech design (high-level) + implementor (detailed) | Fresh codebase state at implementation time |
| Plan granularity | Per-phase for L/XL, single plan for S/M | Avoids stale plans for multi-phase features |
| Plan subagent | Claude-code implementor only | Encapsulated, other libs use high-level plan |
| New artifacts | None | Keep it simple, no new files to manage |

## Changes

### 1. Tech Design Prompt Update

**File:** `src/agents/shared/prompts.ts`

**Change:** Update `buildTechDesignPrompt()` to include Implementation Plan section in output format.

**New output section:**
```markdown
## Implementation Plan

[For multi-phase features, organize by phase]

### Phase 1: [Phase Name]
1. High-level step 1
2. High-level step 2
3. High-level step 3

### Phase 2: [Phase Name]
1. High-level step 1
2. High-level step 2

[For single-phase features, just list steps]

1. High-level step 1
2. High-level step 2
3. High-level step 3
```

**Prompt additions:**
- Instruct LLM to include "## Implementation Plan" section
- For L/XL features: organize steps by phase
- For S/M features: single numbered list
- Keep steps high-level (not line-by-line detailed)
- Each step should be actionable but not overly specific

### 2. Bug Tech Design Prompt Update

**File:** `src/agents/shared/prompts.ts`

**Change:** Update `buildBugTechDesignPrompt()` to include Implementation Plan section.

**Same pattern as feature prompt** - bugs are typically single-phase, so just a numbered list of high-level steps.

### 3. Claude-code Implementor Agent Update

**File:** `src/agents/lib/agent-libs/claude-code.ts` (or equivalent)

**Change:** Encapsulate Plan subagent call inside implementor execution.

**Pseudocode:**
```typescript
async function executeImplementation(context: ImplementationContext) {
  const { techDesign, currentPhase, phaseInfo } = context;

  // === ENCAPSULATED: Run Plan subagent for detailed planning ===
  const detailedPlan = await runPlanSubagent({
    prompt: buildPlanPrompt(techDesign, currentPhase, phaseInfo),
  });

  // === Then implement following the detailed plan ===
  const implementationPrompt = buildImplementationPrompt({
    techDesign,
    currentPhase,
    phaseInfo,
    detailedPlan,  // Include Plan subagent output
  });

  return await runImplementation(implementationPrompt);
}

function buildPlanPrompt(techDesign: string, phase: number | null, phaseInfo: PhaseInfo | null): string {
  if (phaseInfo) {
    // Multi-phase: plan for current phase only
    return `
Based on this technical design, create a detailed implementation plan for Phase ${phase}:

## Technical Design
${techDesign}

## Current Phase
Phase ${phase}/${phaseInfo.totalPhases}: ${phaseInfo.name}
${phaseInfo.description}

Files to modify:
${phaseInfo.files.map(f => `- ${f}`).join('\n')}

Create a step-by-step implementation plan with specific file paths, function names, and code changes needed.
    `;
  } else {
    // Single-phase: plan for entire feature
    return `
Based on this technical design, create a detailed implementation plan:

## Technical Design
${techDesign}

Create a step-by-step implementation plan with specific file paths, function names, and code changes needed.
    `;
  }
}
```

### 4. Other Agent Libs (No Changes)

**Files:** `src/agents/lib/agent-libs/cursor.ts`, etc.

**No changes needed** - these libs will:
- Receive tech design with high-level Implementation Plan section
- Implement based on that (no Plan subagent)

## Implementation Tasks

### Task 1: Update Tech Design Prompt
- [ ] Edit `buildTechDesignPrompt()` in `src/agents/shared/prompts.ts`
- [ ] Add "## Implementation Plan" section to required output format
- [ ] Add instructions for phase-based organization (L/XL) vs single list (S/M)
- [ ] Keep instructions for high-level steps (not overly detailed)

### Task 2: Update Bug Tech Design Prompt
- [ ] Edit `buildBugTechDesignPrompt()` in `src/agents/shared/prompts.ts`
- [ ] Add "## Implementation Plan" section to required output format
- [ ] Single numbered list (bugs are typically single-phase)

### Task 3: Update Claude-code Implementor
- [ ] Identify implementor entry point in claude-code agent lib
- [ ] Add Plan subagent call before implementation
- [ ] Pass tech design + current phase info to Plan subagent
- [ ] Include Plan subagent output in implementation prompt
- [ ] Ensure encapsulation (workflow doesn't know about 2-step process)

### Task 4: Test Changes
- [ ] Test tech design generation (verify Implementation Plan section appears)
- [ ] Test S/M feature (single plan, no phases)
- [ ] Test L/XL feature (plan organized by phase)
- [ ] Test bug fix (single plan)
- [ ] Test claude-code implementor (verify Plan subagent runs)
- [ ] Test other implementor libs (verify they still work without Plan subagent)

### Task 5: Run Validation
- [ ] Run `yarn checks` to verify no TypeScript/ESLint errors

## Example Output

### S/M Feature Tech Design (with Implementation Plan)

```markdown
# Technical Design: Add Logout Button

**Size: S** | **Complexity: Low**

## Overview
Add a logout button to the header...

## Files to Modify
- `src/client/components/Header.tsx`
- `src/client/features/auth/index.ts`

## Implementation Details
...

## Implementation Plan

1. Add logout handler function to auth feature
2. Export logout function from auth feature index
3. Import logout in Header component
4. Add Button component with logout onClick
5. Style button to match header design
6. Test logout flow manually
```

### L/XL Feature Tech Design (with Implementation Plan by Phase)

```markdown
# Technical Design: User Authentication System

**Size: L** | **Complexity: High**

## Overview
Implement full authentication system...

## Files to Modify
...

## Implementation Details
...

## Implementation Plan

### Phase 1: Database Schema
1. Create users collection with email, passwordHash, createdAt fields
2. Add unique index on email field
3. Create sessions collection with userId, token, expiresAt fields
4. Export TypeScript types for User and Session

### Phase 2: API Endpoints
1. Create auth API folder structure (types, handlers, client)
2. Implement register handler with password hashing
3. Implement login handler with session creation
4. Implement logout handler with session deletion
5. Add auth middleware for protected routes

### Phase 3: UI Components
1. Create LoginForm component with email/password fields
2. Create RegisterForm component
3. Add auth state to Zustand store
4. Create ProtectedRoute wrapper component
5. Wire up forms to auth API
```

## Rollback Plan

If issues arise:
1. Revert prompt changes (tech design will work without Implementation Plan section)
2. Remove Plan subagent call from claude-code implementor (will use high-level plan only)

Both changes are additive and backward compatible.

## Notes

- The Plan subagent in claude-code is fully encapsulated - workflow code doesn't change
- Other agent libs continue to work unchanged
- Implementation Plan section is high-level guidance, not line-by-line instructions
- Detailed planning happens at implementation time (fresh codebase state)
- Per-phase planning for L/XL ensures plans aren't stale
